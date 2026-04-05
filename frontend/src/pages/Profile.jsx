import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'

const SEX_LABELS = {
  female: 'Female',
  male: 'Male',
  other: 'Other / intersex',
  prefer_not_say: 'Prefer not to say',
}

function formatSex(v) {
  if (v == null) return '—'
  return SEX_LABELS[v] ?? v
}

export function Profile() {
  const { userId, logout } = useAppState()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userId == null) return
    let cancelled = false
    async function load() {
      setError('')
      try {
        const data = await api.getProfile(userId)
        if (!cancelled) setProfile(data)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load profile')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page page--profile">
      <header className="profile-header">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => navigate('/home')}>
          ← Home
        </button>
        <h1>Profile</h1>
      </header>

      {error ? <p className="form__error">{error}</p> : null}

      {!profile && !error ? <p className="page__sub">Loading…</p> : null}

      {profile ? (
        <>
          <p className="page__sub">
            What you entered at signup. Fields marked “model” adjust starting probabilities before
            symptom questions.
          </p>
          <dl className="profile-dl">
            <div className="profile-dl__row">
              <dt>Name</dt>
              <dd>{profile.display_name || '—'}</dd>
              <dd className="profile-dl__why">Account only — not used in the algorithm.</dd>
            </div>
            <div className="profile-dl__row">
              <dt>Email</dt>
              <dd>{profile.email}</dd>
              <dd className="profile-dl__why">Account only — not used in the algorithm.</dd>
            </div>
            <div className="profile-dl__row">
              <dt>Age</dt>
              <dd>{profile.age ?? '—'}</dd>
              <dd className="profile-dl__why">
                Prior modifier for age-sensitive conditions (e.g. stress-fracture risk patterns by
                age).
              </dd>
            </div>
            <div className="profile-dl__row">
              <dt>Biological sex</dt>
              <dd>{formatSex(profile.biological_sex)}</dd>
              <dd className="profile-dl__why">
                Prior modifier for stress-fracture probability (population running-injury data).
              </dd>
            </div>
            <div className="profile-dl__row">
              <dt>Prior injury (same area)</dt>
              <dd>{profile.prior_injury_same_area === true ? 'Yes' : profile.prior_injury_same_area === false ? 'No' : '—'}</dd>
              <dd className="profile-dl__why">
                Prior modifier for recurrence risk (shin splints and stress injury).
              </dd>
            </div>
            <div className="profile-dl__row">
              <dt>Bodyweight-only preference</dt>
              <dd>{profile.equipment_bodyweight_only === true ? 'Yes' : profile.equipment_bodyweight_only === false ? 'No' : '—'}</dd>
              <dd className="profile-dl__why">
                For recovery calendar (coming soon): default to bodyweight exercises; equipment
                options as upgrades. Does not change triage math today.
              </dd>
            </div>
          </dl>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>
            Log out
          </button>
        </>
      ) : null}
    </div>
  )
}
