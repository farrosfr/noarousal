const startDate = new Date(document.body.dataset.start);
const elements = {
  charLevel: document.querySelector("#charLevel"),
  charXpText: document.querySelector("#charXpText"),
  charXpBar: document.querySelector("#charXpBar"),
  charShieldText: document.querySelector("#charShieldText"),
  charShieldBar: document.querySelector("#charShieldBar"),
  bossRank: document.querySelector("#bossRank"),
  bossHpText: document.querySelector("#bossHpText"),
  bossHpBar: document.querySelector("#bossHpBar"),
  bossStatusText: document.querySelector("#bossStatusText"),
  attrWillpower: document.querySelector("#attrWillpower"),
  attrFortitude: document.querySelector("#attrFortitude"),
  attrConsistency: document.querySelector("#attrConsistency"),
  attrAccuracy: document.querySelector("#attrAccuracy"),
  logTotalBattles: document.querySelector("#logTotalBattles"),
  logUrgesBlocked: document.querySelector("#logUrgesBlocked"),
  logRelapses: document.querySelector("#logRelapses"),
  fullBattleLogs: document.querySelector("#fullBattleLogs")
};

const accountabilityDataElement = document.querySelector("#accountabilityData");
const accountabilityData = parseAccountabilityData(accountabilityDataElement?.textContent);
const streakStartDate = getCurrentStreakStartDate(accountabilityData, startDate);

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primaryNav");
const siteHeader = document.querySelector(".site-header");
let lastScrollY = window.scrollY;
let isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

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

function unlockBadge(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("locked");
    el.classList.add("unlocked");
  }
}

function renderArena() {
  if (!accountabilityData) return;

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
  const winRate = trackedDays > 0 ? Math.round((winDays / trackedDays) * 100) : 100;
  const refusalCount = entries.reduce((total, entry) => {
    if (entry?.type === "refuse") return total + 1;
    return total + (Array.isArray(entry?.refusals) ? entry.refusals.length : 0);
  }, 0);

  // Level and XP
  const totalXp = (winDays * 10) + (refusalCount * 25);
  const level = 1 + Math.floor(totalXp / 100);
  const xpInCurrentLevel = totalXp % 100;

  if (elements.charLevel) elements.charLevel.textContent = String(level);
  if (elements.charXpText) elements.charXpText.textContent = `${xpInCurrentLevel} / 100 XP`;
  if (elements.charXpBar) elements.charXpBar.style.width = `${xpInCurrentLevel}%`;

  // Shield Integrity
  const currentStreakMs = Date.now() - streakStartDate.getTime();
  const currentStreakDays = Math.max(0, Math.floor(currentStreakMs / 86400000));
  const shieldPercent = Math.min(100, currentStreakDays * 20);
  if (elements.charShieldText) elements.charShieldText.textContent = `${shieldPercent}%`;
  if (elements.charShieldBar) elements.charShieldBar.style.width = `${shieldPercent}%`;

  // Boss Rank and HP
  const currentStreakRefusals = entries.filter(
    (entry) => entry.type === "refuse" && new Date(getEntryTimestamp(entry)).getTime() > streakStartDate.getTime()
  ).length;

  const bossRank = 1 + Math.floor(refusalCount / 5);
  const shadowHp = Math.max(0, 100 - (currentStreakRefusals * 20));

  if (elements.bossRank) elements.bossRank.textContent = String(bossRank);
  if (elements.bossHpBar) {
    if (shadowHp === 0) {
      elements.bossHpText.textContent = "DEFEATED (Awaiting Next Urge)";
      elements.bossHpBar.style.width = "0%";
      elements.bossHpBar.style.backgroundColor = "var(--accent)";
      if (elements.bossStatusText) {
        elements.bossStatusText.textContent = "DEFEATED";
        elements.bossStatusText.className = "status-indicator defeated";
      }
    } else {
      elements.bossHpText.textContent = `${shadowHp} / 100 HP`;
      elements.bossHpBar.style.width = `${shadowHp}%`;
      elements.bossHpBar.style.backgroundColor = "#ef4444";
      if (elements.bossStatusText) {
        elements.bossStatusText.textContent = "ACTIVE";
        elements.bossStatusText.className = "status-indicator alive";
      }
    }
  }

  // RPG Attributes
  if (elements.attrWillpower) elements.attrWillpower.textContent = String(refusalCount);
  if (elements.attrFortitude) elements.attrFortitude.textContent = String(currentStreakDays);
  if (elements.attrConsistency) elements.attrConsistency.textContent = String(winDays);
  if (elements.attrAccuracy) elements.attrAccuracy.textContent = String(winRate);

  // Unlock Badges dynamically
  unlockBadge("badge-first-step"); // Started journey
  if (refusalCount >= 1) unlockBadge("badge-first-refusal");
  if (currentStreakDays >= 3) unlockBadge("badge-consistent-shield");
  if (currentStreakDays >= 7) unlockBadge("badge-week-of-will");
  if (refusalCount >= 10) unlockBadge("badge-shadow-slayer");
  if (currentStreakDays >= 14) unlockBadge("badge-indomitable");
  if (winRate >= 95 && winDays >= 5) unlockBadge("badge-flawless");
  if (level >= 5) unlockBadge("badge-sovereign-master");

  // Combat Log Stats
  const relapseCount = entries.filter((e) => isRelapseEntry(e)).length;
  if (elements.logTotalBattles) elements.logTotalBattles.textContent = String(entries.length);
  if (elements.logUrgesBlocked) elements.logUrgesBlocked.textContent = String(refusalCount);
  if (elements.logRelapses) elements.logRelapses.textContent = String(relapseCount);

  // Full Combat History Logs
  if (elements.fullBattleLogs) {
    const sortedEntries = [...entries].sort((a, b) => new Date(getEntryTimestamp(b)).getTime() - new Date(getEntryTimestamp(a)).getTime());

    if (sortedEntries.length === 0) {
      elements.fullBattleLogs.innerHTML = `<li class="log-item default-log">No battles logged. Clean slate.</li>`;
    } else {
      elements.fullBattleLogs.innerHTML = sortedEntries
        .map((entry) => {
          const isRelapse = isRelapseEntry(entry);
          const timestamp = getEntryTimestamp(entry);
          const formattedDate = formatPublicTimestamp(timestamp, timeZone);
          if (isRelapse) {
            return `<li class="log-item loss-log">
              <span class="log-icon">💥</span>
              <span class="log-text"><strong>Shield Broken:</strong> Relapsed on ${formattedDate}. HP restored for boss.</span>
            </li>`;
          } else {
            return `<li class="log-item win-log">
              <span class="log-icon">🛡️</span>
              <span class="log-text"><strong>Perfect Block:</strong> Refused temptation on ${formattedDate}. Dealt 20 damage.</span>
            </li>`;
          }
        })
        .join("");
    }
  }
}

// Intersection Observer for scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

// Responsive Navigation Menu Toggle
function setMenuState(isOpen) {
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle?.setAttribute("aria-expanded", String(isOpen));
  menuToggle?.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  if (isOpen) document.body.classList.remove("header-hidden");
}

menuToggle?.addEventListener("click", () => {
  setMenuState(!document.body.classList.contains("menu-open"));
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuState(false);
});

window.addEventListener("resize", () => {
  isMobileViewport = window.matchMedia("(max-width: 760px)").matches;
  if (!isMobileViewport) setMenuState(false);
});

window.addEventListener("scroll", () => {
  if (!siteHeader || document.body.classList.contains("menu-open")) return;
  const currentScrollY = window.scrollY;
  if (!isMobileViewport) {
    document.body.classList.remove("header-hidden");
    lastScrollY = currentScrollY;
    return;
  }
  if (currentScrollY > lastScrollY && currentScrollY > 90) document.body.classList.add("header-hidden");
  if (currentScrollY < lastScrollY - 6) document.body.classList.remove("header-hidden");
  lastScrollY = Math.max(0, currentScrollY);
}, { passive: true });

// Initial render
if (!Number.isNaN(startDate.getTime())) {
  setInterval(renderArena, 1000);
  renderArena();
}
