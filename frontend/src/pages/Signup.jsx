import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'
import {
  EQUIPMENT_ACCESS_OPTIONS,
  RUNNING_EXPERIENCE_OPTIONS,
} from '../profileOptions'

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / intersex' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
]

export function Signup() {
  const { setUserId } = useAppState()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [biologicalSex, setBiologicalSex] = useState('female')
  const [priorInjury, setPriorInjury] = useState(false)
  const [equipmentAccess, setEquipmentAccess] = useState('bodyweight')
  const [runningExperience, setRunningExperience] = useState('intermediate')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const ageNum = parseInt(age, 10)
      if (Number.isNaN(ageNum)) {
        setError('Please enter a valid age')
        setLoading(false)
        return
      }
      const data = await api.signup({
        email,
        password,
        display_name: displayName,
        age: ageNum,
        biological_sex: biologicalSex,
        prior_injury_same_area: priorInjury,
        equipment_access: equipmentAccess,
        running_experience: runningExperience,
      })
      setUserId(data.user_id)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page--signup">
      <h1>Sign up</h1>
      <p className="page__sub">
        Account details and a short profile. Profile fields adjust starting probabilities in the
        triage model before any symptoms are entered.
      </p>
      <form className="form form--signup" onSubmit={handleSubmit}>
        <fieldset className="form__fieldset">
          <legend>Account</legend>
          <label className="form__label">
            Name
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <span className="form__hint">Shown in your profile. Not used in the algorithm.</span>
          </label>
          <label className="form__label">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="form__hint">Login only. Not used in the algorithm.</span>
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
        </fieldset>

        <fieldset className="form__fieldset">
          <legend>Profile (affects starting probabilities)</legend>
          <label className="form__label">
            Age
            <input
              type="number"
              min={5}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
            <span className="form__hint">
              Age-sensitive risk (e.g. adolescent runners and bone-stress patterns).
            </span>
          </label>
          <label className="form__label">
            Biological sex
            <select
              value={biologicalSex}
              onChange={(e) => setBiologicalSex(e.target.value)}
              required
            >
              {SEX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="form__hint">
              Used as a prior modifier for stress-fracture probability (population injury
              epidemiology).
            </span>
          </label>
          <div className="form__label form__label--static">Running level</div>
          <div className="form__radio-list" role="group" aria-label="Running level">
            {RUNNING_EXPERIENCE_OPTIONS.map((o) => (
              <label key={o.value} className="form__radio-card">
                <input
                  type="radio"
                  name="running_experience"
                  value={o.value}
                  checked={runningExperience === o.value}
                  onChange={() => setRunningExperience(o.value)}
                />
                <span className="form__radio-card__text">
                  <span className="form__radio-card__title">{o.label}</span>
                  <span className="form__radio-card__desc">{o.description}</span>
                </span>
              </label>
            ))}
          </div>
          <span className="form__hint">
            Used to adjust starting injury-risk priors (novice vs experienced loading patterns).
          </span>
          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={priorInjury}
              onChange={(e) => setPriorInjury(e.target.checked)}
            />
            <span>
              I have had a prior injury to the same area (shin / lower leg)
              <span className="form__hint form__hint--inline">
                Prior episodes raise recurrence risk in the model.
              </span>
            </span>
          </label>
          <div className="form__label form__label--static">Equipment access</div>
          <div className="form__radio-list" role="group" aria-label="Equipment access">
            {EQUIPMENT_ACCESS_OPTIONS.map((o) => (
              <label key={o.value} className="form__radio-card">
                <input
                  type="radio"
                  name="equipment_access"
                  value={o.value}
                  checked={equipmentAccess === o.value}
                  onChange={() => setEquipmentAccess(o.value)}
                />
                <span className="form__radio-card__text">
                  <span className="form__radio-card__title">{o.label}</span>
                  <span className="form__radio-card__desc">{o.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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
