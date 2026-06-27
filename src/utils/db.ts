import accountabilityJson from "../data/accountability.json";

export interface AccountabilityEntry {
  type: string;
  timestamp: string;
  count?: number;
  [key: string]: any;
}

export interface AccountabilityData {
  journeyStart: string;
  timeZone: string;
  entries: AccountabilityEntry[];
}

/**
 * Fetch accountability data. If a Cloudflare D1 binding is present in the environment,
 * it queries the database dynamically. Otherwise, it falls back to static JSON.
 */
export async function getAccountabilityData(locals?: any): Promise<AccountabilityData> {
  let db: any = null;

  try {
    // Dynamically import cloudflare:workers to avoid Vite build/SSR bundling issues in Node.js
    const workers = await import("cloudflare:workers");
    db = workers.env.DB;
  } catch (e) {
    // Fall back to static JSON if we are not in the Cloudflare Pages/Worker environment
  }

  if (!db) {
    return accountabilityJson as AccountabilityData;
  }

  try {
    // 1. Fetch journey metadata settings
    const metadata = await db.prepare("SELECT * FROM journey_metadata WHERE id = 1").first<{
      journey_start: string;
      timezone: string;
    }>();

    if (!metadata) {
      return accountabilityJson as AccountabilityData;
    }

    // 2. Fetch all entries, sorted by timestamp DESC (newest entries first)
    const { results } = await db.prepare("SELECT * FROM entries ORDER BY timestamp DESC").all<{
      id: number;
      type: string;
      timestamp: string;
      count: number | null;
      meta: string | null;
    }>();

    const entries = results.map((row: any) => {
      let metaObj = {};
      if (row.meta) {
        try {
          metaObj = JSON.parse(row.meta);
        } catch (_) {}
      }

      return {
        type: row.type,
        timestamp: row.timestamp,
        ...(row.count !== null ? { count: row.count } : {}),
        ...metaObj
      };
    });

    return {
      journeyStart: metadata.journey_start,
      timeZone: metadata.timezone,
      entries
    };
  } catch (err) {
    console.error("Failed to query Cloudflare D1. Falling back to static JSON:", err);
    return accountabilityJson as AccountabilityData;
  }
}
