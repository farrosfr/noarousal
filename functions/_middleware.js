/**
 * Cloudflare Pages middleware: redirect the old domain to the new one.
 * Keeps DNS + custom domain in place; visitors get a 301 to the new canonical host.
 * Paths and query strings are preserved.
 */
const REDIRECT_MAP = {
  "noa.farros.co": "https://noa.farrosfr.com",
};

export const onRequest = async (context) => {
  const request = context.request;
  const url = new URL(request.url);
  const host = (request.headers.get("host") || "").toLowerCase();

  const target = REDIRECT_MAP[host];
  if (target) {
    return Response.redirect(`${target}${url.pathname}${url.search}`, 301);
  }

  return context.next();
};
