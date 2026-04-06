import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAppState } from '../context/AppStateContext'

const SEX_LABELS = {
  female: 'Female',
  male: 'Male',
  other: 'Other / intersex',
  prefer_not_say: 'Prefer not to say',
}

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / intersex' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
]

function formatSex(v) {
  if (v == null) return '—'
  return SEX_LABELS[v] ?? v
}

function profileToForm(p) {
  if (!p) return null
  return {
    display_name: p.display_name ?? '',
    age: p.age != null ? String(p.age) : '',
    biological_sex: p.biological_sex ?? 'prefer_not_say',
    prior_injury_same_area: Boolean(p.prior_injury_same_area),
    equipment_bodyweight_only: p.equipment_bodyweight_only !== false,
  }
}

export function Profile() {
  const { userId, logout } = useAppState()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  const loadProfile = useCallback(async () => {
    if (userId == null) return
    setError('')
    const data = await api.getProfile(userId)
    setProfile(data)
    setForm(profileToForm(data))
  }, [userId])

  useEffect(() => {
    if (userId == null) return
    let cancelled = false
    ;(async () => {
      try {
        await loadProfile()
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load profile')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, loadProfile])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function startEdit() {
    setForm(profileToForm(profile))
    setEditing(true)
    setError('')
  }

  function cancelEdit() {
    setEditing(false)
    setForm(profileToForm(profile))
    setError('')
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!userId || !form) return
    setSaving(true)
    setError('')
    try {
      const ageNum = parseInt(form.age, 10)
      if (Number.isNaN(ageNum)) {
        setError('Please enter a valid age')
        setSaving(false)
        return
      }
      const updated = await api.patchProfile(userId, {
        display_name: form.display_name.trim(),
        age: ageNum,
        biological_sex: form.biological_sex,
        prior_injury_same_area: form.prior_injury_same_area,
        equipment_bodyweight_only: form.equipment_bodyweight_only,
      })
      setProfile(updated)
      setForm(profileToForm(updated))
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page page--profile">
      <header className="profile-header">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => navigate('/home')}>
          ← Home
        </button>
        <div className="profile-header__row">
          <h1>Profile</h1>
          {profile && !editing ? (
            <button type="button" className="btn btn--primary btn--small" onClick={startEdit}>
              Edit
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="form__error">{error}</p> : null}

      {!profile && !error ? <p className="page__sub">Loading…</p> : null}

      {profile && !editing ? (
        <>
          <p className="page__sub">
            Your account details. Use <strong>Edit</strong> to update anything—changes apply the next time
            you start a new assessment.
          </p>
          <dl className="profile-dl">
            <div className="profile-dl__row">
              <dt>Name</dt>
              <dd>{profile.display_name || '—'}</dd>
            </div>
            <div className="profile-dl__row">
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div className="profile-dl__row">
              <dt>Age</dt>
              <dd>{profile.age ?? '—'}</dd>
              <dd className="profile-dl__why">
                Prior modifier for age-sensitive conditions (e.g. stress-fracture risk patterns by age).
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
              <dd>
                {profile.prior_injury_same_area === true
                  ? 'Yes'
                  : profile.prior_injury_same_area === false
                    ? 'No'
                    : '—'}
              </dd>
              <dd className="profile-dl__why">
                Prior modifier for recurrence risk (shin splints and stress injury).
              </dd>
            </div>
            <div className="profile-dl__row">
              <dt>Bodyweight-only preference</dt>
              <dd>
                {profile.equipment_bodyweight_only === true
                  ? 'Yes'
                  : profile.equipment_bodyweight_only === false
                    ? 'No'
                    : '—'}
              </dd>
              <dd className="profile-dl__why">
                For recovery calendar (coming soon): default to bodyweight exercises; equipment options as
                upgrades.
              </dd>
            </div>
          </dl>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>
            Log out
          </button>
        </>
      ) : null}

      {profile && editing && form ? (
        <form className="form profile-edit-form" onSubmit={saveEdit}>
          <p className="page__sub">
            Email can't be changed here. When you save, we’ll update your profile for your next assessment.
          </p>
          <p className="form__muted">
            <strong>Email:</strong> {profile.email}
          </p>
          <label className="form__label">
            Name
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            Age
            <input
              type="number"
              min={5}
              max={120}
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              required
            />
            <span className="form__hint">Prior modifier for age-sensitive conditions.</span>
          </label>
          <label className="form__label">
            Biological sex
            <select
              value={form.biological_sex}
              onChange={(e) => setForm((f) => ({ ...f, biological_sex: e.target.value }))}
              required
            >
              {SEX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="form__hint">Prior modifier for stress-fracture probability.</span>
          </label>
          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={form.prior_injury_same_area}
              onChange={(e) => setForm((f) => ({ ...f, prior_injury_same_area: e.target.checked }))}
            />
            <span>Prior injury to the same area (shin / lower leg)</span>
          </label>
          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={form.equipment_bodyweight_only}
              onChange={(e) => setForm((f) => ({ ...f, equipment_bodyweight_only: e.target.checked }))}
            />
            <span>Prefer bodyweight-only recovery guidance (limited / no gym equipment)</span>
          </label>
          <div className="profile-edit-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={cancelEdit}>
              Cancel
            </button>
          </div>
          <button type="button" className="btn btn--ghost profile-edit-logout" onClick={handleLogout}>
            Log out
          </button>
        </form>
      ) : null}
    </div>
  )
}
