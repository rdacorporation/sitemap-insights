#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const debug_1 = require('debug');
const puppeteer_cluster_1 = require('puppeteer-cluster');
const fs_jetpack_1 = require('fs-jetpack');
const kebabCase = require('lodash/kebabCase');
const execa = require('execa');
const axios_1 = require('axios');
const xml_js_1 = require('xml-js');
const path = require('path');
const Url = require('url');
const appInsights = require('applicationinsights');
const minimist = require('minimist');
const debug = debug_1.default('sitemap-insights');
debug_1.default.enable('sitemap-insights');
const argv = minimist(process.argv.slice(2));
const sitemapUrl = argv.url;
const aiInstrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const maxConcurrency = argv.c || 1;
const configPath = argv['config-path'];
const resume = !!argv.resume;
if (!sitemapUrl) {
  console.error('Please specify the --url option to specify the url to a sitemap');
  process.exit(1);
}
if (!aiInstrumentationKey) {
  console.error(
    'No Application Insights Instrumentation Key found. Please set an APPINSIGHTS_INSTRUMENTATIONKEY environment variable.',
  );
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
if (configPath) {
  debug(`Using configuration at ${configPath}`);
}
if (resume) {
  debug(`Resuming...`);
}
appInsights.setup().start();
const lighthouseTask = props =>
  tslib_1.__awaiter(this, void 0, void 0, function*() {
    const { page, data } = props;
    const browser = page.browser();
    const port = Url.parse(browser.wsEndpoint()).port;
    const args = [`--url=${data.url}`, `--port=${port}`, `--output-path=${data.outputPath}`];
    if (configPath) {
      args.push(`--config-path=${configPath}`);
    }
    try {
      const worker = execa.node('./lib/worker.js', args, {
        timeout: 6 * 60 * 1000,
      });
      worker.stdout.pipe(process.stdout);
      worker.stderr.pipe(process.stderr);
      yield worker;
    } catch (err) {
      appInsights.defaultClient.trackException({
        exception: err,
        properties: {
          url: data.url,
          outputPath: data.outputPath,
        },
      });
    }
  });
(() =>
  tslib_1.__awaiter(this, void 0, void 0, function*() {
    debug(`Initializing Cluster...`);
    const cluster = yield puppeteer_cluster_1.Cluster.launch({
      concurrency: puppeteer_cluster_1.Cluster.CONCURRENCY_BROWSER,
      puppeteerOptions: {
        args: ['--window-size=800x600', '--disable-gpu'],
      },
      monitor: true,
      workerCreationDelay: 500,
      retryLimit: 5,
      timeout: 5 * 60 * 1000,
      maxConcurrency,
    });
    debug(`Retrieving sitemap from ${sitemapUrl}`);
    try {
      const response = yield axios_1.default.get(sitemapUrl);
      yield cluster.task(lighthouseTask);
      const sitemap = xml_js_1.xml2js(response.data, { compact: true });
      debug(`${sitemap.urlset.url.length} urls found in sitemap.`);
      let queuedUrls = 0;
      for (const sitemapUrl of sitemap.urlset.url) {
        const url = sitemapUrl.loc._text;
        const outputPath = path.resolve(`./output/${kebabCase(url.replace(/^http(s)?:\/\//, ''))}.json`);
        if (resume && !fs_jetpack_1.exists(outputPath)) {
          cluster.queue({
            url,
            outputPath,
          });
          queuedUrls++;
        }
      }
      debug(`${queuedUrls} urls added to the queue.`);
    } catch (err) {
      debug(`Unable to process stiemap at ${sitemapUrl}: ${err.message}`);
      process.exit(1);
    }
    yield cluster.idle();
    yield cluster.close();
    debug('All Done!');
  }))();
//# sourceMappingURL=index.js.map
