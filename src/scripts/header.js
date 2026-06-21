const siteHeader = document.querySelector("[data-site-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const primaryNav = document.querySelector("#primaryNav");
const hudLevel = document.querySelector("[data-hud-level-value]");
const hudXp = document.querySelector("[data-hud-xp-value]");
const hudDay = document.querySelector("[data-hud-day-value]");
const hudShield = document.querySelector("[data-hud-shield-value]");

if (siteHeader) {
  initHud();
  initMenu();
  initScrollHide();
}

function parseAccountabilityData(rawData) {
  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

function getEntryTimestamp(entry) {
  return entry?.timestamp || entry?.relapseTimestamp || entry?.date || "";
}

function isRelapseEntry(entry) {
  return entry?.type === "relapse" || entry?.result === "loss";
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

function getCompletedTrackedDays(start, now = Date.now()) {
  if (Number.isNaN(start.getTime()) || now < start.getTime()) return 0;
  return Math.floor((now - start.getTime()) / 86400000);
}

async function initHud() {
  if (!hudLevel || !hudXp || !hudDay || !hudShield) return;

  const startDateAttr = document.body.dataset.start;
  if (!startDateAttr) return;
  const journeyStart = new Date(startDateAttr);
  if (Number.isNaN(journeyStart.getTime())) return;

  const dataEl = document.querySelector("#accountabilityData");
  const data = parseAccountabilityData(dataEl?.textContent);
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const streakStart = getCurrentStreakStartDate(data, journeyStart);

  const update = async () => {
    const trackedDays = getCompletedTrackedDays(journeyStart);
    const lossPeriods = new Set();
    for (const entry of entries) {
      if (!isRelapseEntry(entry)) continue;
      const ts = new Date(getEntryTimestamp(entry));
      if (Number.isNaN(ts.getTime())) continue;
      const idx = Math.floor((ts.getTime() - journeyStart.getTime()) / 86400000);
      if (idx >= 0 && idx < trackedDays) lossPeriods.add(idx);
    }
    const winDays = Math.max(0, trackedDays - lossPeriods.size);
    const refusalCount = entries.reduce((total, entry) => {
      if (entry?.type === "refuse") return total + 1;
      return total + (Array.isArray(entry?.refusals) ? entry.refusals.length : 0);
    }, 0);

    let fitnessPushUps = 0;
    let fitnessRunWalkKm = 0;
    try {
      const res = await fetch("/data/fitness-summary.json");
      if (res.ok) {
        const data = await res.json();
        fitnessPushUps = data?.summary?.totalPushUps || 0;
        fitnessRunWalkKm = data?.summary?.totalRunWalkKm || 0;
      }
    } catch (_) { /* fitness data optional */ }

    const winRate = trackedDays > 0 ? Math.round((winDays / trackedDays) * 100) : 100;
    const streakMs = Date.now() - streakStart.getTime();
    const streakDays = Math.max(0, Math.floor(streakMs / 86400000));

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

    const achievementXp = getAchievementXp(streakDays, refusalCount, winRate, winDays, fitnessPushUps, fitnessRunWalkKm);
    const totalXp = winDays * 10 + refusalCount * 25 + fitnessPushUps * 1 + fitnessRunWalkKm * 10 + achievementXp;
    const level = 1 + Math.floor(totalXp / 100);
    const xpInLevel = Math.round(totalXp % 100);

    const shield = Math.min(100, streakDays * 20);

    hudLevel.textContent = String(level);
    hudXp.textContent = String(xpInLevel);
    hudDay.textContent = String(streakDays);
    hudShield.textContent = String(shield);
  };

  update();
  setInterval(update, 1000);
}

function initMenu() {
  if (!menuToggle) return;
  const setOpen = (isOpen) => {
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    if (isOpen) document.body.classList.remove("header-hidden");
  };

  menuToggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("menu-open"));
  });

  primaryNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      setOpen(false);
      menuToggle.focus();
    }
  });
}

function initScrollHide() {
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < 8) {
      ticking = false;
      return;
    }
    if (delta > 0 && y > 80 && !document.body.classList.contains("menu-open")) {
      document.body.classList.add("header-hidden");
    } else {
      document.body.classList.remove("header-hidden");
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}
