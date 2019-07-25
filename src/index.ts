import createDebug from 'debug';
import { Cluster } from 'puppeteer-cluster';
import * as puppeteer from 'puppeteer';
import * as execa from 'execa';
import axios from 'axios';
import { xml2js } from 'xml-js';
import * as Url from 'url';
import * as appInsights from 'applicationinsights';
import * as minimist from 'minimist';
import { TaskFunction } from 'puppeteer-cluster/dist/Cluster';

const debug = createDebug('sitemap-insights');
createDebug.enable('sitemap-insights');

const argv = minimist(process.argv.slice(2));
const sitemapUrl = argv.url;
const aiInstrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const maxConcurrency = argv.c || 1;
const configPath = argv["config-path"];

if (!sitemapUrl) {
    console.error('Please specify the --url option to specify the url to a sitemap');
    process.exit(1);
}

if (!aiInstrumentationKey) {
    console.error('No Application Insights Instrumentation Key found. Please set an APPINSIGHTS_INSTRUMENTATIONKEY environment variable.');
    process.exit(1);
}

if (!argv.c) {
    debug(`no max concurrency (--c) is specified, using ${maxConcurrency} as default`)
}

if (maxConcurrency > 1) {
    debug(`Note: When specifying the concurrency option, carefully monitor CPU/Memory/Network of the host. It's very easy to overload a host, thus skewing the results.`)
}

if (configPath) {
    debug(`Using configuration at ${configPath}`);
}

appInsights.setup().start();
// Uncomment this to put Application Insights into test mode.
// appInsights.defaultClient.config.disableAppInsights = true;

// Task that is invoked once per url.
const lighthouseTask: TaskFunction<LighthouseJobData, void> = async (props) => {
    const page: puppeteer.Page = props.page;
    const browser = page.browser();
    const port = Url.parse(browser.wsEndpoint()).port;
    const url = props.data.url as string;

    const args = [
        `--url=${url}`,
        `--port=${port}`,
    ]

    if (configPath) {
        args.push(`--config-path=${configPath}`);
    }

    // Spawn a worker process
    try {
        const worker = execa.node('./lib/worker.js', args, {
            timeout: 6 * 60 * 1000
        });
        worker.stdout.pipe(process.stdout);
        worker.stderr.pipe(process.stderr);
        await worker;
    } catch (err) {
        appInsights.defaultClient.trackException({
            exception: err,
            properties: {
                url
            }
        })
    }
}

// Bootstrap the app

(async () => {
    debug(`Initializing Cluster...`);

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER, // Important, when using Lighthouse we want browser isolation.
        puppeteerOptions: {
            args: [
                "--window-size=800x600",
                "--disable-gpu"
            ]
        },
        monitor: true,
        workerCreationDelay: 500,
        retryLimit: 5,
        timeout: 5 * 60 * 1000, // wait for up to 5 minutes.
        maxConcurrency,
    });

    debug(`Retrieving sitemap from ${sitemapUrl}`);

    const response = await axios.get(sitemapUrl);

    await cluster.task(lighthouseTask);

    const sitemap = xml2js(response.data, { compact: true }) as Sitemap;
    debug(`${sitemap.urlset.url.length} urls found in sitemap.`)

    for (const url of sitemap.urlset.url) {
        cluster.queue({
            url: url.loc._text,
        });
    }

    await cluster.idle();
    await cluster.close();
    debug("All Done!");
})();

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

interface LighthouseJobData {
    url: string;
}