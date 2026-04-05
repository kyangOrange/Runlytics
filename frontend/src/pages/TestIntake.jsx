import { useNavigate } from 'react-router-dom'

export function TestIntake() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h1>Intake</h1>
      <p className="page__sub">
        This step will collect more context in a future version. For now, continue to the
        questionnaire.
      </p>
      <button type="button" className="btn btn--primary" onClick={() => navigate('/test/questions')}>
        Next
      </button>
    </div>
  )
}
