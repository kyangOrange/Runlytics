const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Request failed')
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

export const api = {
  signup: (email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  sessionNew: (userId) =>
    request('/session/new', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  nextQuestion: (sessionId) => request(`/session/${sessionId}/next-question`),
  answer: (sessionId, symptom, answer) =>
    request(`/session/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ symptom, answer }),
    }),
  triage: (sessionId) => request(`/session/${sessionId}/triage`),
}
