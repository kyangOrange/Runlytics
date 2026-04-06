import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import { ProbabilityChart } from '../components/ProbabilityChart'
import { TRAINING_LOAD_FIELDS } from '../trainingLoadOptions'
import { optionsArrayNotSureLast } from '../optionOrder'

const initialAnswers = () =>
  TRAINING_LOAD_FIELDS.reduce((acc, f) => {
    acc[f.key] = f.multi ? [] : f.options[0].value
    return acc
  }, {})

export function TestIntake() {
  const {
    userId,
    sessionId,
    sessionProbabilities,
    setSessionId,
    setSessionProbabilities,
  } = useAppState()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState(initialAnswers)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionId || starting) return

    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const payload = { ...answers }
        if (Array.isArray(payload.surface_change_types)) {
          payload.surface_change_types = payload.surface_change_types.join(',')
        }
        const res = await api.previewTrainingLoad(sessionId, payload)
        if (!cancelled && res?.probabilities) {
          setSessionProbabilities(res.probabilities)
        }
      } catch {
        // Preview is best-effort; ignore validation/network errors here.
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [answers, sessionId, starting, setSessionProbabilities])

  useEffect(() => {
    if (userId == null) return

    let cancelled = false

    async function startSession() {
      setError('')
      setStarting(true)
      try {
        if (sessionId) {
          if (!cancelled) setStarting(false)
          return
        }
        const session = await api.sessionNew(userId)
        if (cancelled) return
        setSessionId(session.session_id)
        setSessionProbabilities(session.probabilities ?? {})
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Could not start session')
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    startSession()
    return () => {
      cancelled = true
    }
  }, [userId, sessionId, setSessionId, setSessionProbabilities])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sessionId) {
      setError('Session not ready yet')
      return
    }
    const payload = { ...answers }
    if (Array.isArray(payload.surface_change_types)) {
      payload.surface_change_types = payload.surface_change_types.join(',')
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.postTrainingLoad(sessionId, payload)
      setSessionProbabilities(res.probabilities ?? {})
      navigate('/test/questions', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Could not save training load')
    } finally {
      setSubmitting(false)
    }
  }

  if (userId == null) {
    return null
  }

  return (
    <div className="page page--test page--intake">
      <h1>Training load</h1>
      <p className="page__sub">
        Your training pattern adjusts starting injury probabilities before the symptom questions.
        Each section explains why we ask.
      </p>

      {starting ? <p className="page__sub">Starting session…</p> : null}
      {error ? <p className="form__error">{error}</p> : null}

      {!starting && sessionId ? (
        <ProbabilityChart probabilities={sessionProbabilities} />
      ) : null}

      {!starting && sessionId ? (
        <form className="form form--intake" onSubmit={handleSubmit}>
          {TRAINING_LOAD_FIELDS.map((field) => {
            const dep = field.dependsOn
            if (dep && answers[dep.key] !== dep.value) return null
            return (
            <fieldset key={field.key} className="form__fieldset form__fieldset--intake">
              <legend className="form__fieldset-legend-plain">{field.label}</legend>
              {field.whyAsk ? (
                <p className="form__fieldset-why">{field.whyAsk}</p>
              ) : null}
              <div className="form__radio-list" role="radiogroup" aria-label={field.label}>
                {optionsArrayNotSureLast(field.options).map((o) => {
                  const checked = field.multi
                    ? (answers[field.key] || []).includes(o.value)
                    : answers[field.key] === o.value
                  return (
                    <label key={o.value} className="form__radio-card form__radio-card--compact">
                      <input
                        type={field.multi ? 'checkbox' : 'radio'}
                        name={field.key}
                        value={o.value}
                        checked={checked}
                        onChange={() => {
                          if (!field.multi) {
                            setAnswers((a) => {
                              // If they toggle surface_changed away from yes, clear the dependent multi-select.
                              if (field.key === 'surface_changed' && o.value !== 'yes') {
                                return { ...a, [field.key]: o.value, surface_change_types: [] }
                              }
                              return { ...a, [field.key]: o.value }
                            })
                            return
                          }
                          setAnswers((a) => {
                            const cur = Array.isArray(a[field.key]) ? a[field.key] : []
                            const next = cur.includes(o.value)
                              ? cur.filter((v) => v !== o.value)
                              : [...cur, o.value]
                            return { ...a, [field.key]: next }
                          })
                        }}
                      />
                      <span className="form__radio-card__text">
                        <span className="form__radio-card__title">{o.label}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )})}
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue to questions'}
          </button>
        </form>
      ) : null}

      {!starting && !sessionId ? (
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/home')}>
          Back to home
        </button>
      ) : null}
    </div>
  )
}
