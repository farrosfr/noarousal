const site = "https://noa.farros.co";

export function GET() {
  return new Response(`User-agent: *
Allow: /
Disallow: /data/

Sitemap: ${site}/sitemap.xml
`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
