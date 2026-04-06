import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import { ProbabilityChart } from '../components/ProbabilityChart'

export function TestQuestions() {
  const { userId, sessionId, sessionProbabilities, setSessionProbabilities } = useAppState()
  const navigate = useNavigate()
  const [question, setQuestion] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [answering, setAnswering] = useState(false)

  useEffect(() => {
    if (userId == null) return

    let cancelled = false

    async function init() {
      setError('')
      setLoading(true)
      try {
        if (!sessionId) {
          if (!cancelled) navigate('/test/intake', { replace: true })
          return
        }
        const nq = await api.nextQuestion(sessionId)
        if (cancelled) return
        if (nq.probabilities) {
          setSessionProbabilities(nq.probabilities)
        }
        if (nq.complete) {
          navigate('/test/diagnostics', { replace: true })
          return
        }
        setQuestion({
          text: nq.text,
          symptom: nq.symptom,
          whyAsk: nq.why_ask,
          options: nq.options ?? null,
        })
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Could not load questions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [userId, sessionId, navigate, setSessionProbabilities])

  async function handleAnswer(answer) {
    if (!sessionId || !question) return
    setAnswering(true)
    setError('')
    try {
      const res = await api.answer(sessionId, question.symptom, answer)
      if (res.probabilities) {
        setSessionProbabilities(res.probabilities)
      }
      if (res.complete) {
        navigate('/test/diagnostics', { replace: true })
        return
      }
      const nq = await api.nextQuestion(sessionId)
      if (nq.probabilities) {
        setSessionProbabilities(nq.probabilities)
      }
      if (nq.complete) {
        navigate('/test/diagnostics', { replace: true })
        return
      }
      setQuestion({
        text: nq.text,
        symptom: nq.symptom,
        whyAsk: nq.why_ask,
        options: nq.options ?? null,
      })
    } catch (e) {
      setError(e.message ?? 'Could not save answer')
    } finally {
      setAnswering(false)
    }
  }

  if (loading) {
    return (
      <div className="page page--test">
        <h1>Questions</h1>
        <ProbabilityChart probabilities={sessionProbabilities} />
        <p className="page__sub">Loading questions…</p>
      </div>
    )
  }

  if (error && !question) {
    return (
      <div className="page page--test">
        <h1>Questions</h1>
        <ProbabilityChart probabilities={sessionProbabilities} />
        <p className="form__error">{error}</p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/home')}>
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="page page--test">
      <h1>Questions</h1>
      <ProbabilityChart probabilities={sessionProbabilities} />
      <div className="question-card">
        <p className="question-card__text">{question?.text}</p>
        {question?.whyAsk ? (
          <p className="question-card__why">
            <span className="question-card__why-label">Why we ask:</span> {question.whyAsk}
          </p>
        ) : null}
        <div
          className={
            question?.options
              ? 'question-card__actions question-card__actions--stack'
              : 'question-card__actions'
          }
        >
          {question?.options ? (
            Object.entries(question.options).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn btn--ghost question-card__option-btn"
                disabled={answering || !question}
                onClick={() => handleAnswer(value)}
              >
                {label}
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                className="btn btn--primary"
                disabled={answering || !question}
                onClick={() => handleAnswer(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={answering || !question}
                onClick={() => handleAnswer(false)}
              >
                No
              </button>
            </>
          )}
        </div>
      </div>
      {error ? <p className="form__error">{error}</p> : null}
    </div>
  )
}
