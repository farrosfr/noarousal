import accountabilityJson from "../data/accountability.json";
import fitnessSummaryBaseline from "../data/fitness-summary.json";

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

function dateInTimezone(date: Date = new Date(), timezone: string = "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export async function getDynamicFitnessSummary(locals?: any): Promise<any> {
  const accData = await getAccountabilityData(locals);
  
  // Start with a copy of the Strava baseline
  const summary = JSON.parse(JSON.stringify(fitnessSummaryBaseline));
  
  const pushUpsByDate = new Map<string, number>();
  const timezone = accData.timeZone || "Asia/Jakarta";
  const startDate = "2026-06-06";
  
  accData.entries.forEach((entry) => {
    if (entry.type === "pushups" && entry.timestamp) {
      const dateStr = entry.timestamp.substring(0, 10); // YYYY-MM-DD
      if (dateStr >= startDate) {
        const reps = Number(entry.count ?? 50);
        pushUpsByDate.set(dateStr, (pushUpsByDate.get(dateStr) || 0) + reps);
      }
    }
  });
  
  const todayStr = dateInTimezone(new Date(), timezone);
  const totalPushUps = Array.from(pushUpsByDate.values()).reduce((sum, reps) => sum + reps, 0);
  const todayPushUps = pushUpsByDate.get(todayStr) || 0;
  
  summary.summary.totalPushUps = totalPushUps;
  summary.summary.todayPushUps = todayPushUps;
  
  // Clear baseline pushups to recalculate from DB
  const dailyMap = new Map<string, any>();
  summary.daily.forEach((day: any) => {
    dailyMap.set(day.date, { ...day, pushUps: 0 });
  });
  
  // Merge DB pushups
  pushUpsByDate.forEach((pushUps, date) => {
    if (dailyMap.has(date)) {
      const existing = dailyMap.get(date);
      existing.pushUps = pushUps;
    } else {
      dailyMap.set(date, {
        date,
        runWalkKm: 0,
        pushUps
      });
    }
  });
  
  summary.daily = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  return summary;
}
