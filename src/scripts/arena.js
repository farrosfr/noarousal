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
};

const accountabilityDataElement = document.querySelector("#accountabilityData");
const accountabilityData = parseAccountabilityData(accountabilityDataElement?.textContent);
const fitnessSummaryDataElement = document.querySelector("#fitnessSummaryData");
const fitnessData = parseAccountabilityData(fitnessSummaryDataElement?.textContent);
const streakStartDate = getCurrentStreakStartDate(accountabilityData, startDate);
let myHistoryChart = null;

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

  const fitnessPushUps = fitnessData?.summary?.totalPushUps || 0;
  const fitnessRuns = fitnessData?.summary?.totalRunWalkKm || 0;
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
  const xpInCurrentLevel = Math.round(totalXp % 100);

  if (elements.charLevel) elements.charLevel.textContent = String(level);
  if (elements.charXpText) elements.charXpText.textContent = `${xpInCurrentLevel} / 100 XP`;
  if (elements.charXpBar) elements.charXpBar.style.width = `${xpInCurrentLevel}%`;

  // Shield Integrity
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
  const willpowerBonus = Math.floor(fitnessPushUps / 50);
  const totalWillpower = refusalCount + willpowerBonus;
  
  const fortitudeBonus = Math.floor(fitnessRuns);
  const totalFortitude = currentStreakDays + fortitudeBonus;

  if (elements.attrWillpower) elements.attrWillpower.textContent = String(totalWillpower);
  if (elements.attrFortitude) elements.attrFortitude.textContent = String(totalFortitude);
  if (elements.attrConsistency) elements.attrConsistency.textContent = String(winDays);
  if (elements.attrAccuracy) elements.attrAccuracy.textContent = String(winRate);

  // Render Fitness dashboard UI
  renderFitnessSummary();

  // Unlock Badges dynamically
  unlockBadge("badge-first-step");
  if (currentStreakDays >= 3) unlockBadge("badge-consistent-shield");
  if (currentStreakDays >= 7) unlockBadge("badge-week-of-will");
  if (currentStreakDays >= 10) unlockBadge("badge-double-digits");
  if (currentStreakDays >= 14) unlockBadge("badge-fortress-habit");
  if (currentStreakDays >= 21) unlockBadge("badge-three-weeks");
  if (currentStreakDays >= 30) unlockBadge("badge-monthly-sovereign");
  if (currentStreakDays >= 45) unlockBadge("badge-vanguard-focus");
  if (currentStreakDays >= 60) unlockBadge("badge-habit-breaker");
  if (currentStreakDays >= 90) unlockBadge("badge-quarterly-sovereign");
  if (currentStreakDays >= 120) unlockBadge("badge-golden-shield");
  if (currentStreakDays >= 150) unlockBadge("badge-unshakable-mind");
  if (currentStreakDays >= 180) unlockBadge("badge-half-year");
  if (currentStreakDays >= 200) unlockBadge("badge-crucible");
  if (currentStreakDays >= 250) unlockBadge("badge-deep-discipline");
  if (currentStreakDays >= 300) unlockBadge("badge-anchor-dropped");
  if (currentStreakDays >= 365) unlockBadge("badge-year-one");
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

  // Update Talismans & Phoenix buff UI
  updateEquippedTalismansUi();
  updatePhoenixBuffUi();
}

// Intersection Observer for scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

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

  // Group writing articles by date (YYYY-MM-DD)
  const writingArticles = (fitnessData && Array.isArray(fitnessData.writingArticles)) ? fitnessData.writingArticles : [];
  const articlesByDate = new Map();
  writingArticles.forEach(art => {
    if (art.date) {
      if (!articlesByDate.has(art.date)) {
        articlesByDate.set(art.date, []);
      }
      articlesByDate.get(art.date).push(art);
    }
  });

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

    // Format current date as YYYY-MM-DD to query writing articles
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dayArticles = articlesByDate.get(dateKey) || [];
    const articlesCount = dayArticles.length;

    let dayClass = `calendar-day ${state}`;
    let dayContent = `<span class="day-number">${day}</span>`;
    
    if (state === "win") {
      dayContent += `<span class="day-status-icon">⚔️</span>`;
    } else if (state === "loss") {
      dayContent += `<span class="day-status-icon">💥</span>`;
    }

    if (articlesCount > 0) {
      const titles = dayArticles.map(a => a.title).join(", ");
      dayContent += `<span class="day-writing-indicator" title="Published: ${titles}">📝 ${articlesCount}</span>`;
    }

    let tooltip = state.toUpperCase();
    if (articlesCount > 0) {
      const titles = dayArticles.map(a => `"${a.title}"`).join(", ");
      tooltip += ` (Published: ${titles})`;
    }

    html += `<div class="${dayClass}" title="${tooltip}">${dayContent}</div>`;
  }

  grid.innerHTML = html;
}

function renderFitnessSummary() {
  if (!fitnessData) return;
  const summary = fitnessData.summary || { totalRunWalkKm: 0, totalPushUps: 0, totalArticles: 0, monthlyArticles: 0 };
  
  const runDistanceEl = document.querySelector("#fitRunWalkDistance");
  const pushUpsEl = document.querySelector("#fitPushUpsCount");
  const writingCountEl = document.querySelector("#fitWritingCount");
  
  if (runDistanceEl) runDistanceEl.textContent = (summary.totalRunWalkKm || 0).toFixed(2);
  if (pushUpsEl) pushUpsEl.textContent = String(summary.totalPushUps || 0);
  if (writingCountEl) writingCountEl.textContent = String(summary.totalArticles || 0);
  
  const daily = Array.isArray(fitnessData.daily) ? fitnessData.daily : [];
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  let monthlyRuns = 0;
  let monthlyPushUps = 0;
  daily.forEach((day) => {
    const dayTime = new Date(day.date).getTime();
    if (dayTime >= oneMonthAgo) {
      monthlyRuns += Number(day.runWalkKm || 0);
      monthlyPushUps += Number(day.pushUps || 0);
    }
  });

  // Daily Targets
  const todayRuns = Number(summary.todayRunWalkKm || 0);
  const todayPushUps = Number(summary.todayPushUps || 0);
  const dailyCardioGoal = 2.0; // 2 Km daily
  const dailyPushGoal = 200; // 200 Reps daily

  const dailyCardioBar = document.querySelector("#fitDailyCardioBar");
  const dailyCardioText = document.querySelector("#fitDailyCardioGoalText");
  if (dailyCardioText) {
    dailyCardioText.textContent = `${todayRuns.toFixed(2)} / ${dailyCardioGoal.toFixed(2)} Km`;
  }
  if (dailyCardioBar) {
    const pct = Math.min(100, (todayRuns / dailyCardioGoal) * 100);
    dailyCardioBar.style.width = `${pct}%`;
  }

  const dailyPushBar = document.querySelector("#fitDailyPushBar");
  const dailyPushText = document.querySelector("#fitDailyPushGoalText");
  if (dailyPushText) {
    dailyPushText.textContent = `${todayPushUps} / ${dailyPushGoal} Reps`;
  }
  if (dailyPushBar) {
    const pct = Math.min(100, (todayPushUps / dailyPushGoal) * 100);
    dailyPushBar.style.width = `${pct}%`;
  }

  // Monthly Targets
  const monthlyCardioGoal = 100.0; // 100 Km monthly
  const monthlyPushGoal = 6000; // 6000 Reps monthly
  const monthlyWritingGoal = 10; // 10 Articles monthly
  
  const cardioBar = document.querySelector("#fitMonthlyCardioBar");
  const cardioText = document.querySelector("#fitMonthlyCardioGoalText");
  if (cardioText) {
    cardioText.textContent = `${monthlyRuns.toFixed(2)} / ${monthlyCardioGoal.toFixed(2)} Km`;
  }
  if (cardioBar) {
    const pct = Math.min(100, (monthlyRuns / monthlyCardioGoal) * 100);
    cardioBar.style.width = `${pct}%`;
  }
  
  const pushBar = document.querySelector("#fitMonthlyPushBar");
  const pushText = document.querySelector("#fitMonthlyPushGoalText");
  if (pushText) {
    pushText.textContent = `${monthlyPushUps} / ${monthlyPushGoal} Reps`;
  }
  if (pushBar) {
    const pct = Math.min(100, (monthlyPushUps / monthlyPushGoal) * 100);
    pushBar.style.width = `${pct}%`;
  }

  const writingBar = document.querySelector("#fitMonthlyWritingBar");
  const writingText = document.querySelector("#fitMonthlyWritingGoalText");
  if (writingText) {
    const currentWriting = Number(summary.monthlyArticles || 0);
    writingText.textContent = `${currentWriting} / ${monthlyWritingGoal} Articles`;
  }
  if (writingBar) {
    const currentWriting = Number(summary.monthlyArticles || 0);
    const pct = Math.min(100, (currentWriting / monthlyWritingGoal) * 100);
    writingBar.style.width = `${pct}%`;
  }

  const writingMonthlyCountEl = document.querySelector("#fitWritingMonthlyCount");
  if (writingMonthlyCountEl) {
    writingMonthlyCountEl.textContent = `${summary.monthlyArticles || 0}`;
  }

  const publicationsListEl = document.querySelector("#writingPublicationsList");
  if (publicationsListEl) {
    const articles = Array.isArray(fitnessData.writingArticles) ? fitnessData.writingArticles : [];
    if (articles.length === 0) {
      publicationsListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No articles found since June 6, 2026.</div>`;
    } else {
      publicationsListEl.innerHTML = articles.map(art => `
        <a href="${art.url}" target="_blank" class="publication-item">
          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <span class="pub-title" style="font-weight: 600; color: var(--text); font-size: 0.95rem;">${art.title}</span>
            <span class="pub-date" style="font-size: 0.8rem; color: var(--text-muted);">${art.date}</span>
          </div>
          <span class="pub-link-indicator" style="color: #c084fc; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 4px; white-space: nowrap;">Read ↗</span>
        </a>
      `).join("");
    }
  }

  // Trigger chart render
  renderHistoryChart();
}

function renderHistoryChart() {
  const ctx = document.getElementById("fitnessHistoryChart");
  if (!ctx) return;
  if (typeof window.Chart !== "function") {
    // If Chart.js library isn't fully loaded yet, defer render briefly
    setTimeout(renderHistoryChart, 100);
    return;
  }
  if (!fitnessData || !Array.isArray(fitnessData.daily)) return;

  // Take the last 14 days and sort chronologically (oldest to newest)
  const last14Days = [...fitnessData.daily]
    .slice(0, 14)
    .reverse();

  const labels = last14Days.map(d => {
    if (!d || typeof d.date !== "string") return "";
    const parts = d.date.split("-");
    if (parts.length < 3) return d.date;
    return `${parts[1]}/${parts[2]}`;
  });
  const cardioData = last14Days.map(d => d.runWalkKm || 0);
  const pushUpsData = last14Days.map(d => d.pushUps || 0);

  if (myHistoryChart) {
    try {
      myHistoryChart.data.labels = labels;
      myHistoryChart.data.datasets[0].data = pushUpsData;
      myHistoryChart.data.datasets[1].data = cardioData;
      myHistoryChart.update("none");
      return;
    } catch (err) {
      console.warn("Failed to update chart in-place, rebuilding:", err);
      try {
        myHistoryChart.destroy();
      } catch (_) {}
      myHistoryChart = null;
    }
  }

  const gridColor = "rgba(255, 255, 255, 0.05)";
  const textColor = "#8892b0";

  try {
    myHistoryChart = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Push-ups (Reps)",
            data: pushUpsData,
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            borderColor: "#f59e0b",
            borderWidth: 2,
            borderRadius: 4,
            yAxisID: "yPush",
            type: "bar",
            order: 2
          },
          {
            label: "Cardio (Km)",
            data: cardioData,
            borderColor: "#2dd4bf",
            backgroundColor: "rgba(45, 212, 191, 0.05)",
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointBackgroundColor: "#2dd4bf",
            pointBorderColor: "#0f1318",
            pointHoverBackgroundColor: "#0f1318",
            pointHoverBorderColor: "#2dd4bf",
            yAxisID: "yCardio",
            type: "line",
            order: 1
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: {
                family: "'Space Grotesk Variable', sans-serif",
                weight: "600",
                size: 11
              }
            }
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(15, 19, 24, 0.9)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            titleColor: "#fff",
            bodyColor: textColor,
            titleFont: {
              family: "'Space Grotesk Variable', sans-serif"
            },
            bodyFont: {
              family: "'Space Grotesk Variable', sans-serif"
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: {
                family: "'Space Grotesk Variable', sans-serif"
              }
            }
          },
          yPush: {
            type: "linear",
            position: "left",
            grid: {
              color: gridColor
            },
            ticks: {
              color: "#f59e0b",
              font: {
                family: "'Space Grotesk Variable', sans-serif"
              }
            },
            title: {
              display: true,
              text: "Push-ups (Reps)",
              color: "#f59e0b",
              font: {
                family: "'Space Grotesk Variable', sans-serif",
                weight: "600"
              }
            }
          },
          yCardio: {
            type: "linear",
            position: "right",
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              color: "#2dd4bf",
              font: {
                family: "'Space Grotesk Variable', sans-serif"
              }
            },
            title: {
              display: true,
              text: "Cardio (Km)",
              color: "#2dd4bf",
              font: {
                family: "'Space Grotesk Variable', sans-serif",
                weight: "600"
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize Chart.js history chart:", err);
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
  companion: "none",
  turnCount: 0,
  refusalsThisFight: 0,
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
      
      // Apply Scaling, Rage & Time boosts
      if (game.bossScaleFactor) dmg = Math.round(dmg * game.bossScaleFactor);
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
          if (game.companion === "turtle") absorbRate -= 0.1;
          let shieldDesc = `${Math.round((1 - absorbRate)*100)}% absorbed by Refusal Shield`;
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

      // Apply Scaling, Rage & Time boosts
      if (game.bossScaleFactor) dmg = Math.round(dmg * game.bossScaleFactor);
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
          if (game.companion === "turtle") absorbRate -= 0.1;
          let shieldDesc = `${Math.round((1 - absorbRate)*100)}% absorbed by Refusal Shield`;
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

      // Apply Scaling, Rage & Time boosts
      if (game.bossScaleFactor) dmg = Math.round(dmg * game.bossScaleFactor);
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
          if (game.companion === "turtle") absorbRate -= 0.1;
          let shieldDesc = `${Math.round((1 - absorbRate)*100)}% absorbed by Refusal Shield`;
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

      // Apply Scaling, Rage & Time boosts
      if (game.bossScaleFactor) dmg = Math.round(dmg * game.bossScaleFactor);
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
          if (game.companion === "turtle") absorbRate -= 0.1;
          let shieldDesc = `${Math.round((1 - absorbRate)*100)}% absorbed by Refusal Shield`;
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

      // Apply Scaling, Rage & Time boosts
      if (game.bossScaleFactor) dmg = Math.round(dmg * game.bossScaleFactor);
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
          if (game.companion === "turtle") absorbRate -= 0.1;
          let shieldDesc = `${Math.round((1 - absorbRate)*100)}% absorbed by Refusal Shield`;
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
  let turnLogs = [];
  
  // 1. Process bleeding/debuff damage first
  if (game.playerHP > 0 && game.playerDebuffs.bleedTurns > 0) {
    const bleedDmg = 5;
    game.playerHP = Math.max(0, game.playerHP - bleedDmg);
    playSound('enemy_strike');
    shakeElement(gameElements.ninjaPlayer);
    showFloatingEffect("#ninja-player", `-${bleedDmg} (Bleed)`, "damage");
    turnLogs.push(`Lingering Urge drains ${bleedDmg} HP from Sovereign Ninja!`);
    game.playerDebuffs.bleedTurns--;
    
    if (checkBattleEnd()) return;
  }

  // 2. Companion turn start effects
  if (game.playerHP > 0) {
    if (game.companion === "fox") {
      if (Math.random() < 0.25) {
        const gain = 10;
        game.playerChakra = Math.min(game.playerMaxChakra, game.playerChakra + gain);
        playSound('charge');
        showFloatingEffect("#ninja-player", `+${gain} Chakra`, "chakra-float");
        turnLogs.push(`🦊 <strong>Zen Fox</strong> channels inner peace! Restored ${gain} Chakra.`);
      }
    } else if (game.companion === "crane") {
      if (Math.random() < 0.20) {
        const activeDebuffs = [];
        if (game.playerDebuffs.fog) activeDebuffs.push("fog");
        if (game.playerDebuffs.weight) activeDebuffs.push("weight");
        if (game.playerDebuffs.bleedTurns > 0) activeDebuffs.push("bleed");

        if (activeDebuffs.length > 0) {
          const toCleanse = activeDebuffs[Math.floor(Math.random() * activeDebuffs.length)];
          let cleanedName = "";
          if (toCleanse === "fog") {
            game.playerDebuffs.fog = false;
            cleanedName = "Brain Fog";
          } else if (toCleanse === "weight") {
            game.playerDebuffs.weight = false;
            cleanedName = "Anxiety Weight";
          } else if (toCleanse === "bleed") {
            game.playerDebuffs.bleedTurns = 0;
            cleanedName = "Lingering Urge";
          }
          playSound('item');
          showFloatingEffect("#ninja-player", "CLEANSED!", "heal");
          turnLogs.push(`🦅 <strong>Discipline Crane</strong> cleanses your mind! <strong>${cleanedName}</strong> debuff has been removed.`);
        }
      }
    } else if (game.companion === "wolf") {
      const dmg = 10;
      game.enemyHP = Math.max(0, game.enemyHP - dmg);
      playSound('strike');
      checkBossRageTransition();
      
      shakeElement(gameElements.ninjaEnemy);
      showFloatingEffect("#ninja-enemy", `-${dmg}`, "damage");
      triggerOverlayAnimation("#strikeOverlay");
      
      turnLogs.push(`🐺 <strong>Resolve Wolf</strong> strikes! Dealt ${dmg} bonus damage to ${BOSSES[currentBossKey].name}.`);
      
      if (checkBattleEnd()) return;
    }
  }

  if (turnLogs.length > 0) {
    appendLogToTicker(turnLogs.join("<br/>"));
  } else {
    appendLogToTicker(`Your turn! Choose an action.`);
  }
  
  updateGameUi();
}

function initDynamicStats() {
  const willpower = parseInt(document.querySelector("#attrWillpower")?.textContent || "0", 10);
  const fortitude = parseInt(document.querySelector("#attrFortitude")?.textContent || "0", 10);
  const accuracy = parseFloat(document.querySelector("#attrAccuracy")?.textContent || "100");

  // Base crit chance scales from 5% to 15% based on accuracy
  game.critChance = Math.max(0.05, (accuracy / 100) * 0.15);

  // Sync companion from UI selection dropdown
  const companionSelect = document.querySelector("#companionSelect");
  game.companion = companionSelect ? companionSelect.value : "none";

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
  
  // Dynamic scaling based on player's current attributes
  const willpower = parseInt(document.querySelector("#attrWillpower")?.textContent || "0", 10);
  const fortitude = parseInt(document.querySelector("#attrFortitude")?.textContent || "0", 10);
  
  let levelWeight = 1.0;
  if (currentBossKey === "siren") levelWeight = 0.2;
  else if (currentBossKey === "goliath") levelWeight = 0.5;
  else if (currentBossKey === "leviathan") levelWeight = 0.8;
  else if (currentBossKey === "temptress") levelWeight = 1.1;
  else if (currentBossKey === "archdemon") levelWeight = 1.5;

  const scaleFactor = 1 + (willpower * 0.015 + fortitude * 0.008) * levelWeight;
  game.bossScaleFactor = scaleFactor;

  game.enemyMaxHP = Math.round(boss.maxHP * scaleFactor);
  game.enemyHP = game.enemyMaxHP;
  
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
  if (gameElements.playerHpBar) {
    gameElements.playerHpBar.style.width = `${(game.playerHP / game.playerMaxHP) * 100}%`;
    // Damage flash when HP decreases
    if (gameElements.playerHpBar.dataset.lastWidth && parseFloat(gameElements.playerHpBar.dataset.lastWidth) > (game.playerHP / game.playerMaxHP) * 100) {
      const parent = gameElements.playerHpBar.closest(".bar-bg");
      if (parent) {
        parent.classList.remove("bar-damage-flash");
        parent.offsetHeight;
        parent.classList.add("bar-damage-flash");
      }
    }
    gameElements.playerHpBar.dataset.lastWidth = String((game.playerHP / game.playerMaxHP) * 100);
  }

  if (gameElements.playerChakraText) gameElements.playerChakraText.textContent = `${game.playerChakra}/${game.playerMaxChakra}`;
  if (gameElements.playerChakraBar) {
    gameElements.playerChakraBar.style.width = `${(game.playerChakra / game.playerMaxChakra) * 100}%`;
    if (gameElements.playerChakraBar.dataset.lastWidth && parseFloat(gameElements.playerChakraBar.dataset.lastWidth) < (game.playerChakra / game.playerMaxChakra) * 100) {
      const parent = gameElements.playerChakraBar.closest(".bar-bg");
      if (parent) {
        parent.classList.remove("bar-regen-flash");
        parent.offsetHeight;
        parent.classList.add("bar-regen-flash");
      }
    }
    gameElements.playerChakraBar.dataset.lastWidth = String((game.playerChakra / game.playerMaxChakra) * 100);
  }

  if (gameElements.enemyHpText) gameElements.enemyHpText.textContent = `${game.enemyHP}/${game.enemyMaxHP}`;
  if (gameElements.enemyHpBar) {
    gameElements.enemyHpBar.style.width = `${(game.enemyHP / game.enemyMaxHP) * 100}%`;
  }

  // Top bar boss HP
  const topBarHpBar = document.querySelector("#topBarBossHpBar");
  const topBarHpText = document.querySelector("#topBarBossHpText");
  if (topBarHpBar) topBarHpBar.style.width = `${(game.enemyHP / game.enemyMaxHP) * 100}%`;
  if (topBarHpText) topBarHpText.textContent = `${game.enemyHP}/${game.enemyMaxHP}`;

  const isDisabled = game.isBattleOver || game.isEnemyTurn;
  const fireCost = 20 + (game.playerDebuffs.weight ? 5 : 0);
  const healCost = 15 + (game.playerDebuffs.weight ? 5 : 0);

  // Command buttons with affordability highlighting
  if (gameElements.btnStrike) gameElements.btnStrike.disabled = isDisabled;
  if (gameElements.btnFireJutsu) {
    gameElements.btnFireJutsu.disabled = isDisabled || game.playerChakra < fireCost;
    gameElements.btnFireJutsu.classList.toggle("is-affordable", game.playerChakra >= fireCost && !isDisabled);
  }
  if (gameElements.btnHealJutsu) {
    gameElements.btnHealJutsu.disabled = isDisabled || game.playerChakra < healCost;
    gameElements.btnHealJutsu.classList.toggle("is-affordable", game.playerChakra >= healCost && !isDisabled);
  }
  if (gameElements.btnCharge) {
    gameElements.btnCharge.disabled = isDisabled;
    gameElements.btnCharge.classList.toggle("is-affordable", !isDisabled);
  }
  if (gameElements.btnStrike) gameElements.btnStrike.classList.toggle("is-affordable", !isDisabled);

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
      // Show results card with battle stats
      const resultsScreen = document.querySelector("#resultsCardScreen");
      if (resultsScreen) {
        const xpEl = document.querySelector("#resultsXpGained");
        const refEl = document.querySelector("#resultsRefusals");
        const bossEl = document.querySelector("#resultsBossName");
        const turnsEl = document.querySelector("#resultsTurns");
        const subEl = document.querySelector("#resultsCardSub");
        const boss = BOSSES[currentBossKey];
        const refusalsThisFight = 1;
        if (xpEl) xpEl.textContent = "+0";
        if (refEl) refEl.textContent = String(refusalsThisFight);
        if (bossEl) bossEl.textContent = "Victory";
        if (turnsEl) turnsEl.textContent = String(game.turnCount || 0);
        if (subEl) subEl.textContent = `${boss?.name || "The urge"} has fallen. Sovereign Mind retains control.`;
        resultsScreen.style.display = "flex";
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
      const resultsScreen = document.querySelector("#resultsCardScreen");
      if (resultsScreen) {
        const xpEl = document.querySelector("#resultsXpGained");
        const refEl = document.querySelector("#resultsRefusals");
        const bossEl = document.querySelector("#resultsBossName");
        const turnsEl = document.querySelector("#resultsTurns");
        const subEl = document.querySelector("#resultsCardSub");
        const boss = BOSSES[currentBossKey];
        if (xpEl) xpEl.textContent = "+0";
        if (refEl) refEl.textContent = "0";
        if (bossEl) bossEl.textContent = "Defeat";
        if (turnsEl) turnsEl.textContent = String(game.turnCount || 0);
        if (subEl) subEl.textContent = "The urge overwhelmed your shield. Clear your mind and try again.";
        resultsScreen.style.display = "flex";
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
      overlay.classList.remove("is-fail");
      overlay.classList.add("is-success");
      playSound('focus_success');
      showFloatingEffect("#ninja-player", "PERFECT FOCUS!", "heal");
    } else {
      game.perfectFocusActive = false;
      overlay.classList.remove("is-success");
      overlay.classList.add("is-fail");
      playSound('focus_fail');
      showFloatingEffect("#ninja-player", "MISSED FOCUS", "damage");
    }

    setTimeout(cleanup, 350);
  };

  const cleanup = () => {
    if (activeFocusTimeout) clearTimeout(activeFocusTimeout);
    btnFocus.removeEventListener("click", handleFocusClick);
    overlay.style.display = "none";
    overlay.classList.remove("animating");
    overlay.classList.remove("is-success");
    overlay.classList.remove("is-fail");
    onComplete();
  };

  btnFocus.addEventListener("click", handleFocusClick);

  activeFocusTimeout = setTimeout(() => {
    if (!clicked) {
      clicked = true;
      game.perfectFocusActive = false;
      overlay.classList.remove("is-success");
      overlay.classList.add("is-fail");
      playSound('focus_fail');
      showFloatingEffect("#ninja-player", "MISSED FOCUS", "damage");
      setTimeout(cleanup, 350);
    }
  }, 1100);
}

function handleStrike() {
  if (game.isBattleOver) return;
  game.turnCount++;
  if (game.playerDebuffs.fog && Math.random() < 0.25) {
    playSound('focus_fail');
    showFloatingEffect("#ninja-enemy", "MISS!", "damage-miss");
    appendLogToTicker(`Sovereign Ninja uses <strong>Strike</strong>... but <strong>MISSES</strong> due to Brain Fog!`);
    if (!checkBattleEnd()) {
      enemyTurn();
    }
    return;
  }

  let isCrit = Math.random() < (game.critChance || 0.1);
  let dmg = Math.floor(Math.random() * (game.strikeMaxDmg - game.strikeMinDmg + 1)) + game.strikeMinDmg;
  
  if (isCrit) {
    dmg = Math.round(dmg * 1.5);
  }
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
    const floatText = isCrit ? `CRIT! -${dmg}` : `-${dmg}`;
    const floatType = isCrit ? "damage-crit" : "damage";
    showFloatingEffect("#ninja-enemy", floatText, floatType);
    triggerOverlayAnimation("#strikeOverlay");
  }, 200);

  const strikeMsg = isCrit
    ? `Sovereign Ninja uses <strong>Strike</strong>! 💥<strong>CRITICAL HIT!</strong> Dealt ${dmg} damage to ${BOSSES[currentBossKey].name}.`
    : `Sovereign Ninja uses <strong>Strike</strong>! Dealt ${dmg} damage to ${BOSSES[currentBossKey].name}.`;

  appendLogToTicker(strikeMsg);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function handleFireJutsu() {
  if (game.isBattleOver) return;
  const cost = 20 + (game.playerDebuffs.weight ? 5 : 0);
  if (game.playerChakra < cost) return;
  game.turnCount++;

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
    } else if (game.willfireBladeActive && Math.random() < game.critChance) {
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
  if (game.isBattleOver) return;
  const cost = 15 + (game.playerDebuffs.weight ? 5 : 0);
  if (game.playerChakra < cost) return;
  game.turnCount++;

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
  if (game.isBattleOver) return;
  game.turnCount++;
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

function updateCompanionUi() {
  const container = document.querySelector("#equippedCompanion");
  const iconEl = document.querySelector("#companionIcon");
  const nameEl = document.querySelector("#companionName");
  if (!container) return;

  const comps = {
    fox: { icon: "🦊", name: "Zen Fox" },
    crane: { icon: "🦅", name: "Discipline Crane" },
    wolf: { icon: "🐺", name: "Resolve Wolf" },
    turtle: { icon: "🐢", name: "Patience Turtle" }
  };

  const active = comps[game.companion];
  if (active) {
    if (iconEl) iconEl.textContent = active.icon;
    if (nameEl) nameEl.textContent = active.name;
    container.style.display = "flex";
  } else {
    container.style.display = "none";
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
  game.turnCount = 0;
  game.refusalsThisFight = 0;
  updateShieldIndicator();
  updateCompanionUi();

  const vignette = document.querySelector("#rageVignette");
  if (vignette) vignette.classList.remove("rage-active");

  if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  
  let startLog = `Battle reset. Choose your action to begin the strike against ${BOSSES[currentBossKey].name}!`;
  const activeBuffs = [];
  if (game.companion && game.companion !== "none") {
    const comps = {
      fox: "🦊 Fox (Chakra+)",
      crane: "🦅 Crane (Cleanse)",
      wolf: "🐺 Wolf (Striker)",
      turtle: "🐢 Turtle (Shield+)"
    };
    if (comps[game.companion]) activeBuffs.push(comps[game.companion]);
  }
  if (game.phoenixResolveActive) activeBuffs.push("🔥 Phoenix (+30% ATK, shield)");
  if (game.fortressAmuletActive) activeBuffs.push("🛡️ Fortress (+10% shield)");
  if (game.lotusIncenseActive) activeBuffs.push("🕯️ Lotus (2x Meditate)");
  if (game.willfireBladeActive) activeBuffs.push("⚔️ Willfire (+15% crit)");

  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) activeBuffs.push("☀️ Day (+15% heal)");
  if (hour >= 19 || hour < 6) activeBuffs.push("🌙 Night (+10% Boss, +30% crit)");

  if (activeBuffs.length > 0) {
    startLog += `<br/><span style="color: var(--accent); font-weight: bold;">Active Buffs:</span> ${activeBuffs.join(", ")}`;
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

  // Boss Select Listener (old dropdown - kept for backward compat, but new flow uses boss-select-screen)
  const bossSelect = document.querySelector("#bossSelect");
  bossSelect?.addEventListener("change", (e) => {
    currentBossKey = e.target.value;
    restartGame();
  });

  // Companion Select Listener
  const companionSelect = document.querySelector("#companionSelect");
  companionSelect?.addEventListener("change", (e) => {
    game.companion = e.target.value;
    restartGame();
  });

  const launchBtn = document.querySelector("#btnLaunchSimulator");
  const closeBtn = document.querySelector("#btnCloseSimulator");
  const fullscreenContainer = document.querySelector("#ninjaSimulatorFullscreenContainer");
  const bossSelectScreen = document.querySelector("#bossSelectScreen");
  const combatScreenWrap = document.querySelector("#combatScreenWrap");
  const bossPortraitCards = document.querySelectorAll("[data-boss-card]");
  const companionPortraitCards = document.querySelectorAll("[data-companion-card]");
  const btnBeginBattle = document.querySelector("#btnBeginBattle");
  const btnBackFromBossSelect = document.querySelector("#btnBackFromBossSelect");
  const resultsCardScreen = document.querySelector("#resultsCardScreen");
const btnResultsAgain = document.querySelector("#btnResultsAgain");
  const btnResultsExit = document.querySelector("#btnResultsExit");

  function showBossSelectScreen() {
    if (bossSelectScreen) bossSelectScreen.style.display = "flex";
    if (combatScreenWrap) combatScreenWrap.style.display = "none";
    if (resultsCardScreen) resultsCardScreen.style.display = "none";
    if (gameElements.cinematicVictoryOverlay) gameElements.cinematicVictoryOverlay.style.display = "none";
    if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  }

  function showCombatScreen() {
    if (bossSelectScreen) bossSelectScreen.style.display = "none";
    if (combatScreenWrap) combatScreenWrap.style.display = "flex";
    if (resultsCardScreen) resultsCardScreen.style.display = "none";
    if (gameElements.cinematicVictoryOverlay) gameElements.cinematicVictoryOverlay.style.display = "none";
    if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  }

  function showResultsScreen(stats) {
    if (bossSelectScreen) bossSelectScreen.style.display = "none";
    if (combatScreenWrap) combatScreenWrap.style.display = "none";
    if (resultsCardScreen) {
      resultsCardScreen.style.display = "flex";
      const xpEl = document.querySelector("#resultsXpGained");
      const refEl = document.querySelector("#resultsRefusals");
      const bossEl = document.querySelector("#resultsBossName");
      const turnsEl = document.querySelector("#resultsTurns");
      const subEl = document.querySelector("#resultsCardSub");
      if (xpEl) xpEl.textContent = `+${stats.xpGained}`;
      if (refEl) refEl.textContent = String(stats.refusals);
      if (bossEl) bossEl.textContent = stats.bossName;
      if (turnsEl) turnsEl.textContent = String(stats.turns);
      if (subEl && stats.subMessage) subEl.textContent = stats.subMessage;
    }
  }

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
      showBossSelectScreen();
    }
  });

  // Boss card selection
  bossPortraitCards.forEach((card) => {
    card.addEventListener("click", () => {
      const bossKey = card.getAttribute("data-boss-card");
      bossPortraitCards.forEach((c) => {
        c.classList.remove("is-selected");
        c.setAttribute("aria-checked", "false");
      });
      card.classList.add("is-selected");
      card.setAttribute("aria-checked", "true");
      currentBossKey = bossKey;
    });
  });

  // Companion card selection
  companionPortraitCards.forEach((card) => {
    card.addEventListener("click", () => {
      const companionKey = card.getAttribute("data-companion-card");
      companionPortraitCards.forEach((c) => {
        c.classList.remove("is-selected");
        c.setAttribute("aria-checked", "false");
      });
      card.classList.add("is-selected");
      card.setAttribute("aria-checked", "true");
      game.companion = companionKey;
    });
  });

  // Begin the fight
  btnBeginBattle?.addEventListener("click", () => {
    showCombatScreen();
    restartGame();
    setDynamicGameBackground();
    updateShieldIndicator();
  });

  // Back to arena (from boss select)
  btnBackFromBossSelect?.addEventListener("click", (e) => {
    e.preventDefault();
    closeFullscreenSimulator();
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

  closeBtn?.addEventListener("click", () => {
    // Exit goes back to boss select, not fully exit
    showBossSelectScreen();
  });

  // Results card buttons
  btnResultsAgain?.addEventListener("click", () => {
    showBossSelectScreen();
  });

  btnResultsExit?.addEventListener("click", () => {
    closeFullscreenSimulator();
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && fullscreenContainer && fullscreenContainer.style.display === "flex") {
      // When user exits fullscreen via ESC, close the simulator entirely
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


