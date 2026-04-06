const LABELS = {
  shin_splints: 'Shin splints',
  stress_fracture: 'Stress fracture',
}

const CONDITION_ORDER = ['shin_splints', 'stress_fracture']

function pct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.round(n * 1000) / 10
}

function orderedEntries(probabilities) {
  const p = probabilities && typeof probabilities === 'object' ? probabilities : {}
  const seen = new Set()
  const out = []

  for (const k of CONDITION_ORDER) {
    if (k in p) {
      out.push([k, p[k]])
      seen.add(k)
    }
  }

  for (const k of Object.keys(p).sort()) {
    if (!seen.has(k)) out.push([k, p[k]])
  }

  return out
}

export function ProbabilityChart({ probabilities }) {
  // Keep the rows in a stable order; don’t reorder when the leader changes.
  const entries = orderedEntries(probabilities)

  return (
    <div className="probability-chart">
      <h3 className="probability-chart__title">Condition probabilities</h3>
      {entries.length === 0 ? (
        <p className="probability-chart__empty">No model estimates yet.</p>
      ) : null}
      <ul className="probability-chart__list">
        {entries.map(([key, p]) => (
          <li key={key} className="probability-chart__row">
            <div className="probability-chart__label-row">
              <span className="probability-chart__label">
                {LABELS[key] ?? key.replace(/_/g, ' ')}
              </span>
              <span className="probability-chart__pct">{pct(p)}%</span>
            </div>
            <div className="probability-chart__track">
              <div
                className={`probability-chart__fill probability-chart__fill--${key}`}
                style={{ width: `${pct(p)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
