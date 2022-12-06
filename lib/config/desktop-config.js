"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants = require("./constants.js");
const config = {
    extends: 'lighthouse:default',
    settings: {
        formFactor: 'desktop',
        throttling: constants.throttling.desktopDense4G,
        screenEmulation: constants.screenEmulationMetrics.desktop,
        emulatedUserAgent: constants.userAgents.desktop,
    },
};
exports.default = config;
//# sourceMappingURL=desktop-config.js.map