import createDebug from 'debug';
import { exec } from 'child_process';
import axios from 'axios';
import { xml2js } from 'xml-js';
import pAll from 'p-all';
import { writeAsync } from 'fs-jetpack';
import * as Url from 'url';
import * as path from 'path';
import { kebabCase, get } from 'lodash';
import * as moment from 'moment';
import * as appInsights from 'applicationinsights';
import * as minimist from 'minimist';

const debug = createDebug('sitemap-insights');
createDebug.enable('sitemap-insights');

const argv = minimist(process.argv.slice(2));
const sitemapUrl = argv.url;
const aiInstrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const maxConcurrency = argv.c || 8;
const configPath = argv["config-path"];

if (!sitemapUrl) {
    console.error('Please specify the --url option to specify the url to a sitemap');
    process.exit(1);
}

if (!aiInstrumentationKey) {
    console.error('No Application Insights Instrumentation Key found. Please set an APPINSIGHTS_INSTRUMENTATIONKEY environment variable.');
    process.exit(1);
}

if (!maxConcurrency) {
    debug('no max concurrency (--c) is specified, using 8 as default')
}

appInsights.setup().start();
// Uncomment this to put Application Insights into test mode.
// appInsights.defaultClient.config.disableAppInsights = true;

const instrumentPage = (url: string) => {
    const cmdToExecute = `lighthouse ${url}`;
    return new Promise((resolve, reject) => {
        debug(`Invoking ${cmdToExecute}`);
        const args = [
            url,
            '--quiet',
            '--output=json',
            `--output-path=stdout`,
            '--chrome-flags=--headless --window-size=800x600 --disable-gpu',
            '--emulated-form-factor=none',
            '--throttling-method=provided',
            '--disable-cpu-throttling',
            '--disable-network-throttling',
            '--max-wait-for-load=300000' // sigh.
        ]
        if (configPath) {
            args.push(`--config-path=${path.resolve(configPath)}`)
        }

        const lighthousePath = require.resolve('lighthouse/lighthouse-cli/index.js');
        const startTime = moment();
        exec(`node ${lighthousePath} ${args.join(' ')}`, async (err, stdout, stderr) => {
            const uri = Url.parse(url);
            const endTime = moment();
            if (err || stderr) {
                appInsights.defaultClient.trackDependency({
                    target: uri.host,
                    name: "Lighthouse",
                    data: `GET ${uri.pathname}`,
                    duration: endTime.diff(startTime),
                    resultCode: 0,
                    success: false,
                    dependencyTypeName: "HTTP",
                });
                reject(stderr);
            }
            
            const stats = JSON.parse(stdout);

            let properties = {};
            const audits = get(stats, 'audits');
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
                duration: endTime.diff(startTime),
                resultCode: 200,
                success: true,
                dependencyTypeName: "HTTP",
                properties
            });

            await writeAsync(`./output/${kebabCase(url.replace('https://', ''))}.json`, stdout);
            resolve();
        });
    });
};

debug(`Retrieving sitemap from ${sitemapUrl}`);
axios.get(sitemapUrl)
    .then((response) => {
        const sitemap = xml2js(response.data, { compact: true }) as Sitemap;
        debug(`${sitemap.urlset.url.length} urls found in sitemap.`)
        const actions: pAll.PromiseFactory<unknown>[] = [];
        for (const ix in sitemap.urlset.url) {
            const url = sitemap.urlset.url[ix];
            actions.push(
                () => instrumentPage(url.loc._text).catch((err) => debug(err))
            );
        }

        return pAll(actions, { concurrency: maxConcurrency });
    })
    .then(() => {
        debug("All Done!");
    })

interface Sitemap {
    urlset: {
        _attributes: any,
        url: SitemapUrl[]
    }
}

interface SitemapUrl {
    loc: {
        _text: string
    },
    lastmod: string
}