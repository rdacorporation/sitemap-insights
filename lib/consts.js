'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Consts = {
  AzureStorageOutputPath: 'azure-storage',
};
exports.DefaultDesktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForLoad: 5 * 60 * 1000,
    emulatedFormFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
    skipAudits: ['uses-http2'],
  },
  audits: [
    { path: 'metrics/first-contentful-paint', options: { scorePODR: 800, scoreMedian: 1600 } },
    { path: 'metrics/first-meaningful-paint', options: { scorePODR: 800, scoreMedian: 1600 } },
    { path: 'metrics/speed-index', options: { scorePODR: 1100, scoreMedian: 2300 } },
    { path: 'metrics/interactive', options: { scorePODR: 2000, scoreMedian: 4500 } },
    { path: 'metrics/first-cpu-idle', options: { scorePODR: 2000, scoreMedian: 4500 } },
  ],
};
//# sourceMappingURL=consts.js.map
