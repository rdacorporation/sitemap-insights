#!/usr/bin/env node

import createDebug from 'debug';
import * as moment from 'moment';
import * as get from 'lodash/get';
import * as kebabCase from 'lodash/kebabCase';
import { readAsync, writeAsync } from 'fs-jetpack';
import * as appInsights from 'applicationinsights';
import { Aborter, BlockBlobURL, ContainerURL, ServiceURL, SharedKeyCredential, StorageURL } from '@azure/storage-blob';
import * as lighthouse from 'lighthouse';
import * as minimist from 'minimist';
import * as Url from 'url';

import { Consts, DefaultDesktopConfig } from './consts';

const debug = createDebug('sitemap-insights-worker');
createDebug.enable('sitemap-insights-worker');

const argv = minimist(process.argv.slice(2));
var url: string = argv.url;
const port: number = argv.port;
const configPath: string = argv['config-path'];
const outputPath: string = argv['output-path'];
const containerName: string = argv['container-name'];
const tag: string = argv['tag'] || '';
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;

if (!url) {
  console.error('Please specify the --url option to specify the url to analyze.');
  process.exit(1);
}

if (!outputPath) {
  console.error('Please specify the --output-path option to specify the file path to output the results.');
  process.exit(1);
}

if (!port) {
  console.error('Please specify the --port option to specify the ws port to use.');
  process.exit(1);
}

let containerURL: ContainerURL;
switch (outputPath) {
  case Consts.AzureStorageOutputPath:
    const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
    const pipeline = StorageURL.newPipeline(credentials);
    const serviceURL = new ServiceURL(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, pipeline);
    containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
    break;
}

const uri = Url.parse(url);

appInsights
  .setup()
  .setAutoDependencyCorrelation(false)
  .setAutoCollectRequests(false)
  .setAutoCollectPerformance(false)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(false)
  .setAutoCollectConsole(false)
  .setUseDiskRetryCaching(true)
  .start();
// Uncomment this to put Application Insights into test mode.
// appInsights.defaultClient.config.disableAppInsights = true;

(async () => {
  let config = DefaultDesktopConfig;
  if (configPath) {
    const configData = await readAsync(configPath);
    config = JSON.parse(configData);
  }

  const startTime = moment();
  try {
    const results = await lighthouse(url, { port }, config);
    const endTime = moment();
    let duration = endTime.diff(startTime);

    let properties = {
      tag,
    };
    let resultCode = 200;

    // Add data collected in the Lighthouse audit to the dependency trace submitted to Application Insights
    const audits = results.lhr['audits'];
    if (audits) {
      // For any audit that contains a 'numericValue' property, add that item.
      for (const key of Object.keys(audits)) {
        const metric = audits[key];
        if (metric['numericValue']) {
          properties[key] = metric['numericValue'];
        }
      }

      // Add the first diagnostic item.
      const dignosticItems = get(audits, 'diagnostics.details.items[0]');
      if (dignosticItems) {
        for (const key of Object.keys(dignosticItems)) {
          const metric = dignosticItems[key];
          properties[`diagnostics-${key}`] = metric;
        }
      }

      // Add the first network request
      const firstNetworkRequest = get(audits, 'network-requests.details.items[0]');
      for (const key of Object.keys(firstNetworkRequest)) {
        const metric = firstNetworkRequest[key];
        properties[`network-${key}`] = metric;
      }

      if (firstNetworkRequest.statusCode != undefined && firstNetworkRequest.statusCode != null) {
        resultCode = firstNetworkRequest.statusCode;
      }
    }

    appInsights.defaultClient.trackDependency({
      name: `GET ${uri.pathname}`,
      data: url,
      dependencyTypeName: 'HTTP',
      target: uri.hostname,
      duration,
      resultCode,
      success: resultCode >= 200 && resultCode < 300,
      time: startTime.toDate(),
      properties,
    });

    switch (outputPath.toLowerCase()) {
      case Consts.AzureStorageOutputPath:
        const blobName = `${startTime.format('YYYY/MM/DD/')}${kebabCase(url)}_${startTime.format(
          'YYYY-MM-DD_HH-mm-ss',
        )}.json`;
        const content = JSON.stringify(results.lhr);
        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, blobName);
        await blockBlobURL.upload(Aborter.none, content, content.length, {
          blobHTTPHeaders: {
            blobContentType: 'text/html',
          },
          metadata: {
            tag,
          },
        });
        break;
      default:
        await writeAsync(outputPath, results.lhr);
        break;
    }
  } catch (err) {
    debug(`An error occurred while analyzing ${url}: ${err.message}`);
    const endTime = moment();

    appInsights.defaultClient.trackException({
      exception: err,
      properties: {
        url,
        starTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        tag,
      },
    });
  } finally {
    appInsights.defaultClient.flush();
  }
})();
