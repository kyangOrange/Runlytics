import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

export function Home() {
  const { logout, setSessionId } = useAppState()
  const navigate = useNavigate()

  function startTest() {
    setSessionId(null)
    navigate('/test/intake')
  }

  return (
    <div className="page page--home">
      <header className="home-header">
        <span className="home-header__brand">Runlytics</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          title="Account / log out"
          aria-label="Log out"
        >
          <svg
            className="icon-btn__svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </header>
      <h1>Home</h1>
      <p className="page__sub">What would you like to do?</p>
      <div className="home-actions">
        <button type="button" className="btn btn--primary btn--large" onClick={startTest}>
          Start New Test
        </button>
        <button type="button" className="btn btn--ghost btn--large" disabled title="Coming soon">
          Calendar
        </button>
        <button type="button" className="btn btn--ghost btn--large" disabled title="Coming soon">
          Methodology
        </button>
      </div>
      <p className="page__hint">Calendar and Methodology are placeholders for now.</p>
    </div>
  )
}
