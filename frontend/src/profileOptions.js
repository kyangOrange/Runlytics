/** Shared labels for signup + profile (keeps copy in sync). */

export const RUNNING_EXPERIENCE_OPTIONS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Just getting started or not running consistently yet.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Run regularly (e.g., a few times per week) and have a steady routine.',
  },
  {
    value: 'experienced',
    label: 'Experienced',
    description:
      'Have been running consistently for years and may follow structured training or race plans.',
  },
]

export const EQUIPMENT_ACCESS_OPTIONS = [
  {
    value: 'bodyweight',
    label: 'Bodyweight only',
    description:
      'Recovery content will default to exercises you can do without gym equipment (calendar coming soon).',
  },
  {
    value: 'gym',
    label: 'Gym access',
    description: 'You have access to typical gym equipment for optional exercise variations.',
  },
]

export function formatRunningExperience(v) {
  if (v == null) return '—'
  const o = RUNNING_EXPERIENCE_OPTIONS.find((x) => x.value === v)
  return o ? o.label : v
}

export function formatEquipmentAccess(v) {
  if (v === 'bodyweight') return 'Bodyweight only'
  if (v === 'gym') return 'Gym access'
  return '—'
}

export function profileEquipmentAccess(p) {
  if (p?.equipment_access === 'bodyweight' || p?.equipment_access === 'gym') {
    return p.equipment_access
  }
  if (p?.equipment_bodyweight_only === true) return 'bodyweight'
  if (p?.equipment_bodyweight_only === false) return 'gym'
  return 'bodyweight'
}
