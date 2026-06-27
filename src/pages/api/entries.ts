import type { APIRoute } from "astro";
import { getAccountabilityData } from "../../utils/db";

export const prerender = false; // Always dynamic API endpoint

// Public GET endpoint to fetch entries (from D1 or fallback JSON)
export const GET: APIRoute = async ({ locals }) => {
  try {
    const data = await getAccountabilityData(locals);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch entries" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  let db: any = null;
  let adminApiKey: string | null = null;

  try {
    const { env } = await import("cloudflare:workers");
    db = env.DB;
    adminApiKey = env.ADMIN_API_KEY as string;
  } catch (_) {}

  if (!db) {
    return new Response(JSON.stringify({ error: "Database binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 1. Authenticate using ADMIN_API_KEY
  const requestApiKey = request.headers.get("x-admin-api-key");
  if (!adminApiKey || requestApiKey !== adminApiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { type, timestamp, count, ...metaFields } = body;

    if (!type || !timestamp) {
      return new Response(JSON.stringify({ error: "Missing type or timestamp" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const countVal = count !== undefined && count !== null ? Number(count) : null;
    const meta = Object.keys(metaFields).length > 0 ? JSON.stringify(metaFields) : null;

    // 2. Insert the new log entry
    await db
      .prepare("INSERT INTO entries (type, timestamp, count, meta) VALUES (?, ?, ?, ?)")
      .bind(type, timestamp, countVal, meta)
      .run();

    return new Response(JSON.stringify({ success: true, message: "Entry logged successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("API error adding entry:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to log entry" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
