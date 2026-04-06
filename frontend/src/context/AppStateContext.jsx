import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AppStateContext = createContext(null)

const USER_ID_KEY = 'runlytics_user_id'

function readStoredUserId() {
  try {
    const raw = localStorage.getItem(USER_ID_KEY)
    if (raw == null || raw === '') return null
    const n = parseInt(raw, 10)
    return Number.isNaN(n) ? null : n
  } catch {
    return null
  }
}

export function AppStateProvider({ children }) {
  const [userId, setUserId] = useState(readStoredUserId)
  const [sessionId, setSessionId] = useState(null)
  const [sessionProbabilities, setSessionProbabilities] = useState({})

  useEffect(() => {
    if (userId == null) {
      localStorage.removeItem(USER_ID_KEY)
    } else {
      localStorage.setItem(USER_ID_KEY, String(userId))
    }
  }, [userId])

  const value = useMemo(
    () => ({
      userId,
      setUserId,
      sessionId,
      setSessionId,
      sessionProbabilities,
      setSessionProbabilities,
      logout: () => {
        setUserId(null)
        setSessionId(null)
        setSessionProbabilities({})
        localStorage.removeItem(USER_ID_KEY)
      },
    }),
    [userId, sessionId, sessionProbabilities],
  )

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return ctx
}
