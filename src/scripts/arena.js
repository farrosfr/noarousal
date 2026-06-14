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
const fitnessSummaryDataElement = document.querySelector("#fitnessSummaryData");
const fitnessData = parseAccountabilityData(fitnessSummaryDataElement?.textContent);
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

function checkPhoenixResolveActive() {
  const entries = Array.isArray(accountabilityData?.entries) ? accountabilityData.entries : [];
  const latestRelapseEntry = entries
    .filter((entry) => isRelapseEntry(entry))
    .sort((a, b) => new Date(getEntryTimestamp(b)).getTime() - new Date(getEntryTimestamp(a)).getTime())[0];

  if (latestRelapseEntry) {
    const relapseTime = new Date(getEntryTimestamp(latestRelapseEntry)).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return (Date.now() - relapseTime) <= oneDayMs;
  }
  return false;
}

function updatePhoenixBuffUi() {
  const isActive = checkPhoenixResolveActive();
  const badge = document.querySelector("#phoenixBuffBadge");
  if (badge) {
    badge.style.display = isActive ? "inline-block" : "none";
  }
}

function updateEquippedTalismansUi() {
  const entries = Array.isArray(accountabilityData?.entries) ? accountabilityData.entries : [];
  const currentStreakMs = Date.now() - streakStartDate.getTime();
  const currentStreakDays = Math.max(0, Math.floor(currentStreakMs / 86400000));
  const refusalCount = entries.reduce((total, entry) => {
    if (entry?.type === "refuse") return total + 1;
    return total + (Array.isArray(entry?.refusals) ? entry.refusals.length : 0);
  }, 0);

  const isFortressUnlocked = currentStreakDays >= 3;
  const isLotusUnlocked = currentStreakDays >= 7;
  const isWillfireUnlocked = refusalCount >= 10;

  const fortressEl = document.querySelector("#talismanFortress");
  const lotusEl = document.querySelector("#talismanLotus");
  const willfireEl = document.querySelector("#talismanWillfire");

  if (fortressEl) {
    if (isFortressUnlocked) {
      fortressEl.classList.remove("locked");
      fortressEl.classList.add("unlocked");
      fortressEl.title = "Fortress Amulet (Equipped) - Adds +10% shield absorption (Shield blocks 60% damage)";
    } else {
      fortressEl.classList.add("locked");
      fortressEl.classList.remove("unlocked");
    }
  }

  if (lotusEl) {
    if (isLotusUnlocked) {
      lotusEl.classList.remove("locked");
      lotusEl.classList.add("unlocked");
      lotusEl.title = "Lotus Incense (Equipped) - Adds a 2nd Meditation Incense to inventory";
    } else {
      lotusEl.classList.add("locked");
      lotusEl.classList.remove("unlocked");
    }
  }

  if (willfireEl) {
    if (isWillfireUnlocked) {
      willfireEl.classList.remove("locked");
      willfireEl.classList.add("unlocked");
      willfireEl.title = "Willfire Blade (Equipped) - Adds +15% Critical hit chance to Jutsus (Will Flame)";
    } else {
      willfireEl.classList.add("locked");
      willfireEl.classList.remove("unlocked");
    }
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

  // RPG Attributes & Fitness Bridging
  const fitnessPushUps = fitnessData?.summary?.totalPushUps || 0;
  const willpowerBonus = Math.floor(fitnessPushUps / 50);
  const totalWillpower = refusalCount + willpowerBonus;
  
  const fitnessRuns = fitnessData?.summary?.totalRunWalkKm || 0;
  const fortitudeBonus = Math.floor(fitnessRuns);
  const totalFortitude = currentStreakDays + fortitudeBonus;

  if (elements.attrWillpower) elements.attrWillpower.textContent = String(totalWillpower);
  if (elements.attrFortitude) elements.attrFortitude.textContent = String(totalFortitude);
  if (elements.attrConsistency) elements.attrConsistency.textContent = String(winDays);
  if (elements.attrAccuracy) elements.attrAccuracy.textContent = String(winRate);

  // Render Fitness dashboard UI
  renderFitnessSummary();

  // Unlock Badges dynamically
  unlockBadge("badge-first-step"); // Started journey
  if (refusalCount >= 1) unlockBadge("badge-first-refusal");
  if (currentStreakDays >= 3) unlockBadge("badge-consistent-shield");
  if (currentStreakDays >= 7) unlockBadge("badge-week-of-will");
  if (refusalCount >= 10) unlockBadge("badge-shadow-slayer");
  if (currentStreakDays >= 14) unlockBadge("badge-fortress-habit");
  if (winRate >= 95 && winDays >= 5) unlockBadge("badge-flawless");
  if (level >= 5) unlockBadge("badge-sovereign-master");

  // Update Talismans & Phoenix buff UI
  updateEquippedTalismansUi();
  updatePhoenixBuffUi();

  // Combat Log Stats
  const relapseCount = entries.filter((e) => isRelapseEntry(e)).length;
  if (elements.logTotalBattles) elements.logTotalBattles.textContent = String(entries.length);
  if (elements.logUrgesBlocked) elements.logUrgesBlocked.textContent = String(refusalCount);
  if (elements.logRelapses) elements.logRelapses.textContent = String(relapseCount);

  // Full Combat History Logs (Latest 10)
  if (elements.fullBattleLogs) {
    const sortedEntries = [...entries]
      .sort((a, b) => new Date(getEntryTimestamp(b)).getTime() - new Date(getEntryTimestamp(a)).getTime())
      .slice(0, 10);

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
// Initial render and calendar generation
if (!Number.isNaN(startDate.getTime())) {
  setInterval(renderArena, 1000);
  renderArena();
  renderCalendar();
}

// Web Audio API Sound Synthesizer
const audioCtxClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new audioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Helper to auto-disconnect audio nodes on completion to prevent memory leaks
    const safeDisconnect = (sourceNode, gainNode, filterNode) => {
      sourceNode.onended = () => {
        try {
          sourceNode.disconnect();
          if (gainNode) gainNode.disconnect();
          if (filterNode) filterNode.disconnect();
        } catch (e) {}
      };
    };

    if (type === 'strike') {
      // Noise buffer for slash swipe friction
      const bufferSize = audioCtx.sampleRate * 0.12;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.12);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);
      safeDisconnect(noise, noiseGain, noiseFilter);

      // Pitch glide for blade impact
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      safeDisconnect(osc, gain);
      
    } else if (type === 'fire') {
      // White noise explosion + sawtooth glide
      const bufferSize = audioCtx.sampleRate * 0.45;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(20, now + 0.4);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
      safeDisconnect(noise, gain, filter);

      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.4);

      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      safeDisconnect(osc, oscGain);

    } else if (type === 'shield') {
      // Dual high-pitch crystal sine tones for protective bubble
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      safeDisconnect(osc, gain);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.35);

      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.35);
      safeDisconnect(osc2, gain2);

    } else if (type === 'charge') {
      // Swirling sine wave sweeping upward
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.5);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.25);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      safeDisconnect(osc, gain);
      
    } else if (type === 'item') {
      // Upward arpeggio for powerups
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.15);
        safeDisconnect(osc, gain);
      });
    } else if (type === 'enemy_strike') {
      // Grungy low sawtooth slash
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      safeDisconnect(osc, gain);
    } else if (type === 'victory') {
      // Uplifting arpeggio melody
      const melody = [
        { note: 261.63, duration: 0.15 },
        { note: 329.63, duration: 0.15 },
        { note: 392.00, duration: 0.15 },
        { note: 523.25, duration: 0.3 }
      ];
      let delay = 0;
      melody.forEach((item) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.note, now + delay);
        
        gain.gain.setValueAtTime(0.25, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + item.duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + item.duration);
        safeDisconnect(osc, gain);
        delay += item.duration;
      });
    } else if (type === 'defeat') {
      // Descending minor theme
      const melody = [
        { note: 392.00, duration: 0.2 },
        { note: 311.13, duration: 0.2 },
        { note: 261.63, duration: 0.4 }
      ];
      let delay = 0;
      melody.forEach((item) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.note, now + delay);
        
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + item.duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + item.duration);
        safeDisconnect(osc, gain);
        delay += item.duration;
      });
    } else if (type === 'focus_success') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      safeDisconnect(osc, gain);
    } else if (type === 'focus_fail') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      safeDisconnect(osc, gain);
    } else if (type === 'debuff') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      safeDisconnect(osc, gain);
    } else if (type === 'rage') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.7);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.75);
      safeDisconnect(osc, gain);
    }
  } catch (e) {
    console.error("Audio Synthesis error", e);
  }
}

// Calendar rendering logic
function renderCalendar() {
  const grid = document.querySelector("#calendarDaysGrid");
  const monthNameEl = document.querySelector("#calendarMonthName");
  if (!grid || !accountabilityData) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  if (monthNameEl) monthNameEl.textContent = `${monthNames[month]} ${year}`;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  let html = "";
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="calendar-day padding"></div>`;
  }

  const entries = Array.isArray(accountabilityData.entries) ? accountabilityData.entries : [];
  const journeyStart = new Date(accountabilityData.journeyStart);

  for (let day = 1; day <= totalDays; day++) {
    const checkDate = new Date(year, month, day);
    
    let state = "empty";
    const isFuture = checkDate > now;
    const isBeforeJourney = checkDate < new Date(journeyStart.getFullYear(), journeyStart.getMonth(), journeyStart.getDate());

    if (!isFuture && !isBeforeJourney) {
      const dayStart = new Date(year, month, day, 0, 0, 0).getTime();
      const dayEnd = new Date(year, month, day, 23, 59, 59).getTime();

      const dayEntries = entries.filter(e => {
        const t = new Date(getEntryTimestamp(e)).getTime();
        return t >= dayStart && t <= dayEnd;
      });

      const hasRelapse = dayEntries.some(isRelapseEntry);
      state = hasRelapse ? "loss" : "win";
    }

    let dayClass = `calendar-day ${state}`;
    let dayContent = `<span class="day-number">${day}</span>`;
    
    if (state === "win") {
      dayContent += `<span class="day-status-icon">⚔️</span>`;
    } else if (state === "loss") {
      dayContent += `<span class="day-status-icon">💥</span>`;
    }

    html += `<div class="${dayClass}" title="${state.toUpperCase()}">${dayContent}</div>`;
  }

  grid.innerHTML = html;
}

function renderFitnessSummary() {
  if (!fitnessData) return;
  const summary = fitnessData.summary || { totalRunWalkKm: 0, totalPushUps: 0 };
  
  const runDistanceEl = document.querySelector("#fitRunWalkDistance");
  const pushUpsEl = document.querySelector("#fitPushUpsCount");
  
  if (runDistanceEl) runDistanceEl.textContent = summary.totalRunWalkKm.toFixed(2);
  if (pushUpsEl) pushUpsEl.textContent = String(summary.totalPushUps);
  
  const daily = Array.isArray(fitnessData.daily) ? fitnessData.daily : [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  let weeklyRuns = 0;
  let weeklyPushUps = 0;
  daily.forEach((day) => {
    if (new Date(day.date).getTime() >= oneWeekAgo) {
      weeklyRuns += Number(day.runWalkKm || 0);
      weeklyPushUps += Number(day.pushUps || 0);
    }
  });

  const cardioGoal = 10; // 10 Km weekly
  const pushGoal = 250; // 250 Reps weekly
  
  const cardioBar = document.querySelector("#fitWeeklyCardioBar");
  const cardioText = document.querySelector("#fitWeeklyCardioGoalText");
  if (cardioText) {
    cardioText.textContent = `${weeklyRuns.toFixed(2)} / ${cardioGoal} Km`;
  }
  if (cardioBar) {
    const pct = Math.min(100, (weeklyRuns / cardioGoal) * 100);
    cardioBar.style.width = `${pct}%`;
  }
  
  const pushBar = document.querySelector("#fitWeeklyPushBar");
  const pushText = document.querySelector("#fitWeeklyPushGoalText");
  if (pushText) {
    pushText.textContent = `${weeklyPushUps} / ${pushGoal} Reps`;
  }
  if (pushBar) {
    const pct = Math.min(100, (weeklyPushUps / pushGoal) * 100);
    pushBar.style.width = `${pct}%`;
  }
}

// Willpower Combat Simulator Logic
const game = {
  playerHP: 100,
  playerMaxHP: 100,
  playerChakra: 50,
  playerMaxChakra: 100,
  enemyHP: 120,
  enemyMaxHP: 120,
  playerShieldActive: false,
  isBattleOver: false,
  isEnemyTurn: false,
  isBossStunned: false,
  playerDebuffs: {
    fog: false,
    weight: false,
    bleedTurns: 0
  },
  bossRageActive: false,
  perfectFocusActive: false,
  perfectShieldActive: false,
  timeOfDayBoost: {
    heal: 1.0,
    bossAtkMultiplier: 1.0,
    playerFlameCrit: 1.5
  },
  items: {
    coldShower: 1,
    pushUp: 1,
    meditation: 1
  }
};

let currentBossKey = "leviathan";

const BOSSES = {
  siren: {
    name: "Boredom Siren",
    maxHP: 90,
    filter: "hue-rotate(120deg) saturate(1.5)",
    avatar: "/shadow_avatar.jpg",
    description: "An alluring phantom born of inactivity. Drains chakra.",
    aiAction: function() {
      const roll = Math.random();
      let dmg = 0;
      let attackName = "";
      let description = "";

      if (roll < 0.6) {
        attackName = "Chakra Drain";
        dmg = Math.floor(Math.random() * 5) + 6;
        const stolenChakra = Math.min(game.playerChakra, 20);
        game.playerChakra = Math.max(0, game.playerChakra - stolenChakra);
        description = `deals ${dmg} damage and drains ${stolenChakra} Chakra!`;
        showFloatingEffect("#ninja-player", `-${stolenChakra} Chakra`, "chakra-float");
      } else {
        attackName = "Distraction Song";
        dmg = Math.floor(Math.random() * 6) + 8;
        description = `deals ${dmg} damage.`;
      }
      
      // Apply Rage & Time boosts
      if (game.bossRageActive) dmg = Math.round(dmg * 1.25);
      if (game.timeOfDayBoost && game.timeOfDayBoost.bossAtkMultiplier) {
        dmg = Math.round(dmg * game.timeOfDayBoost.bossAtkMultiplier);
      }

      playSound('enemy_strike');
      if (gameElements.ninjaEnemy) {
        gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
        setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
      }

      setTimeout(() => {
        if (game.playerShieldActive) {
          let absorbRate = game.fortressAmuletActive ? 0.4 : 0.5;
          let shieldDesc = `${(1 - absorbRate)*100}% absorbed by Refusal Shield`;
          if (game.perfectShieldActive) {
            absorbRate = 0;
            shieldDesc = "100% absorbed by PERFECT Refusal Shield";
          }
          dmg = Math.round(dmg * absorbRate);
          game.playerShieldActive = false;
          game.perfectShieldActive = false;
          description += ` (${shieldDesc})`;
          
          const shieldOverlay = document.querySelector("#refusalShieldOverlay");
          if (shieldOverlay) {
            shieldOverlay.classList.remove("shield-active-state");
            triggerOverlayAnimation("#refusalShieldOverlay");
          }
        } else {
          triggerOverlayAnimation("#enemyStrikeOverlay");
        }
        
        game.playerHP = Math.max(0, game.playerHP - dmg);
        shakeElement(gameElements.ninjaPlayer);
        showFloatingEffect("#ninja-player", `-${dmg}`, "damage");

        // Siren applies Brain Fog debuff (40% chance)
        if (Math.random() < 0.4 && !game.playerDebuffs.fog) {
          game.playerDebuffs.fog = true;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Brain Fog!", "debuff-float");
          description += ` and inflicts <strong>Brain Fog</strong>!`;
        }

        appendLogToTicker(`Boredom Siren casts <strong>${attackName}</strong>! It ${description}`);
        
        startPlayerTurn();
        updateShieldIndicator();
        
        if (!checkBattleEnd()) {
          updateGameUi();
        }
      }, 200);
    }
  },
  goliath: {
    name: "Stress Goliath",
    maxHP: 150,
    filter: "hue-rotate(220deg) brightness(0.9) saturate(1.8)",
    avatar: "/shadow_avatar.jpg",
    description: "A colossal titan forged from daily anxiety. Heavy physical hitter.",
    aiAction: function() {
      const roll = Math.random();
      let dmg = 0;
      let attackName = "";
      let description = "";

      if (roll < 0.4) {
        attackName = "Anxiety Slam";
        dmg = Math.floor(Math.random() * 10) + 22;
        description = `deals a heavy ${dmg} damage!`;
      } else {
        attackName = "Stress Crush";
        dmg = Math.floor(Math.random() * 7) + 12;
        description = `deals ${dmg} damage.`;
      }

      // Apply Rage & Time boosts
      if (game.bossRageActive) dmg = Math.round(dmg * 1.25);
      if (game.timeOfDayBoost && game.timeOfDayBoost.bossAtkMultiplier) {
        dmg = Math.round(dmg * game.timeOfDayBoost.bossAtkMultiplier);
      }

      playSound('enemy_strike');
      if (gameElements.ninjaEnemy) {
        gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
        setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
      }

      setTimeout(() => {
        if (game.playerShieldActive) {
          let absorbRate = game.fortressAmuletActive ? 0.4 : 0.5;
          let shieldDesc = `${(1 - absorbRate)*100}% absorbed by Refusal Shield`;
          if (game.perfectShieldActive) {
            absorbRate = 0;
            shieldDesc = "100% absorbed by PERFECT Refusal Shield";
          }
          dmg = Math.round(dmg * absorbRate);
          game.playerShieldActive = false;
          game.perfectShieldActive = false;
          description += ` (${shieldDesc})`;
          
          const shieldOverlay = document.querySelector("#refusalShieldOverlay");
          if (shieldOverlay) {
            shieldOverlay.classList.remove("shield-active-state");
            triggerOverlayAnimation("#refusalShieldOverlay");
          }
        } else {
          triggerOverlayAnimation("#enemyStrikeOverlay");
        }
        
        game.playerHP = Math.max(0, game.playerHP - dmg);
        shakeElement(gameElements.ninjaPlayer);
        showFloatingEffect("#ninja-player", `-${dmg}`, "damage");

        // Goliath applies Anxiety Weight debuff (40% chance)
        if (Math.random() < 0.4 && !game.playerDebuffs.weight) {
          game.playerDebuffs.weight = true;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Anxiety Weight!", "debuff-float");
          description += ` and inflicts <strong>Anxiety Weight</strong>!`;
        }

        appendLogToTicker(`Stress Goliath casts <strong>${attackName}</strong>! It ${description}`);
        
        startPlayerTurn();
        updateShieldIndicator();
        
        if (!checkBattleEnd()) {
          updateGameUi();
        }
      }, 200);
    }
  },
  leviathan: {
    name: "Shadow Leviathan",
    maxHP: 200,
    filter: "saturate(2.5) contrast(1.2)",
    avatar: "/shadow_boss.jpg",
    description: "The ultimate representation of chemical compulsion. Ignores shields.",
    aiAction: function() {
      const roll = Math.random();
      let dmg = 0;
      let attackName = "";
      let description = "";
      let bypassShield = false;

      if (roll < 0.5) {
        attackName = "Compulsion Pierce";
        dmg = Math.floor(Math.random() * 8) + 16;
        description = `deals ${dmg} damage, <strong>ignoring Refusal Shield entirely</strong>!`;
        bypassShield = true;
      } else {
        attackName = "Temptation Flood";
        dmg = Math.floor(Math.random() * 8) + 12;
        description = `deals ${dmg} damage.`;
      }

      // Apply Rage & Time boosts
      if (game.bossRageActive) dmg = Math.round(dmg * 1.25);
      if (game.timeOfDayBoost && game.timeOfDayBoost.bossAtkMultiplier) {
        dmg = Math.round(dmg * game.timeOfDayBoost.bossAtkMultiplier);
      }

      playSound('enemy_strike');
      if (gameElements.ninjaEnemy) {
        gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
        setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
      }

      setTimeout(() => {
        if (game.playerShieldActive && !bypassShield) {
          let absorbRate = game.fortressAmuletActive ? 0.4 : 0.5;
          let shieldDesc = `${(1 - absorbRate)*100}% absorbed by Refusal Shield`;
          if (game.perfectShieldActive) {
            absorbRate = 0;
            shieldDesc = "100% absorbed by PERFECT Refusal Shield";
          }
          dmg = Math.round(dmg * absorbRate);
          game.playerShieldActive = false;
          game.perfectShieldActive = false;
          description += ` (${shieldDesc})`;
          
          const shieldOverlay = document.querySelector("#refusalShieldOverlay");
          if (shieldOverlay) {
            shieldOverlay.classList.remove("shield-active-state");
            triggerOverlayAnimation("#refusalShieldOverlay");
          }
        } else {
          triggerOverlayAnimation("#enemyStrikeOverlay");
        }
        
        game.playerHP = Math.max(0, game.playerHP - dmg);
        shakeElement(gameElements.ninjaPlayer);
        showFloatingEffect("#ninja-player", `-${dmg}`, "damage");

        // Leviathan applies Lingering Urge (bleed) debuff (50% chance)
        if (Math.random() < 0.5 && game.playerDebuffs.bleedTurns === 0) {
          game.playerDebuffs.bleedTurns = 3;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Lingering Urge!", "debuff-float");
          description += ` and inflicts <strong>Lingering Urge</strong> (bleed)!`;
        }

        appendLogToTicker(`Shadow Leviathan casts <strong>${attackName}</strong>! It ${description}`);
        
        startPlayerTurn();
        updateShieldIndicator();
        
        if (!checkBattleEnd()) {
          updateGameUi();
        }
      }, 200);
    }
  },
  temptress: {
    name: "Malphas, Shadow Temptress",
    maxHP: 240,
    filter: "hue-rotate(300deg) saturate(2) brightness(0.95)",
    avatar: "/shadow_boss.jpg",
    description: "A cunning demon of sweet illusion. Attacks deal moderate damage and sap willpower.",
    aiAction: function() {
      const roll = Math.random();
      let dmg = 0;
      let attackName = "";
      let description = "";
      let bypassShield = false;

      if (roll < 0.6) {
        attackName = "Sapper Kiss";
        dmg = Math.floor(Math.random() * 5) + 14; // 14-18 damage
        const stolenChakra = Math.min(game.playerChakra, 15);
        game.playerChakra = Math.max(0, game.playerChakra - stolenChakra);
        description = `deals ${dmg} damage and saps ${stolenChakra} Chakra!`;
        showFloatingEffect("#ninja-player", `-${stolenChakra} Chakra`, "chakra-float");
      } else {
        attackName = "Sweet Illusion";
        dmg = Math.floor(Math.random() * 5) + 10; // 10-14 damage
        description = `deals ${dmg} damage, <strong>ignoring Refusal Shield entirely</strong>!`;
        bypassShield = true;
      }

      // Apply Rage & Time boosts
      if (game.bossRageActive) dmg = Math.round(dmg * 1.25);
      if (game.timeOfDayBoost && game.timeOfDayBoost.bossAtkMultiplier) {
        dmg = Math.round(dmg * game.timeOfDayBoost.bossAtkMultiplier);
      }

      playSound('enemy_strike');
      if (gameElements.ninjaEnemy) {
        gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
        setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
      }

      setTimeout(() => {
        if (game.playerShieldActive && !bypassShield) {
          let absorbRate = game.fortressAmuletActive ? 0.4 : 0.5;
          let shieldDesc = `${(1 - absorbRate)*100}% absorbed by Refusal Shield`;
          if (game.perfectShieldActive) {
            absorbRate = 0;
            shieldDesc = "100% absorbed by PERFECT Refusal Shield";
          }
          dmg = Math.round(dmg * absorbRate);
          game.playerShieldActive = false;
          game.perfectShieldActive = false;
          description += ` (${shieldDesc})`;
          
          const shieldOverlay = document.querySelector("#refusalShieldOverlay");
          if (shieldOverlay) {
            shieldOverlay.classList.remove("shield-active-state");
            triggerOverlayAnimation("#refusalShieldOverlay");
          }
        } else {
          triggerOverlayAnimation("#enemyStrikeOverlay");
        }
        
        game.playerHP = Math.max(0, game.playerHP - dmg);
        shakeElement(gameElements.ninjaPlayer);
        showFloatingEffect("#ninja-player", `-${dmg}`, "damage");

        // Temptress applies Brain Fog (40% chance) or Bleed (30% chance)
        const debuffRoll = Math.random();
        if (debuffRoll < 0.4 && !game.playerDebuffs.fog) {
          game.playerDebuffs.fog = true;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Brain Fog!", "debuff-float");
          description += ` and inflicts <strong>Brain Fog</strong>!`;
        } else if (debuffRoll >= 0.4 && debuffRoll < 0.7 && game.playerDebuffs.bleedTurns === 0) {
          game.playerDebuffs.bleedTurns = 3;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Lingering Urge!", "debuff-float");
          description += ` and inflicts <strong>Lingering Urge</strong> (bleed)!`;
        }

        appendLogToTicker(`Malphas casts <strong>${attackName}</strong>! It ${description}`);
        
        startPlayerTurn();
        updateShieldIndicator();
        
        if (!checkBattleEnd()) {
          updateGameUi();
        }
      }, 200);
    }
  },
  archdemon: {
    name: "Dopamine Archdemon",
    maxHP: 300,
    filter: "none",
    avatar: "/dopamine_archdemon.jpg",
    description: "The ultimate lord of instant gratification. Attacks deal massive damage and inflict Dopamine Crash.",
    aiAction: function() {
      const roll = Math.random();
      let dmg = 0;
      let attackName = "";
      let description = "";
      let bypassShield = false;

      if (roll < 0.6) {
        attackName = "Dopamine Overload";
        dmg = Math.floor(Math.random() * 8) + 20; // 20-27 damage
        const stolenChakra = Math.min(game.playerChakra, 25);
        game.playerChakra = Math.max(0, game.playerChakra - stolenChakra);
        description = `deals ${dmg} damage and corrupts ${stolenChakra} Chakra!`;
        showFloatingEffect("#ninja-player", `-${stolenChakra} Chakra`, "chakra-float");
      } else {
        attackName = "Void Temptation";
        dmg = Math.floor(Math.random() * 6) + 16; // 16-21 damage
        description = `deals ${dmg} damage, <strong>ignoring Refusal Shield entirely</strong>!`;
        bypassShield = true;
      }

      // Apply Rage & Time boosts
      if (game.bossRageActive) dmg = Math.round(dmg * 1.25);
      if (game.timeOfDayBoost && game.timeOfDayBoost.bossAtkMultiplier) {
        dmg = Math.round(dmg * game.timeOfDayBoost.bossAtkMultiplier);
      }

      playSound('enemy_strike');
      if (gameElements.ninjaEnemy) {
        gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
        setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
      }

      setTimeout(() => {
        if (game.playerShieldActive && !bypassShield) {
          let absorbRate = game.fortressAmuletActive ? 0.4 : 0.5;
          let shieldDesc = `${(1 - absorbRate)*100}% absorbed by Refusal Shield`;
          if (game.perfectShieldActive) {
            absorbRate = 0;
            shieldDesc = "100% absorbed by PERFECT Refusal Shield";
          }
          dmg = Math.round(dmg * absorbRate);
          game.playerShieldActive = false;
          game.perfectShieldActive = false;
          description += ` (${shieldDesc})`;
          
          const shieldOverlay = document.querySelector("#refusalShieldOverlay");
          if (shieldOverlay) {
            shieldOverlay.classList.remove("shield-active-state");
            triggerOverlayAnimation("#refusalShieldOverlay");
          }
        } else {
          triggerOverlayAnimation("#enemyStrikeOverlay");
        }
        
        game.playerHP = Math.max(0, game.playerHP - dmg);
        shakeElement(gameElements.ninjaPlayer);
        showFloatingEffect("#ninja-player", `-${dmg}`, "damage");

        // Archdemon applies a heavy bleed "Dopamine Crash" (50% chance, 4 turns)
        if (Math.random() < 0.5 && game.playerDebuffs.bleedTurns === 0) {
          game.playerDebuffs.bleedTurns = 4;
          playSound('debuff');
          showFloatingEffect("#ninja-player", "Dopamine Crash!", "debuff-float");
          description += ` and inflicts <strong>Dopamine Crash</strong> (4-turn bleed)!`;
        }

        appendLogToTicker(`Dopamine Archdemon casts <strong>${attackName}</strong>! It ${description}`);
        
        startPlayerTurn();
        updateShieldIndicator();
        
        if (!checkBattleEnd()) {
          updateGameUi();
        }
      }, 200);
    }
  }
};

const gameElements = {
  playerHpText: document.querySelector("#gamePlayerHpText"),
  playerHpBar: document.querySelector("#gamePlayerHpBar"),
  playerChakraText: document.querySelector("#gamePlayerChakraText"),
  playerChakraBar: document.querySelector("#gamePlayerChakraBar"),
  enemyHpText: document.querySelector("#gameEnemyHpText"),
  enemyHpBar: document.querySelector("#gameEnemyHpBar"),
  combatTicker: document.querySelector("#combatTicker"),
  gameOverOverlay: document.querySelector("#gameOverOverlay"),
  overlayResultTitle: document.querySelector("#overlayResultTitle"),
  overlayResultDesc: document.querySelector("#overlayResultDesc"),
  
  ninjaPlayer: document.querySelector("#ninja-player"),
  ninjaEnemy: document.querySelector("#ninja-enemy"),
  
  btnStrike: document.querySelector("#btnStrike"),
  btnFireJutsu: document.querySelector("#btnFireJutsu"),
  btnHealJutsu: document.querySelector("#btnHealJutsu"),
  btnCharge: document.querySelector("#btnCharge"),
  btnRestartGame: document.querySelector("#btnRestartGame")
};

function checkBossRageTransition() {
  if (game.enemyHP > 0 && game.enemyHP <= game.enemyMaxHP * 0.4 && !game.bossRageActive) {
    game.bossRageActive = true;
    playSound('rage');
    appendLogToTicker(`<span style="color: #ef4444; font-weight: bold;">⚠️ Boss Rage:</span> ${BOSSES[currentBossKey].name} enters a RAGE STATE! Damage increased by 25%!`);
    const vignette = document.querySelector("#rageVignette");
    if (vignette) vignette.classList.add("rage-active");
  }
}

function renderDebuffs() {
  const container = document.querySelector("#playerDebuffs");
  if (!container) return;
  let html = "";
  if (game.playerDebuffs.fog) {
    html += `<span class="debuff-badge" title="Brain Fog: 25% chance to miss basic attacks">🌫️ Brain Fog</span>`;
  }
  if (game.playerDebuffs.weight) {
    html += `<span class="debuff-badge" title="Anxiety Weight: +5 Chakra cost on all Jutsus">⚖️ Anxiety Weight</span>`;
  }
  if (game.playerDebuffs.bleedTurns > 0) {
    html += `<span class="debuff-badge" title="Lingering Urge: Bleeding 5 HP per turn (${game.playerDebuffs.bleedTurns} turns remaining)">🩸 Lingering Urge (${game.playerDebuffs.bleedTurns}t)</span>`;
  }
  container.innerHTML = html;
}

function startPlayerTurn() {
  game.isEnemyTurn = false;
  
  if (game.playerHP > 0 && game.playerDebuffs.bleedTurns > 0) {
    const bleedDmg = 5;
    game.playerHP = Math.max(0, game.playerHP - bleedDmg);
    playSound('enemy_strike');
    shakeElement(gameElements.ninjaPlayer);
    showFloatingEffect("#ninja-player", `-${bleedDmg} (Bleed)`, "damage");
    appendLogToTicker(`Lingering Urge drains ${bleedDmg} HP from Sovereign Ninja!`);
    game.playerDebuffs.bleedTurns--;
    
    if (checkBattleEnd()) return;
  }
  
  updateGameUi();
}

function initDynamicStats() {
  const willpower = parseInt(document.querySelector("#attrWillpower")?.textContent || "0", 10);
  const fortitude = parseInt(document.querySelector("#attrFortitude")?.textContent || "0", 10);

  // Stats Bridging
  game.playerMaxHP = 100 + (fortitude * 5); // +5 HP per clean day
  game.playerHP = game.playerMaxHP;
  game.playerMaxChakra = 100;
  game.playerChakra = 50;

  // Scaling damage
  game.strikeMinDmg = 10 + Math.floor(willpower * 0.4);
  game.strikeMaxDmg = 18 + Math.floor(willpower * 0.4);
  game.fireMinDmg = 24 + Math.floor(willpower * 0.8);
  game.fireMaxDmg = 36 + Math.floor(willpower * 0.8);
  game.healAmount = 25 + Math.floor(fortitude * 1.5);

  // Unlocked Equipment/Buffs checks
  game.phoenixResolveActive = checkPhoenixResolveActive();
  game.fortressAmuletActive = fortitude >= 3;
  game.lotusIncenseActive = fortitude >= 7;
  game.willfireBladeActive = willpower >= 10;

  // Reset Debuffs & Buffs
  game.playerDebuffs = { fog: false, weight: false, bleedTurns: 0 };
  game.bossRageActive = false;
  game.perfectFocusActive = false;
  game.perfectShieldActive = false;

  // Time of Day Affinities
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) {
    game.timeOfDayBoost = { heal: 1.15, bossAtkMultiplier: 1.0, playerFlameCrit: 1.5 };
  } else if (hour >= 17 && hour < 19) {
    game.timeOfDayBoost = { heal: 1.0, bossAtkMultiplier: 1.0, playerFlameCrit: 1.5 };
  } else {
    game.timeOfDayBoost = { heal: 1.0, bossAtkMultiplier: 1.10, playerFlameCrit: 1.8 };
  }

  // Apply Lotus Incense item capacity
  game.items = {
    coldShower: 1,
    pushUp: 1,
    meditation: game.lotusIncenseActive ? 2 : 1
  };
  game.isBossStunned = false;

  // Apply Phoenix starting shield & ATK multipliers
  if (game.phoenixResolveActive) {
    game.playerShieldActive = true;
    game.atkMultiplier = 1.3;
  } else {
    game.playerShieldActive = false;
    game.atkMultiplier = 1.0;
  }
}

function applySelectedBoss() {
  const boss = BOSSES[currentBossKey] || BOSSES.leviathan;
  game.enemyHP = boss.maxHP;
  game.enemyMaxHP = boss.maxHP;
  
  const bossNames = document.querySelectorAll(".boss-name");
  bossNames.forEach(el => {
    el.textContent = boss.name;
  });
  
  const dashboardAvatar = document.querySelector(".boss-card .character-avatar");
  if (dashboardAvatar) {
    dashboardAvatar.src = boss.avatar || "/shadow_boss.jpg";
  }
  
  const enemyAvatar = document.querySelector(".ninja-character.enemy .ninja-avatar-img");
  if (enemyAvatar) {
    enemyAvatar.src = boss.avatar || "/shadow_avatar.jpg";
    enemyAvatar.style.filter = boss.filter;
  }
}

function updateGameUi() {
  if (gameElements.playerHpText) gameElements.playerHpText.textContent = `${game.playerHP}/${game.playerMaxHP}`;
  if (gameElements.playerHpBar) gameElements.playerHpBar.style.width = `${(game.playerHP / game.playerMaxHP) * 100}%`;
  
  if (gameElements.playerChakraText) gameElements.playerChakraText.textContent = `${game.playerChakra}/${game.playerMaxChakra}`;
  if (gameElements.playerChakraBar) gameElements.playerChakraBar.style.width = `${(game.playerChakra / game.playerMaxChakra) * 100}%`;
  
  if (gameElements.enemyHpText) gameElements.enemyHpText.textContent = `${game.enemyHP}/${game.enemyMaxHP}`;
  if (gameElements.enemyHpBar) gameElements.enemyHpBar.style.width = `${(game.enemyHP / game.enemyMaxHP) * 100}%`;
  
  const isDisabled = game.isBattleOver || game.isEnemyTurn;
  const fireCost = 20 + (game.playerDebuffs.weight ? 5 : 0);
  const healCost = 15 + (game.playerDebuffs.weight ? 5 : 0);

  if (gameElements.btnStrike) gameElements.btnStrike.disabled = isDisabled;
  if (gameElements.btnFireJutsu) gameElements.btnFireJutsu.disabled = isDisabled || game.playerChakra < fireCost;
  if (gameElements.btnHealJutsu) gameElements.btnHealJutsu.disabled = isDisabled || game.playerChakra < healCost;
  if (gameElements.btnCharge) gameElements.btnCharge.disabled = isDisabled;

  // Grounding Items States
  const btnCold = document.querySelector("#btnUseColdShower");
  const btnPush = document.querySelector("#btnUsePushUp");
  const btnMed = document.querySelector("#btnUseMeditation");
  
  if (btnCold) {
    btnCold.disabled = isDisabled || game.items.coldShower <= 0;
    const badge = document.querySelector("#qtyColdShower");
    if (badge) badge.textContent = game.items.coldShower;
  }
  if (btnPush) {
    btnPush.disabled = isDisabled || game.items.pushUp <= 0;
    const badge = document.querySelector("#qtyPushUp");
    if (badge) badge.textContent = game.items.pushUp;
  }
  if (btnMed) {
    btnMed.disabled = isDisabled || game.items.meditation <= 0;
    const badge = document.querySelector("#qtyMeditation");
    if (badge) badge.textContent = game.items.meditation;
  }

  renderDebuffs();
}

function showFloatingEffect(targetId, text, type) {
  const container = document.querySelector(targetId);
  if (!container) return;
  const floatEl = container.querySelector(".floating-effect");
  if (!floatEl) return;
  
  floatEl.textContent = text;
  floatEl.className = `floating-effect ${type}`;
  
  floatEl.style.animation = "none";
  floatEl.offsetHeight; // trigger reflow
  floatEl.style.animation = null;
}

function shakeElement(element) {
  if (!element) return;
  element.classList.add("shake-anim");
  setTimeout(() => {
    element.classList.remove("shake-anim");
  }, 500);
}

function appendLogToTicker(message) {
  if (gameElements.combatTicker) {
    gameElements.combatTicker.innerHTML = message;
  }
}

function startCinematicVictory() {
  const cinematicOverlay = document.querySelector("#cinematicVictoryOverlay");
  if (!cinematicOverlay) return;
  
  if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  
  cinematicOverlay.style.display = "flex";
  cinematicOverlay.classList.remove("play-animation");
  cinematicOverlay.offsetHeight; // trigger reflow
  cinematicOverlay.classList.add("play-animation");

  const subtitle = document.querySelector("#cinematicSubtitle");
  if (subtitle) {
    subtitle.textContent = `"At last... the shadow urge dissipates into the light of resolve."`;
    if (window.victorySubtitleTimeout) clearTimeout(window.victorySubtitleTimeout);
    window.victorySubtitleTimeout = setTimeout(() => {
      subtitle.textContent = `"My willpower is absolute. The Sovereign Mind remains master of itself."`;
    }, 3500);
  }

  const continueBtn = document.querySelector("#btnCinematicContinue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      cinematicOverlay.style.display = "none";
      if (gameElements.gameOverOverlay) {
        gameElements.overlayResultTitle.textContent = "Victory!";
        gameElements.overlayResultTitle.style.color = "var(--accent)";
        gameElements.overlayResultDesc.textContent = `${BOSSES[currentBossKey].name} has been successfully dispelled! Sovereign Mind retains control.`;
        gameElements.gameOverOverlay.style.display = "flex";
      }
    };
  }
}

function checkBattleEnd() {
  if (game.enemyHP <= 0) {
    game.isBattleOver = true;
    updateGameUi();
    playSound('victory');
    setTimeout(() => {
      startCinematicVictory();
    }, 800);
    return true;
  }
  
  if (game.playerHP <= 0) {
    game.isBattleOver = true;
    updateGameUi();
    playSound('defeat');
    setTimeout(() => {
      if (gameElements.gameOverOverlay) {
        gameElements.overlayResultTitle.textContent = "Defeated!";
        gameElements.overlayResultTitle.style.color = "#ef4444";
        gameElements.overlayResultDesc.textContent = `The urge overwhelmed your shield. Clear your mind and try again!`;
        gameElements.gameOverOverlay.style.display = "flex";
      }
    }, 800);
    return true;
  }
  return false;
}

function triggerOverlayAnimation(selector, activeClass = "active") {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove(activeClass);
  el.offsetHeight; // trigger reflow
  el.classList.add(activeClass);
  if (activeClass === "active") {
    setTimeout(() => {
      el.classList.remove(activeClass);
    }, 800);
  }
}

function updateShieldIndicator() {
  const shieldOverlay = document.querySelector("#refusalShieldOverlay");
  if (shieldOverlay) {
    if (game.playerShieldActive) {
      shieldOverlay.classList.add("shield-active-state");
    } else {
      shieldOverlay.classList.remove("shield-active-state");
    }
  }
}

function setDynamicGameBackground() {
  const hour = new Date().getHours();
  const arena = document.querySelector(".battle-bg-arena");
  if (!arena) return;
  let bg = "/arena_bg_day.jpg";
  if (hour >= 17 && hour < 19) {
    bg = "/arena_bg_sunset.jpg";
  } else if (hour >= 19 || hour < 6) {
    bg = "/arena_bg_night.jpg";
  }
  arena.style.backgroundImage = `linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(9, 9, 11, 0.85) 100%), url(${bg})`;
  arena.style.backgroundSize = "cover";
  arena.style.backgroundPosition = "center";
}

function enemyTurn() {
  if (game.isBattleOver) return;
  game.isEnemyTurn = true;
  updateGameUi();
  
  appendLogToTicker(`${BOSSES[currentBossKey].name} is preparing an attack...`);
  
  setTimeout(() => {
    if (game.isBossStunned) {
      game.isBossStunned = false;
      appendLogToTicker(`The boss is pacified by the Meditation Incense and skips their turn!`);
      setTimeout(() => {
        game.isEnemyTurn = false;
        updateGameUi();
      }, 1200);
      return;
    }
    
    // Execute active boss AI Action
    const boss = BOSSES[currentBossKey] || BOSSES.leviathan;
    boss.aiAction();
  }, 1200);
}

let activeFocusTimeout = null;

function triggerFocusEvent(onComplete) {
  const overlay = document.querySelector("#focusRingOverlay");
  const btnFocus = document.querySelector("#btnFocus");
  if (!overlay || !btnFocus) {
    onComplete();
    return;
  }

  game.perfectFocusActive = false;
  overlay.style.display = "flex";
  overlay.classList.remove("animating");
  overlay.offsetHeight; // trigger reflow
  overlay.classList.add("animating");

  const startTime = Date.now();
  let clicked = false;

  const handleFocusClick = () => {
    if (clicked) return;
    clicked = true;
    
    const elapsed = Date.now() - startTime;
    // Perfect alignment window is 80% to 95% of the 1-second animation (800ms to 950ms)
    if (elapsed >= 800 && elapsed <= 950) {
      game.perfectFocusActive = true;
      playSound('focus_success');
      showFloatingEffect("#ninja-player", "PERFECT FOCUS!", "heal");
    } else {
      game.perfectFocusActive = false;
      playSound('focus_fail');
      showFloatingEffect("#ninja-player", "MISSED FOCUS", "damage");
    }

    cleanup();
  };

  const cleanup = () => {
    if (activeFocusTimeout) clearTimeout(activeFocusTimeout);
    btnFocus.removeEventListener("click", handleFocusClick);
    overlay.style.display = "none";
    overlay.classList.remove("animating");
    onComplete();
  };

  btnFocus.addEventListener("click", handleFocusClick);

  activeFocusTimeout = setTimeout(() => {
    if (!clicked) {
      clicked = true;
      game.perfectFocusActive = false;
      playSound('focus_fail');
      showFloatingEffect("#ninja-player", "MISSED FOCUS", "damage");
      cleanup();
    }
  }, 1100);
}

function handleStrike() {
  if (game.playerDebuffs.fog && Math.random() < 0.25) {
    playSound('focus_fail');
    showFloatingEffect("#ninja-enemy", "MISS!", "damage-miss");
    appendLogToTicker(`Sovereign Ninja uses <strong>Strike</strong>... but <strong>MISSES</strong> due to Brain Fog!`);
    if (!checkBattleEnd()) {
      enemyTurn();
    }
    return;
  }

  let dmg = Math.floor(Math.random() * (game.strikeMaxDmg - game.strikeMinDmg + 1)) + game.strikeMinDmg;
  if (game.atkMultiplier) {
    dmg = Math.round(dmg * game.atkMultiplier);
  }

  game.enemyHP = Math.max(0, game.enemyHP - dmg);
  playSound('strike');
  checkBossRageTransition();
  
  if (gameElements.ninjaPlayer) {
    gameElements.ninjaPlayer.classList.add("player-attack-dash");
    setTimeout(() => gameElements.ninjaPlayer.classList.remove("player-attack-dash"), 600);
  }
  
  setTimeout(() => {
    shakeElement(gameElements.ninjaEnemy);
    showFloatingEffect("#ninja-enemy", `-${dmg}`, "damage");
    triggerOverlayAnimation("#strikeOverlay");
  }, 200);

  appendLogToTicker(`Sovereign Ninja uses <strong>Strike</strong>! Dealt ${dmg} damage to ${BOSSES[currentBossKey].name}.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function handleFireJutsu() {
  const cost = 20 + (game.playerDebuffs.weight ? 5 : 0);
  if (game.playerChakra < cost) return;
  
  triggerFocusEvent(() => {
    game.playerChakra -= cost;
    
    let dmg = Math.floor(Math.random() * (game.fireMaxDmg - game.fireMinDmg + 1)) + game.fireMinDmg;
    if (game.atkMultiplier) {
      dmg = Math.round(dmg * game.atkMultiplier);
    }

    let isCrit = false;
    if (game.perfectFocusActive) {
      isCrit = true;
      const critMul = game.timeOfDayBoost.playerFlameCrit || 1.5;
      dmg = Math.round(dmg * critMul);
    } else if (game.willfireBladeActive && Math.random() < 0.15) {
      isCrit = true;
      const critMul = game.timeOfDayBoost.playerFlameCrit || 1.5;
      dmg = Math.round(dmg * critMul);
    }

    game.enemyHP = Math.max(0, game.enemyHP - dmg);
    playSound('fire');
    checkBossRageTransition();
    
    if (gameElements.ninjaPlayer) {
      gameElements.ninjaPlayer.classList.add("player-attack-dash");
      setTimeout(() => gameElements.ninjaPlayer.classList.remove("player-attack-dash"), 600);
    }
    
    setTimeout(() => {
      shakeElement(gameElements.ninjaEnemy);
      const floatText = isCrit 
        ? (game.perfectFocusActive ? `PERFECT CRIT! -${dmg}` : `CRITICAL! -${dmg}`) 
        : `-${dmg}`;
      const floatType = isCrit ? "damage-crit" : "damage";
      showFloatingEffect("#ninja-enemy", floatText, floatType);
      triggerOverlayAnimation("#willFlameOverlay");
    }, 200);

    const jutsuMsg = isCrit 
      ? `Sovereign Ninja casts <strong>Jutsu: Will Flame</strong>! 💥<strong>CRITICAL HIT!</strong> Dealt ${dmg} fire damage to ${BOSSES[currentBossKey].name}.`
      : `Sovereign Ninja casts <strong>Jutsu: Will Flame</strong>! Dealt ${dmg} fire damage to ${BOSSES[currentBossKey].name}.`;

    appendLogToTicker(jutsuMsg);
    
    if (!checkBattleEnd()) {
      enemyTurn();
    }
  });
}

function handleHealJutsu() {
  const cost = 15 + (game.playerDebuffs.weight ? 5 : 0);
  if (game.playerChakra < cost) return;
  
  triggerFocusEvent(() => {
    game.playerChakra -= cost;
    
    let heal = game.healAmount;
    if (game.timeOfDayBoost.heal) {
      heal = Math.round(heal * game.timeOfDayBoost.heal);
    }
    
    game.playerHP = Math.min(game.playerMaxHP, game.playerHP + heal);
    game.playerShieldActive = true;
    playSound('shield');
    
    triggerOverlayAnimation("#refusalShieldOverlay");
    updateShieldIndicator();
    
    if (game.perfectFocusActive) {
      game.perfectShieldActive = true;
      showFloatingEffect("#ninja-player", `+${heal} (Perfect Shield!)`, "heal");
      appendLogToTicker(`Sovereign Ninja casts <strong>Jutsu: Refusal Shield</strong>! Restored ${heal} HP and raised a <strong>PERFECT SHIELD</strong> (blocks 100% damage next turn!).`);
    } else {
      game.perfectShieldActive = false;
      showFloatingEffect("#ninja-player", `+${heal}`, "heal");
      appendLogToTicker(`Sovereign Ninja casts <strong>Jutsu: Refusal Shield</strong>! Restored ${heal} HP and raised a defensive barrier.`);
    }
    
    if (!checkBattleEnd()) {
      enemyTurn();
    }
  });
}

function handleCharge() {
  const charge = 40;
  game.playerChakra = Math.min(game.playerMaxChakra, game.playerChakra + charge);
  playSound('charge');
  
  triggerOverlayAnimation("#chargeChakraOverlay");
  
  showFloatingEffect("#ninja-player", `+${charge} Chakra`, "chakra-float");
  appendLogToTicker(`Sovereign Ninja charges Chakra! Restored ${charge} energy.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function restartGame() {
  // Initialize Stats
  initDynamicStats();
  
  // Apply Boss HP
  applySelectedBoss();
  
  game.playerShieldActive = game.phoenixResolveActive;
  game.perfectShieldActive = false;
  game.perfectFocusActive = false;
  updateShieldIndicator();
  
  const vignette = document.querySelector("#rageVignette");
  if (vignette) vignette.classList.remove("rage-active");
  
  if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  
  let startLog = `Battle reset. Choose your action to begin the strike against ${BOSSES[currentBossKey].name}!`;
  const activeBuffs = [];
  if (game.phoenixResolveActive) activeBuffs.push("🔥 Phoenix Resolve (+30% ATK, starting shield)");
  if (game.fortressAmuletActive) activeBuffs.push("🛡️ Fortress Amulet (+10% shield absorption)");
  if (game.lotusIncenseActive) activeBuffs.push("🕯️ Lotus Incense (2x Meditation Incense)");
  if (game.willfireBladeActive) activeBuffs.push("⚔️ Willfire Blade (+15% crit chance on Jutsus)");
  
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) activeBuffs.push("☀️ Daytime Boost (+15% heals)");
  if (hour >= 19 || hour < 6) activeBuffs.push("🌙 Nighttime Aura (+10% Boss ATK, +30% Jutsu Crit damage)");

  if (activeBuffs.length > 0) {
    startLog += `<br/><span style="color: var(--accent); font-weight: bold;">Active Talismans/Buffs:</span> ${activeBuffs.join(", ")}`;
  }
  
  appendLogToTicker(startLog);
  updateGameUi();
}

function initGameListeners() {
  gameElements.btnStrike?.addEventListener("click", handleStrike);
  gameElements.btnFireJutsu?.addEventListener("click", handleFireJutsu);
  gameElements.btnHealJutsu?.addEventListener("click", handleHealJutsu);
  gameElements.btnCharge?.addEventListener("click", handleCharge);
  gameElements.btnRestartGame?.addEventListener("click", restartGame);
  
  // Inventory Items Click Listeners
  document.querySelector("#btnUseColdShower")?.addEventListener("click", () => {
    if (game.items.coldShower > 0 && !game.isBattleOver && !game.isEnemyTurn) {
      game.items.coldShower--;
      const healAmount = Math.round(game.playerMaxHP * 0.5);
      game.playerHP = Math.min(game.playerMaxHP, game.playerHP + healAmount);
      
      // Cleanse all debuffs
      game.playerDebuffs = { fog: false, weight: false, bleedTurns: 0 };
      
      playSound('item');
      showFloatingEffect("#ninja-player", `+${healAmount} HP (Cleansed!)`, "heal");
      appendLogToTicker(`Sovereign Ninja uses <strong>Cold Shower Elixir</strong>! Disrupts the urge loop, restores ${healAmount} HP, and <strong>cleanses all debuffs</strong>.`);
      updateGameUi();
    }
  });

  document.querySelector("#btnUsePushUp")?.addEventListener("click", () => {
    if (game.items.pushUp > 0 && !game.isBattleOver && !game.isEnemyTurn) {
      game.items.pushUp--;
      const chakraAmount = 40;
      game.playerChakra = Math.min(game.playerMaxChakra, game.playerChakra + chakraAmount);
      playSound('item');
      showFloatingEffect("#ninja-player", `+${chakraAmount} Chakra`, "chakra-float");
      appendLogToTicker(`Sovereign Ninja uses <strong>Push-Up Scroll</strong>! Diverts blood flow and physical energy, restoring ${chakraAmount} Chakra.`);
      updateGameUi();
    }
  });

  document.querySelector("#btnUseMeditation")?.addEventListener("click", () => {
    if (game.items.meditation > 0 && !game.isBattleOver && !game.isEnemyTurn) {
      game.items.meditation--;
      game.isBossStunned = true;
      playSound('item');
      appendLogToTicker(`Sovereign Ninja uses <strong>Meditation Incense</strong>! Mindfulness pacifies the active urge, <strong>stunning the boss for 1 turn!</strong>`);
      updateGameUi();
    }
  });

  // Boss Select Listener
  const bossSelect = document.querySelector("#bossSelect");
  bossSelect?.addEventListener("change", (e) => {
    currentBossKey = e.target.value;
    restartGame();
  });

  const launchBtn = document.querySelector("#btnLaunchSimulator");
  const closeBtn = document.querySelector("#btnCloseSimulator");
  const fullscreenContainer = document.querySelector("#ninjaSimulatorFullscreenContainer");

  launchBtn?.addEventListener("click", () => {
    if (fullscreenContainer) {
      fullscreenContainer.style.display = "flex";
      if (fullscreenContainer.requestFullscreen) {
        fullscreenContainer.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request rejected:", err);
        });
      } else if (fullscreenContainer.webkitRequestFullscreen) {
        fullscreenContainer.webkitRequestFullscreen();
      }
      restartGame(); // initialize stats and boss HP on opening the arena
      setDynamicGameBackground();
      updateShieldIndicator();
    }
  });

  const closeFullscreenSimulator = () => {
    if (fullscreenContainer) {
      fullscreenContainer.style.display = "none";
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn("Error exiting fullscreen:", err);
        });
      }
    }
  };

  closeBtn?.addEventListener("click", closeFullscreenSimulator);

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && fullscreenContainer && fullscreenContainer.style.display === "flex") {
      closeFullscreenSimulator();
    }
  });

  setDynamicGameBackground();
  updateShieldIndicator();
  initDynamicStats();
  applySelectedBoss();
  updateGameUi();
}

initGameListeners();

// Register PWA Service Worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered successfully'))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}


