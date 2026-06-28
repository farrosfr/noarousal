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
    const { env } = await import("cloudflare:workers");
    db = env.DB;
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

async function syncWritingData(db: any): Promise<any> {
  const response = await fetch("https://farrosfr.com/sitemap.xml");
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status}`);
  }
  const xml = await response.text();

  const urlRegex = /<url>(.*?)<\/url>/gs;
  const locRegex = /<loc>(.*?)<\/loc>/;
  const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/;

  const startDate = "2026-06-06";
  const articles: { url: string; date: string }[] = [];

  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    const urlContent = match[1];
    const locMatch = locRegex.exec(urlContent);
    const lastmodMatch = lastmodRegex.exec(urlContent);

    if (locMatch && lastmodMatch) {
      const loc = locMatch[1];
      const lastmod = lastmodMatch[1];

      // Substack articles usually contain /p/
      if (loc.includes("/p/") && lastmod >= startDate) {
        articles.push({ url: loc, date: lastmod });
      }
    }
  }

  // Calculate totals
  const totalArticles = articles.length;
  const oneMonthAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const monthlyArticles = articles.filter(a => a.date >= oneMonthAgoStr).length;

  const payload = {
    totalArticles,
    monthlyArticles,
    articles
  };

  // Save to D1 cache
  const serialized = JSON.stringify(payload);
  await db.prepare(
    "INSERT OR REPLACE INTO fitness_cache (key, value, updated_at) VALUES ('writing_data', ?, ?)"
  ).bind(serialized, new Date().toISOString()).run();

  return payload;
}

async function syncStravaData(db: any, env: any): Promise<any> {
  const clientID = env.STRAVA_CLIENT_ID;
  const clientSecret = env.STRAVA_CLIENT_SECRET;
  const refreshToken = env.STRAVA_REFRESH_TOKEN;
  const startDate = env.STRAVA_START_DATE || "2026-06-06";
  const timezone = env.STRAVA_TIMEZONE || "Asia/Jakarta";
  const timezoneOffset = env.STRAVA_TIMEZONE_OFFSET || "+07:00";

  if (!clientID || !clientSecret || !refreshToken) {
    throw new Error("Missing Strava configuration in environment variables");
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Token refresh failed: ${tokenResponse.status}`);
  }
  const token = await tokenResponse.json() as any;

  // Calculate epoch for after query
  const afterEpoch = Math.floor(Date.parse(`${startDate}T00:00:00${timezoneOffset}`) / 1000);

  // Fetch activities
  const activities: any[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("per_page", "200");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.status}`);
    }
    const batch = await response.json() as any[];
    activities.push(...batch);
    if (batch.length < 200) break;
  }

  const RUN_WALK_TYPES = new Set(["Run", "Walk", "Hike", "TrailRun", "VirtualRun"]);
  const runWalk = activities.filter((activity: any) => 
    RUN_WALK_TYPES.has(activity.sport_type) || RUN_WALK_TYPES.has(activity.type)
  );

  const formatDate = (date: Date, tz: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
  };

  const today = formatDate(new Date(), timezone);
  const dailyMap = new Map<string, number>();

  runWalk.forEach((activity: any) => {
    const date = formatDate(new Date(activity.start_date), timezone);
    dailyMap.set(date, (dailyMap.get(date) || 0) + Number(activity.distance || 0));
  });

  const todayMeters = runWalk
    .filter((activity: any) => formatDate(new Date(activity.start_date), timezone) === today)
    .reduce((sum: number, activity: any) => sum + Number(activity.distance || 0), 0);
  const totalMeters = runWalk.reduce((sum: number, activity: any) => sum + Number(activity.distance || 0), 0);

  const stravaSummary = {
    todayKm: Math.round((todayMeters / 1000) * 100) / 100,
    totalKm: Math.round((totalMeters / 1000) * 100) / 100,
    daily: Array.from(dailyMap.entries()).map(([date, meters]) => ({
      date,
      runWalkKm: Math.round((meters / 1000) * 100) / 100,
    })),
    activities: runWalk.map((activity: any) => ({
      id: activity.id,
      name: activity.name,
      type: activity.sport_type || activity.type,
      date: formatDate(new Date(activity.start_date), timezone),
      distanceKm: Math.round((Number(activity.distance || 0) / 1000) * 100) / 100,
    }))
  };

  // Save to cache
  const serialized = JSON.stringify(stravaSummary);
  await db.prepare(
    "INSERT OR REPLACE INTO fitness_cache (key, value, updated_at) VALUES ('strava_data', ?, ?)"
  ).bind(serialized, new Date().toISOString()).run();

  return stravaSummary;
}

export async function getDynamicFitnessSummary(locals?: any): Promise<any> {
  const accData = await getAccountabilityData(locals);
  
  let db: any = null;
  let env: any = {};
  try {
    const cf = await import("cloudflare:workers");
    db = cf.env.DB;
    env = cf.env;
  } catch (e) {
    env = process.env;
  }

  // Start with a copy of the Strava baseline
  let stravaData = { 
    todayKm: fitnessSummaryBaseline.summary.todayRunWalkKm, 
    totalKm: fitnessSummaryBaseline.summary.totalRunWalkKm, 
    daily: fitnessSummaryBaseline.daily, 
    activities: fitnessSummaryBaseline.activities 
  };

  let writingData = { totalArticles: 0, monthlyArticles: 0, articles: [] };

  if (db) {
    try {
      // Check cache first for Strava
      const cached = await db.prepare("SELECT * FROM fitness_cache WHERE key = 'strava_data'").first<{
        value: string;
        updated_at: string;
      }>();

      let isExpired = true;
      if (cached) {
        const ageMs = Date.now() - new Date(cached.updated_at).getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        if (ageMs < thirtyMinutes) {
          isExpired = false;
        }
        try {
          stravaData = JSON.parse(cached.value);
        } catch (_) {}
      }

      if (isExpired) {
        // Expired or missing -> refresh from Strava API
        try {
          const freshData = await syncStravaData(db, env);
          stravaData = freshData;
        } catch (syncErr) {
          console.error("Failed to fetch fresh Strava data, using cache if available:", syncErr);
          // If sync failed but we have a cache (even if expired), keep using it!
          if (cached) {
            try {
              stravaData = JSON.parse(cached.value);
            } catch (_) {}
          }
        }
      }

      // Check cache first for Substack writing
      const cachedWriting = await db.prepare("SELECT * FROM fitness_cache WHERE key = 'writing_data'").first<{
        value: string;
        updated_at: string;
      }>();

      let isWritingExpired = true;
      if (cachedWriting) {
        const ageMs = Date.now() - new Date(cachedWriting.updated_at).getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        if (ageMs < thirtyMinutes) {
          isWritingExpired = false;
        }
        try {
          writingData = JSON.parse(cachedWriting.value);
        } catch (_) {}
      }

      if (isWritingExpired) {
        try {
          const freshWriting = await syncWritingData(db);
          writingData = freshWriting;
        } catch (syncErr) {
          console.error("Failed to fetch fresh writing data, using cache if available:", syncErr);
          if (cachedWriting) {
            try {
              writingData = JSON.parse(cachedWriting.value);
            } catch (_) {}
          }
        }
      }
    } catch (dbErr) {
      console.error("Database cache query failed, using static baseline:", dbErr);
    }
  }

  // Initialize summary payload
  const summary = {
    updatedAt: new Date().toISOString(),
    timezone: env.STRAVA_TIMEZONE || "Asia/Jakarta",
    startDate: "2026-06-06",
    summary: {
      todayRunWalkKm: stravaData.todayKm,
      totalRunWalkKm: stravaData.totalKm,
      todayPushUps: 0,
      totalPushUps: 0,
      totalArticles: writingData.totalArticles,
      monthlyArticles: writingData.monthlyArticles
    },
    daily: stravaData.daily.map((d: any) => ({
      date: d.date,
      runWalkKm: d.runWalkKm || 0,
      pushUps: 0
    })),
    activities: stravaData.activities || [],
    writingArticles: writingData.articles
  };

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
  
  // Merge DB pushups
  const dailyMap = new Map<string, any>();
  summary.daily.forEach((day: any) => {
    dailyMap.set(day.date, { ...day, pushUps: 0 });
  });
  
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
