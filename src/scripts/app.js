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
  lastRelapse: document.querySelector("#lastRelapse")
};
const accountabilityDataElement = document.querySelector("#accountabilityData");
const accountabilityData = parseAccountabilityData(accountabilityDataElement?.textContent);
const streakStartDate = getCurrentStreakStartDate(accountabilityData, startDate);
const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primaryNav");
const siteHeader = document.querySelector(".site-header");
let lastScrollY = window.scrollY;
let isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

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

function render() {
  if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds || Number.isNaN(streakStartDate.getTime())) return;
  const elapsed = formatDuration(Date.now() - streakStartDate.getTime());
  elements.days.textContent = `${elapsed.days} day${elapsed.days === 1 ? "" : "s"}`;
  elements.hours.textContent = String(elapsed.hours).padStart(2, "0");
  elements.minutes.textContent = String(elapsed.minutes).padStart(2, "0");
  elements.seconds.textContent = String(elapsed.seconds).padStart(2, "0");
  renderAccountability();
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

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

if (elements.days && elements.hours && elements.minutes && elements.seconds && !Number.isNaN(startDate.getTime())) {
  setInterval(render, 1000);
  render();
}
