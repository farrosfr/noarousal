import { getCollection } from "astro:content";

const site = "https://noa.farros.co";
const siteUpdated = "2026-06-08";

const staticRoutes = [
  { path: "/", priority: "1.0" },
  { path: "/blog/", priority: "0.8" },
  { path: "/quotes/", priority: "0.7" }
];

export async function GET() {
  const posts = await getCollection("blog");
  const urls = [
    ...staticRoutes.map((route) => ({
      loc: `${site}${route.path}`,
      lastmod: siteUpdated,
      changefreq: "weekly",
      priority: route.priority
    })),
    ...posts.map((post) => ({
      loc: `${site}/blog/${post.id}/`,
      lastmod: post.data.date.toISOString().slice(0, 10),
      changefreq: "monthly",
      priority: "0.7"
    }))
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    }
  );
}
