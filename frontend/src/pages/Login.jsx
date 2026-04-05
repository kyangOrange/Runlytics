import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'

export function Login() {
  const { setUserId } = useAppState()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      setUserId(data.user_id)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page--narrow">
      <h1>Log in</h1>
      <p className="page__sub">Runlytics diagnostic assistant</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__label">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="form__label">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="form__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="page__footer">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  )
}
