import { mkdir, writeFile, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load .env configuration
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split("=");
    if (parts.length >= 2 && !line.startsWith("#")) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  });
} catch (e) {
  console.warn("Could not load .env file, relying on system env:", e.message);
}

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_REFRESH_TOKEN,
  STRAVA_START_DATE = "2026-06-06",
  STRAVA_TIMEZONE = "Asia/Jakarta",
  STRAVA_TIMEZONE_OFFSET = "+07:00",
  STRAVA_MANUAL_LOG_PATH
} = process.env;

const OUTPUT_FILE = new URL("../public/data/fitness-summary.json", import.meta.url);
const RUN_WALK_TYPES = new Set(["Run", "Walk", "Hike", "TrailRun", "VirtualRun"]);

function dateInTimezone(date = new Date(), timezone = STRAVA_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function epochAtLocalMidnight(date, offset = STRAVA_TIMEZONE_OFFSET) {
  return Math.floor(Date.parse(`${date}T00:00:00${offset}`) / 1000);
}

async function postForm(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!response.ok) throw new Error(`${url} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function getJson(url, accessToken) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`${url} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function refreshAccessToken() {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    throw new Error("Missing Strava OAuth configuration variables in .env");
  }
  return postForm("https://www.strava.com/oauth/token", {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: STRAVA_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
}

async function fetchActivities(accessToken, afterEpoch) {
  const activities = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("per_page", "200");
    url.searchParams.set("page", String(page));
    const batch = await getJson(url, accessToken);
    activities.push(...batch);
    if (batch.length < 200) break;
  }
  return activities;
}

function isRunWalk(activity) {
  return RUN_WALK_TYPES.has(activity.sport_type) || RUN_WALK_TYPES.has(activity.type);
}

async function main() {
  console.log("Syncing fitness statistics...");
  
  // 1. Fetch from Strava API
  let stravaSummary = { todayKm: 0, totalKm: 0, daily: [], activities: [] };
  try {
    const token = await refreshAccessToken();
    const today = dateInTimezone();
    const afterEpoch = epochAtLocalMidnight(STRAVA_START_DATE);
    const activities = await fetchActivities(token.access_token, afterEpoch);
    
    const runWalk = activities.filter(isRunWalk);
    const dailyMap = new Map();
    runWalk.forEach((activity) => {
      const date = dateInTimezone(new Date(activity.start_date), STRAVA_TIMEZONE);
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(activity.distance || 0));
    });
    const todayMeters = runWalk
      .filter((activity) => dateInTimezone(new Date(activity.start_date), STRAVA_TIMEZONE) === today)
      .reduce((sum, activity) => sum + Number(activity.distance || 0), 0);
    const totalMeters = runWalk.reduce((sum, activity) => sum + Number(activity.distance || 0), 0);
    
    stravaSummary = {
      todayKm: Math.round((todayMeters / 1000) * 100) / 100,
      totalKm: Math.round((totalMeters / 1000) * 100) / 100,
      daily: Array.from(dailyMap.entries()).map(([date, meters]) => ({
        date,
        runWalkKm: Math.round((meters / 1000) * 100) / 100,
      })),
      activities: runWalk.map((activity) => ({
        id: activity.id,
        name: activity.name,
        type: activity.sport_type || activity.type,
        date: dateInTimezone(new Date(activity.start_date), STRAVA_TIMEZONE),
        distanceKm: Math.round((Number(activity.distance || 0) / 1000) * 100) / 100,
      }))
    };
    console.log(`Strava successfully synced: ${stravaSummary.totalKm} Km total.`);
  } catch (e) {
    console.error("Strava Sync failed, proceeding with 0 km:", e.message);
  }

  // 2. Fetch push-ups (merge local accountability log and sibling Strava manual log)
  let pushUpsSummary = { todayCount: 0, totalCount: 0, daily: [] };
  const pushUpsByDate = new Map();

  // A. Parse local accountability.json for push-ups
  try {
    const accPath = join(dirname(fileURLToPath(import.meta.url)), "../src/data/accountability.json");
    const rawAcc = await readFile(accPath, "utf-8");
    const accData = JSON.parse(rawAcc);
    const localEntries = Array.isArray(accData?.entries) ? accData.entries : [];
    
    let localCount = 0;
    localEntries.forEach((entry) => {
      if (entry.type === "pushups" && entry.timestamp) {
        const dateStr = entry.timestamp.substring(0, 10); // YYYY-MM-DD
        if (dateStr >= STRAVA_START_DATE) {
          const reps = Number(entry.count ?? 50);
          pushUpsByDate.set(dateStr, (pushUpsByDate.get(dateStr) || 0) + reps);
          localCount += reps;
        }
      }
    });
    console.log(`Parsed local push-ups: ${localCount} reps total.`);
  } catch (e) {
    console.error("Could not parse local accountability push-ups:", e.message);
  }

  // B. Parse sibling Strava manual-log.json for push-ups
  if (STRAVA_MANUAL_LOG_PATH) {
    try {
      const rawLog = await readFile(STRAVA_MANUAL_LOG_PATH, "utf-8");
      const logData = JSON.parse(rawLog);
      const siblingEntries = Array.isArray(logData?.entries) ? logData.entries : [];
      
      let siblingCount = 0;
      siblingEntries.forEach((entry) => {
        if (entry.date >= STRAVA_START_DATE) {
          const reps = Number(entry.pushUps || 0);
          pushUpsByDate.set(entry.date, (pushUpsByDate.get(entry.date) || 0) + reps);
          siblingCount += reps;
        }
      });
      console.log(`Parsed sibling push-ups: ${siblingCount} reps total.`);
    } catch (e) {
      console.error("Push-up Sibling Log Sync failed:", e.message);
    }
  } else {
    console.warn("No STRAVA_MANUAL_LOG_PATH provided, skipping sibling push-ups sync.");
  }

  // C. Calculate summary statistics
  const todayStr = dateInTimezone();
  const totalCount = Array.from(pushUpsByDate.values()).reduce((sum, reps) => sum + reps, 0);
  const todayCount = pushUpsByDate.get(todayStr) || 0;

  pushUpsSummary = {
    todayCount,
    totalCount,
    daily: Array.from(pushUpsByDate.entries()).map(([date, pushUps]) => ({
      date,
      pushUps
    }))
  };
  console.log(`Combined Push-ups successfully synced: ${pushUpsSummary.totalCount} total.`);

  // 3. Combine summaries
  const payload = {
    updatedAt: new Date().toISOString(),
    timezone: STRAVA_TIMEZONE,
    startDate: STRAVA_START_DATE,
    summary: {
      todayRunWalkKm: stravaSummary.todayKm,
      totalRunWalkKm: stravaSummary.totalKm,
      todayPushUps: pushUpsSummary.todayCount,
      totalPushUps: pushUpsSummary.totalCount
    },
    daily: combineDaily(stravaSummary.daily, pushUpsSummary.daily),
    activities: stravaSummary.activities
  };

  await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote fitness summary to ${OUTPUT_FILE.pathname}`);
}

function combineDaily(stravaDaily, pushDaily) {
  const dates = new Set([
    ...stravaDaily.map((d) => d.date),
    ...pushDaily.map((d) => d.date)
  ]);
  return Array.from(dates)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const runData = stravaDaily.find((d) => d.date === date);
      const pushData = pushDaily.find((d) => d.date === date);
      return {
        date,
        runWalkKm: runData ? runData.runWalkKm : 0,
        pushUps: pushData ? pushData.pushUps : 0
      };
    });
}

main().catch((error) => {
  console.error("Error executing fitness sync:", error);
  process.exit(1);
});
