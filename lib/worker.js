"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const minimist = require("minimist");
const argv = minimist(process.argv.slice(2));
const pageUrl = argv.url;
if (!pageUrl) {
    console.error('Please specify the --url option to specify the url to a page');
    process.exit(1);
}
(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const browser = yield puppeteer.launch({
        headless: true,
        defaultViewport: null,
    });
    const { lhr } = yield lighthouse(pageUrl, {
        port: (new URL(browser.wsEndpoint())).port,
        output: 'json',
        logLevel: 'info',
        onlyCategories: ['timing']
    });
    yield browser.close();
    return lhr;
}))().then(lhr => console.log(lhr));
//# sourceMappingURL=worker.js.map