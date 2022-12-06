"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonSimulatedPassConfigOverrides = exports.defaultNavigationConfig = exports.defaultPassConfig = exports.defaultSettings = exports.userAgents = exports.screenEmulationMetrics = exports.throttling = void 0;
const DEVTOOLS_RTT_ADJUSTMENT_FACTOR = 3.75;
const DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR = 0.9;
const throttling = {
    DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
    DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    mobileSlow4G: {
        rttMs: 150,
        throughputKbps: 1.6 * 1024,
        requestLatencyMs: 150 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
        downloadThroughputKbps: 1.6 * 1024 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
        uploadThroughputKbps: 750 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
        cpuSlowdownMultiplier: 4,
    },
    mobileRegular3G: {
        rttMs: 300,
        throughputKbps: 700,
        requestLatencyMs: 300 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
        downloadThroughputKbps: 700 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
        uploadThroughputKbps: 700 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
        cpuSlowdownMultiplier: 4,
    },
    desktopDense4G: {
        rttMs: 40,
        throughputKbps: 10 * 1024,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
    },
};
exports.throttling = throttling;
const MOTOG4_EMULATION_METRICS = {
    mobile: true,
    width: 360,
    height: 640,
    deviceScaleFactor: 2.625,
    disabled: false,
};
const DESKTOP_EMULATION_METRICS = {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
};
const screenEmulationMetrics = {
    mobile: MOTOG4_EMULATION_METRICS,
    desktop: DESKTOP_EMULATION_METRICS,
};
exports.screenEmulationMetrics = screenEmulationMetrics;
const MOTOG4_USERAGENT = 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4695.0 Mobile Safari/537.36 Chrome-Lighthouse';
const DESKTOP_USERAGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4695.0 Safari/537.36 Chrome-Lighthouse';
const userAgents = {
    mobile: MOTOG4_USERAGENT,
    desktop: DESKTOP_USERAGENT,
};
exports.userAgents = userAgents;
const defaultSettings = {
    output: 'json',
    maxWaitForFcp: 30 * 1000,
    maxWaitForLoad: 45 * 1000,
    pauseAfterFcpMs: 1000,
    pauseAfterLoadMs: 1000,
    networkQuietThresholdMs: 1000,
    cpuQuietThresholdMs: 1000,
    formFactor: 'mobile',
    throttling: throttling.mobileSlow4G,
    throttlingMethod: 'simulate',
    screenEmulation: screenEmulationMetrics.mobile,
    emulatedUserAgent: userAgents.mobile,
    auditMode: false,
    gatherMode: false,
    disableStorageReset: false,
    debugNavigation: false,
    channel: 'node',
    skipAboutBlank: false,
    blankPage: 'about:blank',
    budgets: null,
    locale: 'en-US',
    blockedUrlPatterns: null,
    additionalTraceCategories: null,
    extraHeaders: null,
    precomputedLanternData: null,
    onlyAudits: null,
    onlyCategories: null,
    skipAudits: null,
};
exports.defaultSettings = defaultSettings;
const defaultPassConfig = {
    passName: 'defaultPass',
    loadFailureMode: 'fatal',
    recordTrace: false,
    useThrottling: false,
    pauseAfterFcpMs: 0,
    pauseAfterLoadMs: 0,
    networkQuietThresholdMs: 0,
    cpuQuietThresholdMs: 0,
    blockedUrlPatterns: [],
    blankPage: 'about:blank',
    gatherers: [],
};
exports.defaultPassConfig = defaultPassConfig;
const defaultNavigationConfig = {
    id: 'default',
    loadFailureMode: 'fatal',
    disableThrottling: false,
    disableStorageReset: false,
    pauseAfterFcpMs: 0,
    pauseAfterLoadMs: 0,
    networkQuietThresholdMs: 0,
    cpuQuietThresholdMs: 0,
    blockedUrlPatterns: [],
    blankPage: 'about:blank',
    artifacts: [],
};
exports.defaultNavigationConfig = defaultNavigationConfig;
const nonSimulatedPassConfigOverrides = {
    pauseAfterFcpMs: 5250,
    pauseAfterLoadMs: 5250,
    networkQuietThresholdMs: 5250,
    cpuQuietThresholdMs: 5250,
};
exports.nonSimulatedPassConfigOverrides = nonSimulatedPassConfigOverrides;
//# sourceMappingURL=constants.js.map