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
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const current = DIAGNOSTIC_STEPS[step]

  useEffect(() => {
    if (sessionId == null) {
      navigate('/home', { replace: true })
    }
  }, [sessionId, navigate])

  if (!sessionId) {
    return null
  }

  async function submitDiagnostic(positive) {
    if (!current) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.postDiagnostic(sessionId, {
        test_id: current.testId,
        positive,
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
              disabled={submitting}
              onClick={() => submitDiagnostic(true)}
            >
              {current.yesLabel ?? 'Yes'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={submitting}
              onClick={() => submitDiagnostic(false)}
            >
              {current.noLabel ?? 'No'}
            </button>
          </div>
          {current.source ? <p className="diagnostic-card__source">{current.source}</p> : null}
        </div>
      ) : null}

      {error ? <p className="form__error">{error}</p> : null}
    </div>
  )
}
