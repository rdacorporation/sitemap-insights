export const Consts = {
  AzureStorageOutputPath: 'azure-storage',
};

export const DefaultDesktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForFcp: 5 * 60 * 1000,
    maxWaitForLoad: 5 * 60 * 1000,
    emulatedFormFactor: 'desktop',
    throttlingMethod: 'provided',
    throttling: {
      // Using a "broadband" connection type
      // Corresponds to "Dense 4G 25th percentile" in https://docs.google.com/document/d/1-p4HSp42REEA5-jCBVB6PqQcVhI1nQIblBCNKhPJUXg/edit#heading=h.bb7nfy2x9e5v
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
    // Skip the h2 audit so it doesn't lie to us. See https://github.com/GoogleChrome/lighthouse/issues/6539
    skipAudits: ['uses-http2'],
  },
  audits: [
    // 75th and 95th percentiles -> median and PODR
    // SELECT QUANTILES(renderStart, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
    { path: 'metrics/first-contentful-paint', options: { scorePODR: 800, scoreMedian: 1600 } },
    { path: 'metrics/first-meaningful-paint', options: { scorePODR: 800, scoreMedian: 1600 } },
    // 75th and 95th percentiles -> median and PODR
    // SELECT QUANTILES(SpeedIndex, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
    { path: 'metrics/speed-index', options: { scorePODR: 1100, scoreMedian: 2300 } },
    // 75th and 95th percentiles -> median and PODR
    // SELECT QUANTILES(fullyLoaded, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
    { path: 'metrics/interactive', options: { scorePODR: 2000, scoreMedian: 4500 } },
    { path: 'metrics/first-cpu-idle', options: { scorePODR: 2000, scoreMedian: 4500 } },
  ],
};
