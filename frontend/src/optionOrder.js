/**
 * Symptom questions: "Stays about the same" second-to-last, "Not sure" last.
 * Training load: preserve option order from the field definition; only "not sure" is forced last.
 */

/** Symptom API keys for the baseline choice (second-to-last before not_sure). */
const SYMPTOM_SAME_SECOND_TO_LAST_KEYS = new Set(['stays_same'])

export function optionEntriesNotSureLast(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return []
  const entries = Object.entries(options)
  const notSure = entries.filter(([k]) => k === 'not_sure')
  const same = entries.filter(([k]) => SYMPTOM_SAME_SECOND_TO_LAST_KEYS.has(k))
  const rest = entries.filter(
    ([k]) => k !== 'not_sure' && !SYMPTOM_SAME_SECOND_TO_LAST_KEYS.has(k),
  )
  const ordered = [...rest]
  if (same.length) ordered.push(...same)
  if (notSure.length) ordered.push(...notSure)
  return ordered
}

export function optionsArrayNotSureLast(options) {
  if (!Array.isArray(options)) return []
  const rest = options.filter((o) => o && o.value !== 'not_sure')
  const ns = options.filter((o) => o && o.value === 'not_sure')
  return [...rest, ...ns]
}
