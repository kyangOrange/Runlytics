import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'

export function Signup() {
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
      const data = await api.signup(email, password)
      setUserId(data.user_id)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page--narrow">
      <h1>Sign up</h1>
      <p className="page__sub">Create a Runlytics account</p>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="form__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="page__footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
