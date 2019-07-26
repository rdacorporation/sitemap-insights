## sitemap-insights

A command-line tool that retrieves a sitemap.xml from a site and audits every page contained within using Lighthouse+Headless Chrome. The page metrics are then reported to Application Insights for analysis.

Features:

- Uses pool of chromium instances to minimize chrome process startup overhead
- Supports concurrent lighthouse processing in isolated processes (on suitably beefy hardware)
- Auto-retry of failed urls
- Auto-timeout of audit sessions, both from the chrome process and lighthouse worker perspectives
- Stores lighthouse reports of all runs in ./output/\* - can drag reports on to https://googlechrome.github.io/lighthouse/viewer/ to see the visual report
- Provides visual monitoring progress

![screenshot](/docs/Monitoring.png)

Example - Audit all links at a url with a maximum of 8 simultaneous chrome processes:

```
yarn start --url https://new.site.com/sitemap.xml -c 8
```

Example - Specify a number of iterations to crawl each page.

```
yarn start --url https://new.site.com/sitemap.xml -c 6 -i 3
```

Example - Use a config file to specify the lighthouse configuration

```
yarn start --url https://new.site.com/sitemap.xml -c 8 --config-path ./lighthouse.config.json
```

Example - Resume processing the specified sitemap by using output report files to determine if a url should be processed

```
yarn start --url https://new.site.com/sitemap.xml -c 6 --resume
```

Example - Specify a different output path

```
yarn start --url https://new.site.com/sitemap.xml -c 6 --output-path ./reports
```

Example - Store Reports in Azure Blob Storage in a container named 'reports'

```
yarn start --url https://new.site.com/sitemap.xml -c 6 --output-path azure-storage --container-name reports
```

An `APPINSIGHTS_INSTRUMENTATIONKEY` environment variable needs to be set with the instrumentation key of the intended AI instance.

When using the `-output-path azure-storage` option, `AZURE_STORAGE_ACCOUNT_ACCESS_KEY` and `AZURE_STORAGE_ACCOUNT_NAME` environment variables need to be supplied, as well as a previously created `--container-name`

> Note: When specifying the concurrency option, carefully monitor CPU/Memory/Network of the host. It's very easy to overload a host, thus skewing the results.
