import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

export function ProtectedRoute({ children }) {
  const { userId } = useAppState()
  const location = useLocation()

  if (userId == null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
