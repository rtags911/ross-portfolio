/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://your-domain.dev", // set to your domain,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ["/admin/*", "/auth/*"],
  robotsTxtPolicies: [
    {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/*", "/auth", "/auth/*"],
    },
  ],
};
