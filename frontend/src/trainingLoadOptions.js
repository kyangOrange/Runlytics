/** Field keys and option values must match `scoring.py` (TRAINING_LOAD_KEYS / _TRAINING_VALUE_SETS). */

export const TRAINING_LOAD_FIELDS = [
  {
    key: 'days_per_week_typical',
    label: 'How many days per week do you typically run?',
    whyAsk:
      'How often you run sets your baseline exposure to load. The same weekly jump in mileage means something different for someone who runs twice a week versus most days, so we use this to put your other answers in context — not to judge how much you run.',
    options: [
      { value: 'd1_2', label: '1–2 days' },
      { value: 'd3_4', label: '3–4 days' },
      { value: 'd5_6', label: '5–6 days' },
      { value: 'every_day', label: 'Every day' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'volume_this_week_vs_usual',
    label: 'Compared to a typical week for you, how much did you run this week?',
    whyAsk:
      'Weekly volume is a core part of training load. Research consistently links sharp increases versus your own usual week to higher overuse injury risk — so we compare this week to what is normal for you, not to other runners.',
    options: [
      { value: 'less_or_same', label: 'Less than usual or roughly the same as usual' },
      { value: 'bit_more', label: 'Slightly more than usual (increase of 10% or less)' },
      { value: 'significantly_more', label: 'Significantly more than usual (increase of over 10%)' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'longest_run_vs_recent_max',
    label: 'Compared to your longest run in the past month, how did your longest run this week compare?',
    whyAsk:
      'Research shows that doing a single run significantly longer than your recent longest run is one of the strongest predictors of overuse injury — often more than small weekly mileage increases alone. This question targets that spike.',
    options: [
      { value: 'same_or_shorter', label: 'Shorter than usual or roughly the same as usual' },
      {
        value: 'little_longer',
        label: 'Slightly longer than my usual longest run (increase of 10% or less)',
      },
      {
        value: 'significantly_longer',
        label: 'Significantly more than my usual longest run (increase of over 10%)',
      },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'recent_running_trend',
    label: 'Over the past few weeks, how has your running been changing?',
    whyAsk:
      'The shape of your load matters: a sudden jump in the last week or two is harder for bones, tendons, and muscles to adapt to than a slow, gradual build. We ask about trend separately from this week’s volume so both patterns can inform risk.',
    options: [
      {
        value: 'stable_or_decreasing',
        label: 'Staying about the same or decreasing',
      },
      { value: 'gradual_increase', label: 'Gradually increasing (increase of 10% or less)' },
      { value: 'jumped_up', label: 'Jumped up suddenly in the last week or two' },
      { value: 'inconsistent', label: 'Very inconsistent' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'surface_changed',
    label: 'Have you changed the type of surfaces you run on recently?',
    whyAsk:
      'Harder surfaces (like concrete), uneven ground, or frequent switching can change impact and how your legs absorb load. If that changed at the same time as mileage or long-run length, combined stress can be higher — so we ask about surfaces on its own.',
    options: [
      { value: 'no', label: 'No — I’ve been running on the same types of surfaces as usual' },
      { value: 'yes', label: 'Yes' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'surface_change_types',
    label: 'If yes, how did it change? (Select all that apply)',
    dependsOn: { key: 'surface_changed', value: 'yes' },
    multi: true,
    options: [
      {
        value: 'harder_surfaces',
        label:
          'Yes — I’ve been running on harder surfaces (like concrete or pavement) more than usual',
      },
      {
        value: 'more_uneven',
        label:
          'Yes — I’ve been running on more uneven ground (like hills or natural trails) than usual',
      },
      {
        value: 'inconsistent_surfaces',
        label: 'Yes — I’ve been switching between different surfaces inconsistently',
      },
    ],
  },
]

/**
 * Guided diagnostics — testId must match `DIAGNOSTIC_SYMPTOM_KEYS` in app.py.
 * Likelihoods live in `bayesian_engine.py` (per-condition P(positive | condition)).
 */
export const DIAGNOSTIC_STEPS = [
  {
    testId: 'positive_hop_test',
    title: 'Single-leg hop test',
    tier: 1,
    instructions:
      'Stand on the affected leg only. Try to hop in place. Report whether this reproduces or worsens your pain.',
    whyAsk:
      'This is a validated clinical test for stress fracture screening. Reproducing pain with this test is a strong warning signal.',
    prompt: 'Does hopping on the affected leg reproduce or worsen your pain?',
    yesLabel: 'Yes — hop reproduces pain',
    noLabel: 'No',
    source: 'Nussbaum et al., J Clin Biomech 1998. Sensitivity ~70%.',
  },
  {
    testId: 'point_tenderness_palpation',
    title: 'Pinpoint palpation test',
    tier: 2,
    instructions:
      'Press firmly with one finger directly on the most painful spot on the bone. Does pressing reproduce the exact pain?',
    whyAsk:
      'Focal bone tenderness reproduced by direct pressure is a high-specificity indicator of stress fracture.',
    prompt: 'Does pinpoint pressure on the worst spot reproduce that exact pain?',
    yesLabel: 'Yes — palpation reproduces pain',
    noLabel: 'No',
    source: 'Clinical consensus — high specificity for focal bone injury.',
  },
  {
    testId: 'pain_improves_with_warmup',
    title: 'Warmup response check',
    tier: 2,
    instructions:
      'Think back to your last run. Did the pain improve after the first 10–15 minutes, stay the same, or get worse?',
    whyAsk:
      'Shin splints typically improve with warmup. Stress fractures typically do not — pain stays or worsens.',
    prompt: 'Did your pain improve after the first 10–15 minutes of running?',
    yesLabel: 'Yes — pain improved with warmup',
    noLabel: 'No — same or worse',
    source: 'Clinical differentiation consensus — BJSM and Clinical Journal of Sport Medicine.',
  },
]
