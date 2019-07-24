sitemap-insights
---

A command-line tool that retrieves a sitemap.xml from a site and audits every page contained within Lighthouse+Headless Chrome. The page metrics are then reported to Application Insights for analysis.


Example - Audit all links at a url with a maximum of 8 simultaneous chrome processes:
```
yarn start --url https://new.site.com/sitemap.xml -c 8
```

Example - Use a config file to specify the lighthouse configuration

```
yarn start --url https://new.site.com/sitemap.xml -c 8 -config-path ./lighthouse.config.json
```

An ```APPINSIGHTS_INSTRUMENTATIONKEY``` environment variable needs to be set with the instrumentation key of the intended AI instance.