/** Must match `scoring.py` / POST /session/<id>/training-load allowed values. */

export const TRAINING_LOAD_FIELDS = [
  {
    key: 'weekly_volume_trend',
    label: 'Typical weekly running volume (last few weeks)',
    options: [
      { value: 'decreasing', label: 'Trending down' },
      { value: 'stable', label: 'About the same' },
      { value: 'increasing', label: 'Trending up' },
    ],
  },
  {
    key: 'volume_last_7_vs_usual',
    label: 'Volume in the last 7 days vs your usual',
    options: [
      { value: 'less', label: 'Less than usual' },
      { value: 'same', label: 'Similar to usual' },
      { value: 'more', label: 'Somewhat more' },
      { value: 'much_more', label: 'Much more' },
    ],
  },
  {
    key: 'hard_sessions_last_week',
    label: 'Hard or long runs in the last week (placeholder categories)',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'One' },
      { value: '2', label: 'Two' },
      { value: '3_plus', label: 'Three or more' },
    ],
  },
  {
    key: 'sudden_training_change',
    label: 'Sudden change in training (surface, shoes, intensity, etc.)',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
    ],
  },
]

export const DIAGNOSTIC_STEPS = [
  {
    testId: 'hop_single_leg',
    title: 'Single-leg hop (placeholder)',
    instructions:
      'Instructions will be finalized with a clinician. For now: imagine hopping on the sore leg ' +
      'once with a soft landing. We only record whether you would expect noticeable shin pain.',
  },
  {
    testId: 'shin_bone_palpation',
    title: 'Shin palpation along bone (placeholder)',
    instructions:
      'Placeholder: gentle pressure along the tibia. Answer based on whether focal bone tenderness ' +
      'matches your usual soreness pattern.',
  },
  {
    testId: 'morning_stiffness_first_steps',
    title: 'Morning or first-steps pain (placeholder)',
    instructions:
      'Placeholder: consider pain with the first steps after rest or in the morning compared with ' +
      'how it feels after you have been moving.',
  },
]
