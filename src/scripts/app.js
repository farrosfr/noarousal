const OLD_PRIVATE_STORAGE_KEY = "noarousal-state-v1";

localStorage.removeItem(OLD_PRIVATE_STORAGE_KEY);

const startDate = new Date(document.body.dataset.start);
const elements = {
  days: document.querySelector("#streakDays"),
  hours: document.querySelector("#streakHours"),
  minutes: document.querySelector("#streakMinutes"),
  seconds: document.querySelector("#streakSeconds"),
  winRate: document.querySelector("#winRate"),
  trackedDays: document.querySelector("#trackedDays"),
  winDays: document.querySelector("#winDays"),
  lossDays: document.querySelector("#lossDays"),
  refusalCount: document.querySelector("#refusalCount"),
  lastRelapse: document.querySelector("#lastRelapse"),
  charLevel: document.querySelector("#charLevel"),
  charXpText: document.querySelector("#charXpText"),
  charXpBar: document.querySelector("#charXpBar"),
  charShieldText: document.querySelector("#charShieldText"),
  charShieldBar: document.querySelector("#charShieldBar"),
  bossRank: document.querySelector("#bossRank"),
  bossHpText: document.querySelector("#bossHpText"),
  bossHpBar: document.querySelector("#bossHpBar"),
  battleLogs: document.querySelector("#battleLogs")
};
const accountabilityDataElement = document.querySelector("#accountabilityData");
const accountabilityData = parseAccountabilityData(accountabilityDataElement?.textContent);
const streakStartDate = getCurrentStreakStartDate(accountabilityData, startDate);

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function parseAccountabilityData(rawData) {
  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

function formatPublicTimestamp(timestamp, timeZone) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
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

function renderAccountability() {
  if (!accountabilityData || !elements.winRate || !elements.trackedDays || !elements.winDays || !elements.lossDays || !elements.refusalCount || !elements.lastRelapse) return;

  const timeZone = accountabilityData.timeZone || "Asia/Jakarta";
  const entries = Array.isArray(accountabilityData.entries) ? accountabilityData.entries : [];
  const journeyStart = new Date(accountabilityData.journeyStart);
  if (Number.isNaN(journeyStart.getTime())) return;

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
  const lastRelapseEntry = entries
    .filter((entry) => isRelapseEntry(entry))
    .sort((a, b) => new Date(getEntryTimestamp(b)).getTime() - new Date(getEntryTimestamp(a)).getTime())[0];

  elements.winRate.textContent = `${winRate}%`;
  elements.trackedDays.textContent = String(trackedDays);
  elements.winDays.textContent = String(winDays);
  elements.lossDays.textContent = String(lossDays);
  elements.refusalCount.textContent = String(refusalCount);
  elements.lastRelapse.textContent = lastRelapseEntry ? formatPublicTimestamp(getEntryTimestamp(lastRelapseEntry), timeZone) : "none logged";
}

async function renderBattleArena() {
  if (!elements.charLevel || !accountabilityData) return;

  const entries = Array.isArray(accountabilityData.entries) ? accountabilityData.entries : [];
  const journeyStart = new Date(accountabilityData.journeyStart);
  const timeZone = accountabilityData.timeZone || "Asia/Jakarta";

  const trackedDays = getCompletedTrackedDays(journeyStart);
  const lossPeriods = new Set(
    entries
      .filter((entry) => isRelapseEntry(entry))
      .map((entry) => getCompletedPeriodIndex(getEntryTimestamp(entry), journeyStart, trackedDays))
      .filter((periodIndex) => periodIndex !== null)
  );
  const lossDays = lossPeriods.size;
  const winDays = Math.max(0, trackedDays - lossDays);
  const refusalCount = entries.reduce((total, entry) => {
    if (entry?.type === "refuse") return total + 1;
    return total + (Array.isArray(entry?.refusals) ? entry.refusals.length : 0);
  }, 0);

  // Level and XP Calculation:
  // Every win day counts for 10 XP. Every refusal counts for 25 XP.
  // Every push-up = 1 XP, every km run/walk = 10 XP. 100 XP per level.
  let fitnessPushUps = 0;
  let fitnessRunWalkKm = 0;
  try {
    const fitnessRes = await fetch("/data/fitness-summary.json");
    if (fitnessRes.ok) {
      const fitnessData = await fitnessRes.json();
      fitnessPushUps = fitnessData?.summary?.totalPushUps || 0;
      fitnessRunWalkKm = fitnessData?.summary?.totalRunWalkKm || 0;
    }
  } catch (_) { /* fitness data optional */ }

  const winRate = trackedDays > 0 ? Math.round((winDays / trackedDays) * 100) : 100;
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

  const achievementXp = getAchievementXp(currentStreakDays, refusalCount, winRate, winDays, fitnessPushUps, fitnessRunWalkKm);
  const totalXp = (winDays * 10) + (refusalCount * 25) + (fitnessPushUps * 1) + (fitnessRunWalkKm * 10) + achievementXp;
  const level = 1 + Math.floor(totalXp / 100);
  const xpInCurrentLevel = Math.round(totalXp % 100);

  elements.charLevel.textContent = String(level);
  elements.charXpText.textContent = `${xpInCurrentLevel} / 100 XP`;
  elements.charXpBar.style.width = `${xpInCurrentLevel}%`;

  // Shield Integrity Calculation (current streak progress, reaches 100% at 5 days)
  const shieldPercent = Math.min(100, currentStreakDays * 20);
  elements.charShieldText.textContent = `${shieldPercent}%`;
  elements.charShieldBar.style.width = `${shieldPercent}%`;

  // Boss Rank and HP
  // Boss Rank goes up every 5 refusals total
  // Boss HP is depleted by active refusals in the current streak (20% per refusal)
  const currentStreakRefusals = entries.filter(
    (entry) => entry.type === "refuse" && new Date(getEntryTimestamp(entry)).getTime() > streakStartDate.getTime()
  ).length;

  const bossRank = 1 + Math.floor(refusalCount / 5);
  const shadowHp = Math.max(0, 100 - (currentStreakRefusals * 20));

  elements.bossRank.textContent = String(bossRank);
  if (shadowHp === 0) {
    elements.bossHpText.textContent = "DEFEATED (Awaiting Next Urge)";
    elements.bossHpBar.style.width = "0%";
    elements.bossHpBar.style.backgroundColor = "var(--accent)";
  } else {
    elements.bossHpText.textContent = `${shadowHp} / 100 HP`;
    elements.bossHpBar.style.width = `${shadowHp}%`;
    elements.bossHpBar.style.backgroundColor = "#ef4444";
  }

  // Populate Battle Logs (most recent 5 entries)
  if (elements.battleLogs) {
    const recentEntries = [...entries]
      .sort((a, b) => new Date(getEntryTimestamp(b)).getTime() - new Date(getEntryTimestamp(a)).getTime())
      .slice(0, 5);

    if (recentEntries.length === 0) {
      elements.battleLogs.innerHTML = `<li class="log-item default-log">Initial state loaded. No battles logged yet.</li>`;
    } else {
      elements.battleLogs.innerHTML = recentEntries
        .map((entry) => {
          const isRelapse = isRelapseEntry(entry);
          const timestamp = getEntryTimestamp(entry);
          const formattedDate = formatPublicTimestamp(timestamp, timeZone);
          if (isRelapse) {
            return `<li class="log-item loss-log">
              <span class="log-icon">💥</span>
              <span class="log-text"><strong>Shield Broken:</strong> Relapsed on ${formattedDate}</span>
            </li>`;
          } else {
            return `<li class="log-item win-log">
              <span class="log-icon">🛡️</span>
              <span class="log-text"><strong>Perfect Block:</strong> Refused urge on ${formattedDate}</span>
            </li>`;
          }
        })
        .join("");
    }
  }
}

async function render() {
  if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds || Number.isNaN(streakStartDate.getTime())) return;
  const elapsed = formatDuration(Date.now() - streakStartDate.getTime());
  elements.days.textContent = `${elapsed.days} day${elapsed.days === 1 ? "" : "s"}`;
  elements.hours.textContent = String(elapsed.hours).padStart(2, "0");
  elements.minutes.textContent = String(elapsed.minutes).padStart(2, "0");
  elements.seconds.textContent = String(elapsed.seconds).padStart(2, "0");
  renderAccountability();
  await renderBattleArena();
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

if (elements.days && elements.hours && elements.minutes && elements.seconds && !Number.isNaN(startDate.getTime())) {
  setInterval(render, 1000);
  render();
}

// Register PWA Service Worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered successfully'))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

