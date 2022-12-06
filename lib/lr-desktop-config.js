"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants = require("./lh-consts");
const config = {
    extends: 'lighthouse:default',
    settings: {
        maxWaitForFcp: 15 * 1000,
        maxWaitForLoad: 35 * 1000,
        formFactor: 'desktop',
        throttling: constants.throttling.desktopDense4G,
        screenEmulation: constants.screenEmulationMetrics.desktop,
        emulatedUserAgent: constants.userAgents.desktop,
        skipAudits: ['uses-http2'],
    },
};
exports.default = config;
//# sourceMappingURL=lr-desktop-config.js.map