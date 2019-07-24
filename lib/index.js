"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const debug_1 = require("debug");
const child_process_1 = require("child_process");
const axios_1 = require("axios");
const xml_js_1 = require("xml-js");
const p_all_1 = require("p-all");
const fs_jetpack_1 = require("fs-jetpack");
const Url = require("url");
const path = require("path");
const lodash_1 = require("lodash");
const appInsights = require("applicationinsights");
const minimist = require("minimist");
const debug = debug_1.default('sitemap-insights');
debug_1.default.enable('sitemap-insights');
const argv = minimist(process.argv.slice(2));
const sitemapUrl = argv.url;
const aiInstrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const maxConcurrency = argv.c || 8;
const configPath = argv.configPath;
if (!sitemapUrl) {
    console.error('Please specify the --url option to specify the url to a sitemap');
    process.exit(1);
}
if (!aiInstrumentationKey) {
    console.error('No Application Insights Instrumentation Key found. Please set an APPINSIGHTS_INSTRUMENTATIONKEY environment variable.');
    process.exit(1);
}
if (!maxConcurrency) {
    debug('no max concurrency (--c) is specified, using 8 as default');
}
appInsights.setup().start();
const instrumentPage = (url) => {
    const cmdToExecute = `lighthouse ${url}`;
    return new Promise((resolve) => {
        debug(`Invoking ${cmdToExecute}`);
        const args = [
            url,
            '--output=json',
            `--output-path=stdout`,
            '--chrome-flags=--headless --window-size=800x600 --disable-gpu',
            '--emulated-form-factor=none',
            '--throttling-method=provided',
            '--disable-cpu-throttling',
            '--disable-network-throttling',
            '--max-wait-for-load=300000'
        ];
        if (configPath) {
            args.push(`--config-path=${path.resolve(configPath)}`);
        }
        const lighthousePath = require.resolve('lighthouse/lighthouse-cli/index.js');
        child_process_1.exec(`node ${lighthousePath} ${args.join(' ')}`, (_err, stdout, _stderr) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const uri = Url.parse(url);
            const stats = JSON.parse(stdout);
            const ttfb = lodash_1.get(stats, 'audits.time-to-first-byte.numericValue');
            let properties = {};
            const audits = lodash_1.get(stats, 'audits');
            for (const key of Object.keys(audits)) {
                const metric = audits[key];
                if (metric['numericValue']) {
                    properties[key] = metric['numericValue'];
                }
            }
            appInsights.defaultClient.trackDependency({
                target: uri.host,
                name: "Lighthouse",
                data: `GET ${uri.pathname}`,
                duration: ttfb,
                resultCode: 0,
                success: true,
                dependencyTypeName: "HTTP",
                properties
            });
            yield fs_jetpack_1.writeAsync(`./output/${lodash_1.kebabCase(url.replace('https://', ''))}.json`, stdout);
            resolve();
        }));
    });
};
debug(`Retrieving sitemap from ${sitemapUrl}`);
axios_1.default.get(sitemapUrl)
    .then((response) => {
    const sitemap = xml_js_1.xml2js(response.data, { compact: true });
    debug(`${sitemap.urlset.url.length} urls found in sitemap.`);
    const actions = [];
    for (const ix in sitemap.urlset.url) {
        const url = sitemap.urlset.url[ix];
        actions.push(() => instrumentPage(url.loc._text).catch((err) => debug(err)));
    }
    return p_all_1.default(actions, { concurrency: maxConcurrency });
})
    .then(() => {
    debug("All Done!");
});
//# sourceMappingURL=index.js.map