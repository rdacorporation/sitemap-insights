#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const debug_1 = require('debug');
const moment = require('moment');
const fs_jetpack_1 = require('fs-jetpack');
const appInsights = require('applicationinsights');
const lighthouse = require('lighthouse');
const minimist = require('minimist');
const Url = require('url');
const debug = debug_1.default('sitemap-insights-worker');
debug_1.default.enable('sitemap-insights-worker');
const argv = minimist(process.argv.slice(2));
var url = argv.url;
const port = argv.port;
const configPath = argv['config-path'];
const outputPath = argv['output-path'];
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
const uri = Url.parse(url);
appInsights.setup().start();
(() =>
  tslib_1.__awaiter(this, void 0, void 0, function*() {
    let config = null;
    if (configPath) {
      const configData = yield fs_jetpack_1.readAsync(configPath);
      config = JSON.parse(configData);
    }
    const startTime = moment();
    try {
      const results = yield lighthouse(url, { port }, config);
      const endTime = moment();
      let properties = {};
      const audits = results.lhr['audits'];
      for (const key of Object.keys(audits)) {
        const metric = audits[key];
        if (metric['numericValue']) {
          properties[key] = metric['numericValue'];
        }
      }
      appInsights.defaultClient.trackDependency({
        target: uri.host,
        name: 'Lighthouse',
        data: `GET ${uri.pathname}`,
        duration: endTime.diff(startTime),
        resultCode: 200,
        success: true,
        dependencyTypeName: 'HTTP',
        properties,
      });
      yield fs_jetpack_1.writeAsync(outputPath, results.lhr);
    } catch (err) {
      debug(`An error occurred while analyzing ${url}: ${err.message}`);
      const endTime = moment();
      appInsights.defaultClient.trackDependency({
        target: uri.host,
        name: 'Lighthouse',
        data: `GET ${uri.pathname}`,
        duration: endTime.diff(startTime),
        resultCode: 0,
        success: false,
        dependencyTypeName: 'HTTP',
      });
    }
  }))();
//# sourceMappingURL=worker.js.map
