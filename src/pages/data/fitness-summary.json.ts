import type { APIRoute } from "astro";
import { getDynamicFitnessSummary } from "../../utils/db";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const summary = await getDynamicFitnessSummary(locals);
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    });
  } catch (err: any) {
    console.error("Failed to build dynamic fitness summary:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
