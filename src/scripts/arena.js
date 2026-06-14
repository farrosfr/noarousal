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
  if (currentStreakDays >= 14) unlockBadge("badge-fortress-habit");
  if (winRate >= 95 && winDays >= 5) unlockBadge("badge-flawless");
  if (level >= 5) unlockBadge("badge-sovereign-master");

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
if (!Number.isNaN(startDate.getTime())) {
  setInterval(renderArena, 1000);
  renderArena();
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
  isEnemyTurn: false
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

function updateGameUi() {
  if (gameElements.playerHpText) gameElements.playerHpText.textContent = `${game.playerHP}/${game.playerMaxHP}`;
  if (gameElements.playerHpBar) gameElements.playerHpBar.style.width = `${(game.playerHP / game.playerMaxHP) * 100}%`;
  
  if (gameElements.playerChakraText) gameElements.playerChakraText.textContent = `${game.playerChakra}/${game.playerMaxChakra}`;
  if (gameElements.playerChakraBar) gameElements.playerChakraBar.style.width = `${(game.playerChakra / game.playerMaxChakra) * 100}%`;
  
  if (gameElements.enemyHpText) gameElements.enemyHpText.textContent = `${game.enemyHP}/${game.enemyMaxHP}`;
  if (gameElements.enemyHpBar) gameElements.enemyHpBar.style.width = `${(game.enemyHP / game.enemyMaxHP) * 100}%`;
  
  const isDisabled = game.isBattleOver || game.isEnemyTurn;
  if (gameElements.btnStrike) gameElements.btnStrike.disabled = isDisabled;
  if (gameElements.btnFireJutsu) gameElements.btnFireJutsu.disabled = isDisabled || game.playerChakra < 20;
  if (gameElements.btnHealJutsu) gameElements.btnHealJutsu.disabled = isDisabled || game.playerChakra < 15;
  if (gameElements.btnCharge) gameElements.btnCharge.disabled = isDisabled;
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
    setTimeout(() => {
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
        gameElements.overlayResultDesc.textContent = "Shadow urge has been successfully dispelled! Sovereign Mind retains control.";
        gameElements.gameOverOverlay.style.display = "flex";
      }
    };
  }
}

function checkBattleEnd() {
  if (game.enemyHP <= 0) {
    game.isBattleOver = true;
    updateGameUi();
    setTimeout(() => {
      startCinematicVictory();
    }, 800);
    return true;
  }
  
  if (game.playerHP <= 0) {
    game.isBattleOver = true;
    updateGameUi();
    setTimeout(() => {
      if (gameElements.gameOverOverlay) {
        gameElements.overlayResultTitle.textContent = "Defeated!";
        gameElements.overlayResultTitle.style.color = "#ef4444";
        gameElements.overlayResultDesc.textContent = "The urge overwhelmed your shield. Clear your mind and try again!";
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
  
  appendLogToTicker("Shadow Demon is preparing an attack...");
  
  setTimeout(() => {
    const roll = Math.random();
    let dmg = 0;
    let attackName = "";
    let description = "";
    
    if (roll < 0.5) {
      attackName = "Urge Whisper";
      dmg = Math.floor(Math.random() * 7) + 8; // 8 - 14 dmg
      const stolenChakra = Math.min(game.playerChakra, 10);
      game.playerChakra = Math.max(0, game.playerChakra - stolenChakra);
      description = `deals ${dmg} damage and drains ${stolenChakra} Chakra!`;
    } else if (roll < 0.85) {
      attackName = "Crave Strike";
      dmg = Math.floor(Math.random() * 8) + 15; // 15 - 22 dmg
      description = `deals ${dmg} damage!`;
    } else {
      attackName = "Sensory Illusion";
      dmg = Math.floor(Math.random() * 11) + 25; // 25 - 35 dmg
      description = `deals a massive ${dmg} damage!`;
    }
    
    // Trigger enemy dash forward
    if (gameElements.ninjaEnemy) {
      gameElements.ninjaEnemy.classList.add("enemy-attack-dash");
      setTimeout(() => gameElements.ninjaEnemy.classList.remove("enemy-attack-dash"), 600);
    }
    
    setTimeout(() => {
      if (game.playerShieldActive) {
        dmg = Math.round(dmg * 0.5);
        game.playerShieldActive = false;
        description = `deals blocked ${dmg} damage (50% absorbed by Refusal Shield)!`;
        
        // Flash the shield break/impact
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
      appendLogToTicker(`Shadow Demon casts <strong>${attackName}</strong>! It ${description}`);
      
      game.isEnemyTurn = false;
      updateShieldIndicator();
      
      if (!checkBattleEnd()) {
        updateGameUi();
      }
    }, 200);
  }, 1200);
}

function handleStrike() {
  const dmg = Math.floor(Math.random() * 9) + 10; // 10 - 18 dmg
  game.enemyHP = Math.max(0, game.enemyHP - dmg);
  
  // Trigger player dash
  if (gameElements.ninjaPlayer) {
    gameElements.ninjaPlayer.classList.add("player-attack-dash");
    setTimeout(() => gameElements.ninjaPlayer.classList.remove("player-attack-dash"), 600);
  }
  
  setTimeout(() => {
    shakeElement(gameElements.ninjaEnemy);
    showFloatingEffect("#ninja-enemy", `-${dmg}`, "damage");
    triggerOverlayAnimation("#strikeOverlay");
  }, 200);

  appendLogToTicker(`Sovereign Ninja uses <strong>Strike</strong>! Dealt ${dmg} damage to Shadow Demon.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function handleFireJutsu() {
  if (game.playerChakra < 20) return;
  game.playerChakra -= 20;
  
  const dmg = Math.floor(Math.random() * 13) + 24; // 24 - 36 dmg
  game.enemyHP = Math.max(0, game.enemyHP - dmg);
  
  // Trigger player dash
  if (gameElements.ninjaPlayer) {
    gameElements.ninjaPlayer.classList.add("player-attack-dash");
    setTimeout(() => gameElements.ninjaPlayer.classList.remove("player-attack-dash"), 600);
  }
  
  setTimeout(() => {
    shakeElement(gameElements.ninjaEnemy);
    showFloatingEffect("#ninja-enemy", `-${dmg}`, "damage");
    triggerOverlayAnimation("#willFlameOverlay");
  }, 200);

  appendLogToTicker(`Sovereign Ninja casts <strong>Jutsu: Will Flame</strong>! Dealt ${dmg} fire damage to Shadow Demon.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function handleHealJutsu() {
  if (game.playerChakra < 15) return;
  game.playerChakra -= 15;
  
  const heal = 25;
  game.playerHP = Math.min(game.playerMaxHP, game.playerHP + heal);
  game.playerShieldActive = true;
  
  triggerOverlayAnimation("#refusalShieldOverlay");
  updateShieldIndicator();
  
  showFloatingEffect("#ninja-player", `+${heal}`, "heal");
  appendLogToTicker(`Sovereign Ninja casts <strong>Jutsu: Refusal Shield</strong>! Restored ${heal} HP and raised a defensive barrier.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function handleCharge() {
  const charge = 40;
  game.playerChakra = Math.min(game.playerMaxChakra, game.playerChakra + charge);
  
  triggerOverlayAnimation("#chargeChakraOverlay");
  
  showFloatingEffect("#ninja-player", `+${charge} Chakra`, "chakra-float");
  appendLogToTicker(`Sovereign Ninja charges Chakra! Restored ${charge} energy.`);
  
  if (!checkBattleEnd()) {
    enemyTurn();
  }
}

function restartGame() {
  game.playerHP = 100;
  game.playerChakra = 50;
  game.enemyHP = 120;
  game.playerShieldActive = false;
  game.isBattleOver = false;
  game.isEnemyTurn = false;
  
  updateShieldIndicator();
  
  if (gameElements.gameOverOverlay) gameElements.gameOverOverlay.style.display = "none";
  appendLogToTicker("Battle reset. Choose your action to begin the strike!");
  updateGameUi();
}

function initGameListeners() {
  gameElements.btnStrike?.addEventListener("click", handleStrike);
  gameElements.btnFireJutsu?.addEventListener("click", handleFireJutsu);
  gameElements.btnHealJutsu?.addEventListener("click", handleHealJutsu);
  gameElements.btnCharge?.addEventListener("click", handleCharge);
  gameElements.btnRestartGame?.addEventListener("click", restartGame);
  
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
  updateGameUi();
}

initGameListeners();

