import { useNavigate } from 'react-router-dom'

export function TestAnatomySelector() {
  const navigate = useNavigate()

  return (
    <div className="page page--test">
      <h1>Anatomy selector</h1>
      <p className="page__sub">Placeholder — coming soon.</p>

      <div className="home-actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={() => navigate('/test/intake')}
        >
          Continue
        </button>
        <button type="button" className="btn btn--ghost btn--large" onClick={() => navigate('/home')}>
          Back to home
        </button>
      </div>
    </div>
  )
}

