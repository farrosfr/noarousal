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
  { id: "half-year", icon: "sun", title: "Half Year Zenith", desc: "Complete transformation", req: "180 Days Clean" },
  { id: "crucible", icon: "flame", title: "The Crucible", desc: "Two hundred days. Forged in the fire.", req: "200 Days Clean" },
  { id: "deep-discipline", icon: "heart", title: "Deep Discipline", desc: "Boring beats brilliant. The work compounds.", req: "250 Days Clean" },
  { id: "anchor-dropped", icon: "lock", title: "Anchor Dropped", desc: "Three hundred days. The new floor is locked in.", req: "300 Days Clean" },
  { id: "year-one", icon: "award", title: "Year One", desc: "A full revolution. The pattern is set.", req: "365 Days Clean" }
];

export const refusalBadges = [
  { id: "first-refusal", icon: "shield", title: "Shield Activated", desc: "Resist your first urge", req: "1 Refusal" },
  { id: "temptation-blocker", icon: "brick", title: "Temptation Blocker", desc: "Block temptation 5 times", req: "5 Refusals" },
  { id: "shadow-slayer", icon: "swords", title: "Shadow Slayer", desc: "Defeat the shadow 10 times", req: "10 Refusals" },
  { id: "urge-master", icon: "target", title: "Urge Master", desc: "Defeat the shadow 20 times", req: "20 Refusals" },
  { id: "perfect-defender", icon: "shield-half", title: "Perfect Defender", desc: "Defeat the shadow 30 times", req: "30 Refusals" },
  { id: "indomitable", icon: "crown", title: "Indomitable Will", desc: "Defeat the shadow 50 times", req: "50 Refusals" },
  { id: "shield-eternity", icon: "star", title: "Shield of Eternity", desc: "Defeat the shadow 100 times", req: "100 Refusals" },
  { id: "iron-wall", icon: "bookmark", title: "Iron Wall", desc: "One fifty. The reflex is iron.", req: "150 Refusals" },
  { id: "reflex-sharpened", icon: "refresh", title: "Reflex Sharpened", desc: "The refusal is no longer a choice. It's a reflex.", req: "250 Refusals" },
  { id: "refusal-veteran", icon: "award", title: "Refusal Veteran", desc: "Five hundred urges met. Five hundred times no.", req: "500 Refusals" }
];

export const performanceBadges = [
  { id: "flawless", icon: "trophy", title: "Flawless Victory", desc: "Maintain 95%+ win rate with 5+ win days", req: "95% WR & 5 W-Days" },
  { id: "absolute-control", icon: "medal", title: "Absolute Control", desc: "Maintain 100% win rate with 14+ win days", req: "100% WR & 14 W-Days" },
  { id: "sovereign-master", icon: "zap", title: "Sovereign Master", desc: "Reach character level 5", req: "Level 5" },
  { id: "grand-champion", icon: "star", title: "Grand Champion", desc: "Reach character level 10", req: "Level 10" },
  { id: "ascendant-sentinel", icon: "flame", title: "Ascendant Sentinel", desc: "Reach character level 15", req: "Level 15" },
  { id: "iron-will", icon: "flame", title: "Iron Will", desc: "Level twenty. The build is taking shape.", req: "Level 20" },
  { id: "elite-tier", icon: "skull", title: "Elite Tier", desc: "Level twenty-five. The work is the reward.", req: "Level 25" },
  { id: "body-returns", icon: "heart", title: "Body Returns", desc: "Twenty-five pushups. The body is part of the answer.", req: "25 Pushups" },
  { id: "physical-resolve", icon: "dumbbell", title: "Physical Resolve", desc: "Two hundred and fifty pushups. Physical discipline builds mental walls.", req: "250 Pushups" },
  { id: "iron-discipline", icon: "swords", title: "Iron Discipline", desc: "Five hundred pushups. The body follows the mind, the mind follows the resolve.", req: "500 Pushups" },
  { id: "titan-physique", icon: "crown", title: "Titan Physique", desc: "One thousand pushups. A fortress forged through sweat and repetition.", req: "1000 Pushups" },
  { id: "resolve-unbroken", icon: "zap", title: "Resolve Unbroken", desc: "Two thousand five hundred pushups. The rhythm is second nature.", req: "2500 Pushups" },
  { id: "apex-body", icon: "skull", title: "Apex Body", desc: "Five thousand pushups. The body is fully aligned with the mind.", req: "5000 Pushups" },
  { id: "legendary-will", icon: "award", title: "Legendary Will", desc: "Ten thousand pushups. An absolute monument of physical resolve.", req: "10000 Pushups" },
  { id: "first-mile", icon: "footprints", title: "First Mile", desc: "Ten kilometers run or walked total. The journey of a thousand miles begins.", req: "10 Km" },
  { id: "cardio-endurance", icon: "heart", title: "Cardio Endurance", desc: "Fifty kilometers run or walked total. The heart beats strong.", req: "50 Km" },
  { id: "road-warrior", icon: "swords", title: "Road Warrior", desc: "One hundred kilometers run or walked. Carving resolve into the pavement.", req: "100 Km" },
  { id: "marathoner-mind", icon: "crown", title: "Marathoner Mind", desc: "Two hundred and fifty kilometers run or walked. Unyielding stamina.", req: "250 Km" },
  { id: "zenith-runner", icon: "award", title: "Zenith Runner", desc: "Five hundred kilometers run or walked. Transcending physical boundaries.", req: "500 Km" }
];
