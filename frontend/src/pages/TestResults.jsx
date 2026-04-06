import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'

const CONDITION_LABELS = {
  shin_splints: 'Shin splints',
  stress_fracture: 'Stress fracture',
}

function formatCondition(key) {
  if (!key) return '—'
  return CONDITION_LABELS[key] ?? String(key).replace(/_/g, ' ')
}

function riskClass(tier) {
  if (tier === 'high') return 'results-card--high'
  if (tier === 'moderate') return 'results-card--moderate'
  return 'results-card--low'
}

function pct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—'
  return `${Math.round(n * 1000) / 10}%`
}

export function TestResults() {
  const { sessionId } = useAppState()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      navigate('/home', { replace: true })
      return
    }

    let cancelled = false

    async function load() {
      setError('')
      try {
        const res = await api.triage(sessionId)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Could not load triage')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionId, navigate])

  if (!sessionId) {
    return null
  }

  if (error && !data) {
    return (
      <div className="page">
        <p className="form__error">{error}</p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/home')}>
          Back to home
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <p className="page__sub">Loading results…</p>
      </div>
    )
  }

  const tier = data.confidence_tier ?? 'low'

  return (
    <div className="page page--results">
      <h1>Results</h1>
      <article className={`results-card ${riskClass(tier)}`}>
        <h2 className="results-card__heading">Triage summary</h2>
        <dl className="results-card__dl">
          <div>
            <dt>Leading condition</dt>
            <dd>{formatCondition(data.leading_condition)}</dd>
          </div>
          <div>
            <dt>Posterior (leading hypothesis)</dt>
            <dd>{pct(data.leading_probability)}</dd>
          </div>
          {typeof data.severity_score === 'number' ? (
            <div>
              <dt>Severity score (placeholder)</dt>
              <dd>{pct(data.severity_score)}</dd>
            </div>
          ) : null}
          {typeof data.acwr_risk_score === 'number' ? (
            <div>
              <dt>Load risk index (placeholder)</dt>
              <dd>{pct(data.acwr_risk_score)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Confidence</dt>
            <dd className="results-card__tier">{tier}</dd>
          </div>
        </dl>
        <p className="results-card__recommendation">{data.recommendation}</p>
      </article>
      <button type="button" className="btn btn--primary" onClick={() => navigate('/home')}>
        Back to home
      </button>
    </div>
  )
}
