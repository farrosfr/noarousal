// Shared badge definitions. Used by arena.astro and arena/achievements.astro.
// IDs match the IDs the JS unlocks in achievements.js / arena.js.

export const streakBadges = [
  { id: "first-step", icon: "footprints", title: "First Step", desc: "Start your journey start timestamp", req: "0 Days Clean" },
  { id: "consistent-shield", icon: "gem", title: "Consistent Shield", desc: "Maintain your resolve", req: "3 Days Clean" },
  { id: "week-of-will", icon: "flame", title: "Week of Will", desc: "One full week of strength", req: "7 Days Clean" },
  { id: "double-digits", icon: "hash", title: "Double Digits", desc: "Break into double digit days", req: "10 Days Clean" },
  { id: "fortress-habit", icon: "castle", title: "Fortress of Will", desc: "Discipline becomes a habit", req: "14 Days Clean" },
  { id: "three-weeks", icon: "rotate-cw", title: "Three Weeks", desc: "Mind fog starts to clear", req: "21 Days Clean" },
  { id: "monthly-sovereign", icon: "moon", title: "Monthly Sovereign", desc: "One entire month of control", req: "30 Days Clean" },
  { id: "vanguard-focus", icon: "zap", title: "Vanguard of Focus", desc: "Halfway to the 90 day mark", req: "45 Days Clean" },
  { id: "habit-breaker", icon: "mountain", title: "Habit Breaker", desc: "Brain loops heavily weakened", req: "60 Days Clean" },
  { id: "quarterly-sovereign", icon: "crown", title: "Quarterly Sovereign", desc: "The standard baseline reset", req: "90 Days Clean" },
  { id: "golden-shield", icon: "shield", title: "The Golden Shield", desc: "Sovereignty is firmly established", req: "120 Days Clean" },
  { id: "unshakable-mind", icon: "eye", title: "Unshakable Mind", desc: "Almost half a year of discipline", req: "150 Days Clean" },
  { id: "half-year", icon: "sun", title: "Half Year Zenith", desc: "Complete transformation", req: "180 Days Clean" }
];

export const refusalBadges = [
  { id: "first-refusal", icon: "shield", title: "Shield Activated", desc: "Resist your first urge", req: "1 Refusal" },
  { id: "temptation-blocker", icon: "brick", title: "Temptation Blocker", desc: "Block temptation 5 times", req: "5 Refusals" },
  { id: "shadow-slayer", icon: "swords", title: "Shadow Slayer", desc: "Defeat the shadow 10 times", req: "10 Refusals" },
  { id: "urge-master", icon: "target", title: "Urge Master", desc: "Defeat the shadow 20 times", req: "20 Refusals" },
  { id: "perfect-defender", icon: "shield-half", title: "Perfect Defender", desc: "Defeat the shadow 30 times", req: "30 Refusals" },
  { id: "indomitable", icon: "crown", title: "Indomitable Will", desc: "Defeat the shadow 50 times", req: "50 Refusals" },
  { id: "shield-eternity", icon: "star", title: "Shield of Eternity", desc: "Defeat the shadow 100 times", req: "100 Refusals" }
];

export const performanceBadges = [
  { id: "flawless", icon: "trophy", title: "Flawless Victory", desc: "Maintain 95%+ win rate with 5+ win days", req: "95% WR & 5 W-Days" },
  { id: "absolute-control", icon: "medal", title: "Absolute Control", desc: "Maintain 100% win rate with 14+ win days", req: "100% WR & 14 W-Days" },
  { id: "sovereign-master", icon: "zap", title: "Sovereign Master", desc: "Reach character level 5", req: "Level 5" },
  { id: "grand-champion", icon: "star", title: "Grand Champion", desc: "Reach character level 10", req: "Level 10" },
  { id: "ascendant-sentinel", icon: "flame", title: "Ascendant Sentinel", desc: "Reach character level 15", req: "Level 15" }
];
