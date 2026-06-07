const STORAGE_KEY = "noarousal-state-v1";
const startDate = new Date(document.body.dataset.start);
const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultState = {
  reasons: [
    "Protect attention and energy.",
    "Build discipline that transfers to everything else.",
    "Stop feeding the cue-craving-response loop."
  ],
  checkins: [],
  triggers: [],
  resets: [],
  resisted: 0,
  currentStart: startDate.toISOString()
};

const $ = (selector) => document.querySelector(selector);
const state = loadState();

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultState, ...JSON.parse(stored) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    clock: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  };
}

function riskFromCheckin(checkin) {
  if (!checkin) return { level: "Unknown", reason: "Save today's check-in to calculate risk." };
  const score = Number(checkin.stress) + Number(checkin.urge) + (11 - Number(checkin.sleep));
  if (score >= 22) return { level: "High", reason: "Stress or urge load is elevated today." };
  if (score >= 16) return { level: "Medium", reason: "Use friction before peak risk hours." };
  return { level: "Low", reason: "Maintain the baseline defenses." };
}

function render() {
  const activeStart = new Date(state.currentStart);
  const elapsed = formatDuration(Date.now() - activeStart.getTime());
  $("#streakDays").textContent = `${elapsed.days} day${elapsed.days === 1 ? "" : "s"}`;
  $("#streakClock").textContent = elapsed.clock;

  const today = state.checkins.find((entry) => entry.date === todayKey());
  const risk = riskFromCheckin(today);
  $("#riskLevel").textContent = risk.level;
  $("#riskReason").textContent = risk.reason;
  $("#checkinStatus").textContent = today ? "Complete" : "Open";
  $("#checkinSummary").textContent = today ? `Mood ${today.mood}/10, urge ${today.urge}/10` : "No check-in yet today.";
  $("#resistedCount").textContent = String(state.resisted);

  $("#reasonList").innerHTML = state.reasons
    .map((reason, index) => `<li><span>${escapeHtml(reason)}</span><button type="button" data-remove-reason="${index}" aria-label="Remove reason">×</button></li>`)
    .join("");

  $("#triggerLog").innerHTML = state.triggers.length
    ? state.triggers.slice(0, 8).map(renderTrigger).join("")
    : `<p class="empty-state">No triggers logged yet.</p>`;

  $("#resetLog").innerHTML = state.resets.length
    ? state.resets.slice(0, 6).map(renderReset).join("")
    : `<p class="empty-state">No resets recorded.</p>`;

  renderAnalytics();
}

function renderTrigger(entry) {
  return `<article class="log-entry">
    <strong>${escapeHtml(entry.triggerType)} · ${escapeHtml(entry.outcome)}</strong>
    <span>${new Date(entry.timestamp).toLocaleString()}</span>
    <p>${escapeHtml(entry.context || "No context added.")}</p>
  </article>`;
}

function renderReset(entry) {
  return `<article class="log-entry reset-entry">
    <strong>${new Date(entry.timestamp).toLocaleString()}</strong>
    <p>${escapeHtml(entry.cause || "Reset recorded.")}</p>
    <span>New rule: ${escapeHtml(entry.newRule || "Not specified")}</span>
  </article>`;
}

function renderAnalytics() {
  const triggerCounts = state.triggers.reduce((acc, entry) => {
    acc[entry.triggerType] = (acc[entry.triggerType] || 0) + 1;
    return acc;
  }, {});
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
  const relapses = state.triggers.filter((entry) => entry.outcome === "relapsed").length + state.resets.length;
  const latestCheckin = state.checkins[0];
  $("#analytics").innerHTML = `
    <div><strong>${state.triggers.length}</strong><span>Total triggers</span></div>
    <div><strong>${topTrigger ? escapeHtml(topTrigger[0]) : "None"}</strong><span>Top trigger</span></div>
    <div><strong>${relapses}</strong><span>Reset events</span></div>
    <div><strong>${latestCheckin ? latestCheckin.urge + "/10" : "N/A"}</strong><span>Latest urge</span></div>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

$("#reasonForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#reasonInput");
  const reason = input.value.trim();
  if (!reason) return;
  state.reasons.unshift(reason);
  input.value = "";
  saveState();
});

$("#reasonList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-reason]");
  if (!button) return;
  state.reasons.splice(Number(button.dataset.removeReason), 1);
  saveState();
});

$("#checkinForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const entry = {
    date: todayKey(),
    mood: data.get("mood"),
    stress: data.get("stress"),
    sleep: data.get("sleep"),
    urge: data.get("urge"),
    notes: data.get("notes") || ""
  };
  state.checkins = [entry, ...state.checkins.filter((item) => item.date !== entry.date)];
  saveState();
});

$("#triggerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.triggers.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    triggerType: data.get("triggerType"),
    context: data.get("context") || "",
    outcome: data.get("outcome")
  });
  event.currentTarget.reset();
  saveState();
});

$("#resetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.resets.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    cause: data.get("cause") || "",
    chain: data.get("chain") || "",
    newRule: data.get("newRule") || ""
  });
  state.currentStart = new Date().toISOString();
  event.currentTarget.reset();
  saveState();
});

let timerId = null;
$("#startUrgeTimer").addEventListener("click", () => {
  clearInterval(timerId);
  let remaining = 90;
  $("#urgeTimer").textContent = String(remaining);
  timerId = setInterval(() => {
    remaining -= 1;
    $("#urgeTimer").textContent = String(Math.max(0, remaining));
    if (remaining <= 0) clearInterval(timerId);
  }, 1000);
});

$("#logResisted").addEventListener("click", () => {
  state.resisted += 1;
  state.triggers.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    triggerType: "Urge",
    context: "Emergency urge mode completed.",
    outcome: "resisted"
  });
  saveState();
});

$("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `noarousal-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("#importData").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const imported = JSON.parse(await file.text());
  Object.assign(state, defaultState, imported);
  saveState();
});

setInterval(render, 1000);
render();
