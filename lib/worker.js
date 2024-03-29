#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const debug_1 = require("debug");
const moment = require("moment");
const get = require("lodash/get");
const kebabCase = require("lodash/kebabCase");
const fs_jetpack_1 = require("fs-jetpack");
const appInsights = require("applicationinsights");
const storage_blob_1 = require("@azure/storage-blob");
const lighthouse = require("lighthouse");
const minimist = require("minimist");
const Url = require("url");
const consts_1 = require("./consts");
const desktop_config_1 = require("./config/desktop-config");
const debug = (0, debug_1.default)('sitemap-insights-worker');
debug_1.default.enable('sitemap-insights-worker');
const argv = minimist(process.argv.slice(2));
var url = argv.url;
const port = argv.port;
const configPath = argv['config-path'];
const outputPath = argv['output-path'];
const containerName = argv['container-name'];
const tag = argv['tag'] || '';
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
let containerClient;
switch (outputPath) {
    case consts_1.Consts.AzureStorageOutputPath:
        const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
        containerClient = new storage_blob_1.ContainerClient(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}`, sharedKeyCredential);
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
appInsights.defaultClient.config.disableAppInsights = true;
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    let config = desktop_config_1.default;
    if (configPath) {
        const configData = yield (0, fs_jetpack_1.readAsync)(configPath);
        config = JSON.parse(configData);
    }
    const startTime = moment();
    try {
        const results = yield lighthouse(url, { port }, config);
        const endTime = moment();
        let duration = endTime.diff(startTime);
        let properties = {
            tag,
        };
        let resultCode = 200;
        const audits = results.lhr['audits'];
        if (audits) {
            for (const key of Object.keys(audits)) {
                const metric = audits[key];
                if (metric['numericValue']) {
                    properties[key] = metric['numericValue'];
                }
                if (metric['score'] !== undefined && metric['score'] !== null) {
                    properties[`${key}-score`] = metric['score'];
                }
            }
            const dignosticItems = get(audits, 'diagnostics.details.items[0]');
            if (dignosticItems) {
                for (const key of Object.keys(dignosticItems)) {
                    const metric = dignosticItems[key];
                    properties[`diagnostics-${key}`] = metric;
                }
            }
            const firstNetworkRequest = get(audits, 'network-requests.details.items[0]');
            for (const key of Object.keys(firstNetworkRequest)) {
                const metric = firstNetworkRequest[key];
                properties[`network-${key}`] = metric;
            }
            if (firstNetworkRequest.statusCode != undefined && firstNetworkRequest.statusCode != null) {
                resultCode = firstNetworkRequest.statusCode;
            }
        }
        const categories = results.lhr['categories'];
        if (categories) {
            for (const key of Object.keys(categories)) {
                const metric = categories[key];
                if (metric['score'] !== undefined && metric['score'] !== null) {
                    properties[`${key}-category-score`] = metric['score'];
                }
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
            case consts_1.Consts.AzureStorageOutputPath:
                const blobName = `${startTime.format('YYYY/MM/DD/')}${kebabCase(url)}_${startTime.format('YYYY-MM-DD_HH-mm-ss')}.json`;
                const content = JSON.stringify(results.lhr);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                yield blockBlobClient.upload(content, content.length, {
                    blobHTTPHeaders: {
                        blobContentType: 'text/html',
                    },
                    metadata: {
                        tag,
                    },
                });
                break;
            default:
                yield (0, fs_jetpack_1.writeAsync)(outputPath, results.lhr);
                break;
        }
    }
    catch (err) {
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
    }
    finally {
        appInsights.defaultClient.flush();
    }
}))();
//# sourceMappingURL=worker.js.map