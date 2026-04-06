import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import { ProbabilityChart } from '../components/ProbabilityChart'

export function TestQuestions() {
  const { userId, sessionId, setSessionId } = useAppState()
  const navigate = useNavigate()
  const [probabilities, setProbabilities] = useState({})
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
        const session = await api.sessionNew(userId)
        if (cancelled) return
        setSessionId(session.session_id)
        setProbabilities(session.probabilities ?? {})
        const nq = await api.nextQuestion(session.session_id)
        if (cancelled) return
        if (nq.complete) {
          navigate('/test/results', { replace: true })
          return
        }
        setQuestion({
          text: nq.text,
          symptom: nq.symptom,
          whyAsk: nq.why_ask,
          answerGuide: nq.answer_guide,
        })
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Could not start session')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [userId, setSessionId, navigate])

  async function handleAnswer(answer) {
    if (!sessionId || !question) return
    setAnswering(true)
    setError('')
    try {
      const res = await api.answer(sessionId, question.symptom, answer)
      setProbabilities(res.probabilities ?? {})
      if (res.complete) {
        navigate('/test/results', { replace: true })
        return
      }
      const nq = await api.nextQuestion(sessionId)
      if (nq.complete) {
        navigate('/test/results', { replace: true })
        return
      }
      setQuestion({
        text: nq.text,
        symptom: nq.symptom,
        whyAsk: nq.why_ask,
        answerGuide: nq.answer_guide,
      })
    } catch (e) {
      setError(e.message ?? 'Could not save answer')
    } finally {
      setAnswering(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="page__sub">Starting diagnostic session…</p>
      </div>
    )
  }

  if (error && !question) {
    return (
      <div className="page">
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
      <ProbabilityChart probabilities={probabilities} />
      <div className="question-card">
        <p className="question-card__text">{question?.text}</p>
        {question?.whyAsk ? (
          <p className="question-card__why">
            <span className="question-card__why-label">Why we ask:</span> {question.whyAsk}
          </p>
        ) : null}
        {question?.answerGuide ? (
          <p className="question-card__guide">{question.answerGuide}</p>
        ) : null}
        <div className="question-card__actions">
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
        </div>
      </div>
      {error ? <p className="form__error">{error}</p> : null}
    </div>
  )
}
