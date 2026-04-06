import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import { TRAINING_LOAD_FIELDS } from '../trainingLoadOptions'

const initialAnswers = () =>
  TRAINING_LOAD_FIELDS.reduce((acc, f) => {
    acc[f.key] = f.options[0].value
    return acc
  }, {})

export function TestIntake() {
  const { userId, sessionId, setSessionId } = useAppState()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState(initialAnswers)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
  }, [userId, sessionId, setSessionId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sessionId) {
      setError('Session not ready yet')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.postTrainingLoad(sessionId, answers)
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
        Placeholder intake for an ACWR-style load signal. Your answers adjust starting injury
        probabilities before the symptom questions.
      </p>

      {starting ? <p className="page__sub">Starting session…</p> : null}
      {error ? <p className="form__error">{error}</p> : null}

      {!starting && sessionId ? (
        <form className="form form--intake" onSubmit={handleSubmit}>
          {TRAINING_LOAD_FIELDS.map((field) => (
            <fieldset key={field.key} className="form__fieldset form__fieldset--intake">
              <legend className="form__fieldset-legend-plain">{field.label}</legend>
              <div className="form__radio-list" role="radiogroup" aria-label={field.label}>
                {field.options.map((o) => (
                  <label key={o.value} className="form__radio-card form__radio-card--compact">
                    <input
                      type="radio"
                      name={field.key}
                      value={o.value}
                      checked={answers[field.key] === o.value}
                      onChange={() => setAnswers((a) => ({ ...a, [field.key]: o.value }))}
                    />
                    <span className="form__radio-card__text">
                      <span className="form__radio-card__title">{o.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
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
