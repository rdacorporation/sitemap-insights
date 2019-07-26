// TS Interface decls

export interface Sitemap {
  urlset: {
    _attributes: any;
    url: SitemapUrl[];
  };
}

export interface SitemapUrl {
  loc: {
    _text: string;
  };
  lastmod: string;
}

export interface LighthouseJobData {
  url: string;
  outputPath: string;
}
