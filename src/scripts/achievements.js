const startDate = new Date(document.body.dataset.start);
const accountabilityDataElement = document.querySelector("#accountabilityData");
const accountabilityData = parseAccountabilityData(accountabilityDataElement?.textContent);
const fitnessSummaryDataElement = document.querySelector("#fitnessSummaryData");
const fitnessData = parseAccountabilityData(fitnessSummaryDataElement?.textContent);
const streakStartDate = getCurrentStreakStartDate(accountabilityData, startDate);

function parseAccountabilityData(rawData) {
  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

function getCurrentStreakStartDate(data, fallbackDate) {
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const latestRelapse = entries
    .filter((entry) => isRelapseEntry(entry))
    .map((entry) => new Date(getEntryTimestamp(entry)))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() <= Date.now())
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latestRelapse || fallbackDate;
}

function getEntryTimestamp(entry) {
  return entry?.timestamp || entry?.relapseTimestamp || entry?.date || "";
}

function isRelapseEntry(entry) {
  return entry?.type === "relapse" || entry?.result === "loss";
}

function getCompletedTrackedDays(start, now = Date.now()) {
  if (Number.isNaN(start.getTime()) || now < start.getTime()) return 0;
  return Math.floor((now - start.getTime()) / 86400000);
}

function getCompletedPeriodIndex(timestamp, start, trackedDays) {
  const entryDate = new Date(timestamp);
  if (Number.isNaN(entryDate.getTime())) return null;

  const periodIndex = Math.floor((entryDate.getTime() - start.getTime()) / 86400000);
  if (periodIndex < 0 || periodIndex >= trackedDays) return null;
  return periodIndex;
}

function unlockBadge(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("locked");
    el.classList.add("unlocked");
  }
}

function evaluateAchievements() {
  if (!accountabilityData) return;

  const entries = Array.isArray(accountabilityData.entries) ? accountabilityData.entries : [];
  const journeyStart = new Date(accountabilityData.journeyStart);

  const trackedDays = getCompletedTrackedDays(journeyStart);
  const lossPeriods = new Set(
    entries
      .filter((entry) => isRelapseEntry(entry))
      .map((entry) => getCompletedPeriodIndex(getEntryTimestamp(entry), journeyStart, trackedDays))
      .filter((periodIndex) => periodIndex !== null)
  );
  const lossDays = lossPeriods.size;
  const winDays = Math.max(0, trackedDays - lossDays);
  const winRate = trackedDays > 0 ? Math.round((winDays / trackedDays) * 100) : 100;
  const refusalCount = entries.reduce((total, entry) => {
    if (entry?.type === "refuse") return total + 1;
    return total + (Array.isArray(entry?.refusals) ? entry.refusals.length : 0);
  }, 0);
  const fitnessPushUps = fitnessData?.summary?.totalPushUps || 0;
  const fitnessRuns = fitnessData?.summary?.totalRunWalkKm || 0;

  // Current Streak Calculation
  const currentStreakMs = Date.now() - streakStartDate.getTime();
  const currentStreakDays = Math.max(0, Math.floor(currentStreakMs / 86400000));

  function getAchievementXp(currentStreakDays, refusalCount, winRate, winDays, fitnessPushUps, fitnessRuns) {
    let count = 0;
    
    // Streak Badges
    if (currentStreakDays >= 0) count++;
    if (currentStreakDays >= 3) count++;
    if (currentStreakDays >= 7) count++;
    if (currentStreakDays >= 10) count++;
    if (currentStreakDays >= 14) count++;
    if (currentStreakDays >= 21) count++;
    if (currentStreakDays >= 30) count++;
    if (currentStreakDays >= 45) count++;
    if (currentStreakDays >= 60) count++;
    if (currentStreakDays >= 90) count++;
    if (currentStreakDays >= 120) count++;
    if (currentStreakDays >= 150) count++;
    if (currentStreakDays >= 180) count++;
    if (currentStreakDays >= 200) count++;
    if (currentStreakDays >= 250) count++;
    if (currentStreakDays >= 300) count++;
    if (currentStreakDays >= 365) count++;

    // Refusal Badges
    if (refusalCount >= 1) count++;
    if (refusalCount >= 5) count++;
    if (refusalCount >= 10) count++;
    if (refusalCount >= 20) count++;
    if (refusalCount >= 30) count++;
    if (refusalCount >= 50) count++;
    if (refusalCount >= 100) count++;
    if (refusalCount >= 150) count++;
    if (refusalCount >= 250) count++;
    if (refusalCount >= 500) count++;

    // Performance Badges
    if (winRate >= 95 && winDays >= 5) count++;
    if (winRate === 100 && winDays >= 14) count++;
    if (fitnessPushUps >= 25) count++;
    if (fitnessPushUps >= 250) count++;
    if (fitnessPushUps >= 500) count++;
    if (fitnessPushUps >= 1000) count++;
    if (fitnessPushUps >= 2500) count++;
    if (fitnessPushUps >= 5000) count++;
    if (fitnessPushUps >= 10000) count++;
    if (fitnessRuns >= 10) count++;
    if (fitnessRuns >= 50) count++;
    if (fitnessRuns >= 100) count++;
    if (fitnessRuns >= 250) count++;
    if (fitnessRuns >= 500) count++;

    return count * 50;
  }

  // Level and XP
  const achievementXp = getAchievementXp(currentStreakDays, refusalCount, winRate, winDays, fitnessPushUps, fitnessRuns);
  const totalXp = (winDays * 10) + (refusalCount * 25) + (fitnessPushUps * 1) + (fitnessRuns * 10) + achievementXp;
  const level = 1 + Math.floor(totalXp / 100);

  // 1. Unlock Streak Badges
  unlockBadge("badge-first-step"); // Day 0
  if (currentStreakDays >= 3) unlockBadge("badge-consistent-shield"); // Day 3
  if (currentStreakDays >= 7) unlockBadge("badge-week-of-will"); // Day 7
  if (currentStreakDays >= 10) unlockBadge("badge-double-digits"); // Day 10
  if (currentStreakDays >= 14) unlockBadge("badge-fortress-habit"); // Day 14
  if (currentStreakDays >= 21) unlockBadge("badge-three-weeks"); // Day 21
  if (currentStreakDays >= 30) unlockBadge("badge-monthly-sovereign"); // Day 30
  if (currentStreakDays >= 45) unlockBadge("badge-vanguard-focus"); // Day 45
  if (currentStreakDays >= 60) unlockBadge("badge-habit-breaker"); // Day 60
  if (currentStreakDays >= 90) unlockBadge("badge-quarterly-sovereign"); // Day 90
  if (currentStreakDays >= 120) unlockBadge("badge-golden-shield"); // Day 120
  if (currentStreakDays >= 150) unlockBadge("badge-unshakable-mind"); // Day 150
  if (currentStreakDays >= 180) unlockBadge("badge-half-year");
  if (currentStreakDays >= 200) unlockBadge("badge-crucible");
  if (currentStreakDays >= 250) unlockBadge("badge-deep-discipline");
  if (currentStreakDays >= 300) unlockBadge("badge-anchor-dropped");
  if (currentStreakDays >= 365) unlockBadge("badge-year-one"); // Day 180

  // 2. Unlock Refusal Badges
  if (refusalCount >= 1) unlockBadge("badge-first-refusal");
  if (refusalCount >= 5) unlockBadge("badge-temptation-blocker");
  if (refusalCount >= 10) unlockBadge("badge-shadow-slayer");
  if (refusalCount >= 20) unlockBadge("badge-urge-master");
  if (refusalCount >= 30) unlockBadge("badge-perfect-defender");
  if (refusalCount >= 50) unlockBadge("badge-indomitable");
  if (refusalCount >= 100) unlockBadge("badge-shield-eternity");
  if (refusalCount >= 150) unlockBadge("badge-iron-wall");
  if (refusalCount >= 250) unlockBadge("badge-reflex-sharpened");
  if (refusalCount >= 500) unlockBadge("badge-refusal-veteran");

  // 3. Unlock Performance & Level Badges
  if (winRate >= 95 && winDays >= 5) unlockBadge("badge-flawless");
  if (winRate === 100 && winDays >= 14) unlockBadge("badge-absolute-control");
  if (level >= 5) unlockBadge("badge-sovereign-master");
  if (level >= 10) unlockBadge("badge-grand-champion");
  if (level >= 15) unlockBadge("badge-ascendant-sentinel");
  if (level >= 20) unlockBadge("badge-iron-will");
  if (level >= 25) unlockBadge("badge-elite-tier");
  if (fitnessPushUps >= 25) unlockBadge("badge-body-returns");
  if (fitnessPushUps >= 250) unlockBadge("badge-physical-resolve");
  if (fitnessPushUps >= 500) unlockBadge("badge-iron-discipline");
  if (fitnessPushUps >= 1000) unlockBadge("badge-titan-physique");
  if (fitnessPushUps >= 2500) unlockBadge("badge-resolve-unbroken");
  if (fitnessPushUps >= 5000) unlockBadge("badge-apex-body");
  if (fitnessPushUps >= 10000) unlockBadge("badge-legendary-will");

  if (fitnessRuns >= 10) unlockBadge("badge-first-mile");
  if (fitnessRuns >= 50) unlockBadge("badge-cardio-endurance");
  if (fitnessRuns >= 100) unlockBadge("badge-road-warrior");
  if (fitnessRuns >= 250) unlockBadge("badge-marathoner-mind");
  if (fitnessRuns >= 500) unlockBadge("badge-zenith-runner");
}

// Intersection Observer for scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

// Evaluate badges on load
if (!Number.isNaN(startDate.getTime())) {
  evaluateAchievements();
  // Poll every 5 seconds in case time progress triggers a new milestone
  setInterval(evaluateAchievements, 5000);
}
