export const BET_CATEGORIES = {
  fitness: { label: 'Fitness', emoji: '🏋️' },
  money: { label: 'Money', emoji: '💰' },
  social: { label: 'Social', emoji: '🎭' },
  wildcard: { label: 'Wildcard', emoji: '🎲' },
} as const

export const QUICK_TEMPLATES = [
  'I will go to the gym 5 days this week',
  'I will not eat fast food for 2 weeks',
  'I will run a 5K this month',
  'I will read 30 minutes every day this week',
  'I will wake up before 7am for 5 days straight',
  'I will drink 8 glasses of water daily for a week',
  'I will not use social media for 3 days',
  'I will meditate every morning this week',
  'I will cook all my meals from scratch this week',
  'I will walk 10,000 steps every day this week',
] as const

export const STAKE_PRESETS = [500, 1000, 2000, 5000] as const

export const REACTION_EMOJIS = ['😭', '💀', '🔥', '🤡', '🫡'] as const

/** Common emojis for group avatars */
export const GROUP_EMOJIS = ['🔥', '💪', '🏆', '⚔️', '🎯', '💎', '🚀', '👑', '🦁', '🐺', '🦅', '⚡'] as const

export const REP_THRESHOLDS = {
  gold: 90,
  green: 70,
} as const

// Competition templates — metricTemplateIdx maps to METRIC_TEMPLATES array in CompetitionCreateScreen
// 0 = 'Who can … the most?', 1 = 'fastest?', 2 = 'least?', 3 = 'Most … wins', 4 = 'Highest … wins'
export const COMPETITION_TEMPLATES = [
  { title: 'Most Gym Sessions This Month', metricTemplateIdx: 3, fill: 'gym sessions' },
  { title: 'Fastest Mile Runner', metricTemplateIdx: 1, fill: 'run a mile' },
  { title: 'Most Steps This Week', metricTemplateIdx: 4, fill: 'step count' },
  { title: 'Least Fast Food This Month', metricTemplateIdx: 2, fill: 'eat fast food' },
  { title: 'Most Books Read This Quarter', metricTemplateIdx: 3, fill: 'books read' },
  { title: 'Most Cold Plunges This Week', metricTemplateIdx: 3, fill: 'cold plunges' },
] as const
