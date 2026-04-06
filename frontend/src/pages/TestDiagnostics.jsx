import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import { ProbabilityChart } from '../components/ProbabilityChart'
import { DIAGNOSTIC_STEPS } from '../trainingLoadOptions'

export function TestDiagnostics() {
  const { sessionId, sessionProbabilities, setSessionProbabilities } = useAppState()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const current = DIAGNOSTIC_STEPS[step]

  useEffect(() => {
    if (sessionId == null) {
      navigate('/home', { replace: true })
    }
  }, [sessionId, navigate])

  if (!sessionId) {
    return null
  }

  useEffect(() => {
    if (!sessionId || !current || selected == null) return
    let cancelled = false

    async function run() {
      setPreviewing(true)
      try {
        const res = await api.previewDiagnostic(sessionId, {
          test_id: current.testId,
          positive: selected,
        })
        if (!cancelled && res?.probabilities) {
          setSessionProbabilities(res.probabilities)
        }
      } catch {
        // Best-effort preview
      } finally {
        if (!cancelled) setPreviewing(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [selected, sessionId, current?.testId, setSessionProbabilities])

  async function submitDiagnostic() {
    if (!current) return
    if (selected == null) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.postDiagnostic(sessionId, {
        test_id: current.testId,
        positive: selected,
      })
      if (res.probabilities) {
        setSessionProbabilities(res.probabilities)
      }
      const next = step + 1
      if (next >= DIAGNOSTIC_STEPS.length) {
        navigate('/test/results', { replace: true })
        return
      }
      setStep(next)
      setSelected(null)
    } catch (e) {
      setError(e.message ?? 'Could not record result')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--test">
      <h1>Guided checks</h1>
      <p className="page__sub">
        Each answer updates the model using clinical-style likelihoods (stronger weight than the
        earlier symptom questions).
      </p>
      <p className="form__muted">
        Step {step + 1} of {DIAGNOSTIC_STEPS.length}
        {current?.tier != null ? ` · Tier ${current.tier}` : ''}
      </p>

      <ProbabilityChart probabilities={sessionProbabilities} />

      {current ? (
        <div className="question-card diagnostic-card">
          <h2 className="diagnostic-card__title">{current.title}</h2>
          <p className="diagnostic-card__instructions">{current.instructions}</p>
          {current.whyAsk ? (
            <p className="diagnostic-card__why">
              <span className="question-card__why-label">Why we ask:</span> {current.whyAsk}
            </p>
          ) : null}
          <p className="diagnostic-card__prompt">
            {current.prompt ?? 'Does this test match a positive finding for you?'}
          </p>
          <div className="question-card__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting || previewing}
              aria-pressed={selected === true}
              onClick={() => setSelected(true)}
            >
              {current.yesLabel ?? 'Yes'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={submitting || previewing}
              aria-pressed={selected === false}
              onClick={() => setSelected(false)}
            >
              {current.noLabel ?? 'No'}
            </button>
          </div>
          <div className="question-card__actions question-card__actions--footer">
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting || selected == null}
              onClick={submitDiagnostic}
            >
              {submitting ? 'Saving…' : 'Next'}
            </button>
          </div>
          {current.source ? <p className="diagnostic-card__source">{current.source}</p> : null}
        </div>
      ) : null}

      {error ? <p className="form__error">{error}</p> : null}
    </div>
  )
}
