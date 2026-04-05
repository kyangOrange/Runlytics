const LABELS = {
  shin_splints: 'Shin splints',
  stress_fracture: 'Stress fracture',
}

function pct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.round(n * 1000) / 10
}

export function ProbabilityChart({ probabilities }) {
  const entries = Object.entries(probabilities || {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="probability-chart">
      <h3 className="probability-chart__title">Condition probabilities</h3>
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
