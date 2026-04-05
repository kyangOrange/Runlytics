import { createContext, useContext, useMemo, useState } from 'react'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  const value = useMemo(
    () => ({
      userId,
      setUserId,
      sessionId,
      setSessionId,
      logout: () => {
        setUserId(null)
        setSessionId(null)
      },
    }),
    [userId, sessionId],
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
