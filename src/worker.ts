import createDebug from 'debug';
import * as moment from 'moment';
import { readAsync, writeAsync } from 'fs-jetpack';
import * as kebabCase from 'lodash/kebabCase';
import * as appInsights from 'applicationinsights';
import * as lighthouse from 'lighthouse';
import * as minimist from 'minimist';
import * as Url from 'url';

const debug = createDebug('sitemap-insights-worker');
createDebug.enable('sitemap-insights-worker');

const argv = minimist(process.argv.slice(2));
var url = argv.url;
const port = argv.port;
const configPath = argv["config-path"];

if (!url) {
    console.error('Please specify the --url option to specify the url to analyze.');
    process.exit(1);
}

if (!port) {
    console.error('Please specify the --port option to specify the ws port to use.');
    process.exit(1);
}

const uri = Url.parse(url);

appInsights.setup().start();
// Uncomment this to put Application Insights into test mode.
// appInsights.defaultClient.config.disableAppInsights = true;

(async () => {

    let config = null;
    if (configPath) {
        const configData = await readAsync(configPath);
        config = JSON.parse(configData);
    }

    const startTime = moment();
    try {
        const results = await lighthouse(url, { port }, config);
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
            name: "Lighthouse",
            data: `GET ${uri.pathname}`,
            duration: endTime.diff(startTime),
            resultCode: 200,
            success: true,
            dependencyTypeName: "HTTP",
            properties
        });

        await writeAsync(`./output/${kebabCase(url.replace('https://', ''))}.json`, results.lhr);
    } catch (err) {
        debug(`An error occurred while analyzing ${url}: ${err.message}`);
        const endTime = moment();

        appInsights.defaultClient.trackDependency({
            target: uri.host,
            name: "Lighthouse",
            data: `GET ${uri.pathname}`,
            duration: endTime.diff(startTime),
            resultCode: 0,
            success: false,
            dependencyTypeName: "HTTP",
        });
    }
})();
