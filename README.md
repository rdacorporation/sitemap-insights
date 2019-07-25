sitemap-insights
---

A command-line tool that retrieves a sitemap.xml from a site and audits every page contained within Lighthouse+Headless Chrome. The page metrics are then reported to Application Insights for analysis.

Features:
  * Uses pool of chromium instances to minimize chrome process startup overhead
  * Supports concurrent lighthouse processing in isolated processes (on suitably beefy hardware)
  * Auto-retry of failed urls
  * Auto-timeout of audit sessions, both from the chrome process and lighthouse worker perspectives
  * Stores lighthouse reports of all runs in ./output/* - can drag reports on to https://googlechrome.github.io/lighthouse/viewer/ to see the visual report
  * Provides visual monitoring progress

Example - Audit all links at a url with a maximum of 8 simultaneous chrome processes:
```
yarn start --url https://new.site.com/sitemap.xml -c 8
```

Example - Use a config file to specify the lighthouse configuration

```
yarn start --url https://new.site.com/sitemap.xml -c 8 -config-path ./lighthouse.config.json
```

An ```APPINSIGHTS_INSTRUMENTATIONKEY``` environment variable needs to be set with the instrumentation key of the intended AI instance.

> Note: When specifying the concurrency option, carefully monitor CPU/Memory/Network of the host. It's very easy to overload a host, thus skewing the results.