#!/usr/bin/env node

import createDebug from 'debug';
import { Cluster } from 'puppeteer-cluster';
import { exists } from 'fs-jetpack';
import * as kebabCase from 'lodash/kebabCase';
import * as execa from 'execa';
import axios from 'axios';
import { xml2js } from 'xml-js';
import * as path from 'path';
import * as Url from 'url';
import * as appInsights from 'applicationinsights';

import * as minimist from 'minimist';
import { TaskFunction } from 'puppeteer-cluster/dist/Cluster';

import { Consts } from './consts';
import { LighthouseJobData, Sitemap } from './types';

const debug = createDebug('sitemap-insights');
createDebug.enable('sitemap-insights');

// Setup defaults
const argv = minimist(process.argv.slice(2));
const sitemapUrl = argv.url;
const APPINSIGHTS_INSTRUMENTATIONKEY = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_ACCESS_KEY = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;
const maxConcurrency = argv.c || 1;
const iterations = argv.i || 1;
const configPath = argv['config-path'];
let outputPath: string = argv['output-path'] || './output/';
const containerName: string = argv['container-name'];
const resume = !!argv.resume;

if (!sitemapUrl) {
  console.error('Please specify the --url option to specify the url to a sitemap');
  process.exit(1);
}

if (!APPINSIGHTS_INSTRUMENTATIONKEY) {
  console.error(
    'No Application Insights Instrumentation Key found. Please set an APPINSIGHTS_INSTRUMENTATIONKEY environment variable.',
  );
  process.exit(1);
}

if (!outputPath) {
  console.error('Please specify the --output-path option to specify the file path to output the results.');
  process.exit(1);
}

if (!argv.c) {
  debug(`no max concurrency (--c) is specified, using ${maxConcurrency} as default`);
}

if (maxConcurrency > 1) {
  debug(
    `Note: When specifying the concurrency option, carefully monitor CPU/Memory/Network of the host. It's very easy to overload a host, thus skewing the results.`,
  );
}

if (iterations > 1) {
  debug(`Performing ${iterations} iterations.`);
}

if (configPath) {
  debug(`Using configuration at ${configPath}`);
}

if (resume) {
  debug(`Resuming...`);
}

switch (outputPath.toLowerCase()) {
  case Consts.AzureStorageOutputPath:
    if (!STORAGE_ACCOUNT_NAME) {
      console.error(
        'When using the azure-storage output-path option, Please set an AZURE_STORAGE_ACCOUNT_NAME environment variable.',
      );
      process.exit(1);
    }

    if (!ACCOUNT_ACCESS_KEY) {
      console.error(
        'When using the azure-storage output-path option, Please set an AZURE_STORAGE_ACCOUNT_ACCESS_KEY environment variable.',
      );
      process.exit(1);
    }

    if (!containerName) {
      console.error(
        'When using the azure-storage output-path option, Please specify the --container-name option to specify the Azure Storage container name to use.',
      );
      process.exit(1);
    }
    break;
  default:
    if (!outputPath.endsWith('/')) {
      outputPath += '/';
    }
    break;
}

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

// Task that is invoked once per url.
const lighthouseTask: TaskFunction<LighthouseJobData, void> = async props => {
  const { page, data } = props;
  const browser = page.browser();
  const port = Url.parse(browser.wsEndpoint()).port;

  const args = [`--url=${data.url}`, `--port=${port}`, `--output-path=${data.outputPath}`];

  if (configPath) {
    args.push(`--config-path=${configPath}`);
  }

  if (containerName) {
    args.push(`--container-name=${containerName}`);
  }

  // Spawn a worker process
  try {
    const worker = execa.node('./lib/worker.js', args, {
      timeout: 6 * 60 * 1000,
    });
    worker.stdout.pipe(process.stdout);
    worker.stderr.pipe(process.stderr);
    await worker;
  } catch (err) {
    // If something went wrong, track the exception.
    appInsights.defaultClient.trackException({
      exception: err,
      properties: {
        url: data.url,
        outputPath: data.outputPath,
      },
    });
  }
};

// Bootstrap the app

(async () => {
  debug(`Initializing Cluster...`);

  const cluster: Cluster<LighthouseJobData, void> = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER, // Important, when using Lighthouse we want browser isolation.
    puppeteerOptions: {
      args: ['--window-size=800x600', '--disable-gpu'],
    },
    monitor: true,
    workerCreationDelay: 500,
    retryLimit: 5,
    timeout: 5 * 60 * 1000, // wait for up to 5 minutes.
    maxConcurrency,
    skipDuplicateUrls: false,
    retryDelay: 1000,
  });

  debug(`Retrieving sitemap from ${sitemapUrl}`);

  try {
    const response = await axios.get(sitemapUrl);

    await cluster.task(lighthouseTask);

    const sitemap = xml2js(response.data, { compact: true }) as Sitemap;
    debug(`${sitemap.urlset.url.length} urls found in sitemap.`);

    let queuedUrls = 0;
    for (let i = 0; i < iterations; i++) {
      debug(i);
      for (const sitemapUrl of sitemap.urlset.url) {
        const url = sitemapUrl.loc._text;
        let resolvedOutputPath = outputPath;
        switch (outputPath.toLowerCase()) {
          case Consts.AzureStorageOutputPath:
            // Do Nothing
            break;
          default:
            resolvedOutputPath = path.resolve(`${outputPath}${kebabCase(url.replace(/^http(s)?:\/\//, ''))}.json`);
            break;
        }

        if (!resume || (resume && !exists(resolvedOutputPath))) {
          cluster.queue({
            url,
            outputPath: resolvedOutputPath,
          });
          queuedUrls++;
        }
      }
    }

    debug(`${queuedUrls} urls added to the queue.`);
  } catch (err) {
    debug(`Unable to process sitemap at ${sitemapUrl}: ${err.message}`);
    process.exit(1);
  }

  await cluster.idle();
  await cluster.close();
  debug('All Done!');
})();
