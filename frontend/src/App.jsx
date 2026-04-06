import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStateProvider, useAppState } from './context/AppStateContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Home } from './pages/Home'
import { TestAnatomySelector } from './pages/TestAnatomySelector'
import { TestIntake } from './pages/TestIntake'
import { TestQuestions } from './pages/TestQuestions'
import { TestDiagnostics } from './pages/TestDiagnostics'
import { TestResults } from './pages/TestResults'
import { Profile } from './pages/Profile'
import './App.css'

function RootRedirect() {
  const { userId } = useAppState()
  return <Navigate to={userId != null ? '/home' : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test/anatomy"
        element={
          <ProtectedRoute>
            <TestAnatomySelector />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test/intake"
        element={
          <ProtectedRoute>
            <TestIntake />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test/questions"
        element={
          <ProtectedRoute>
            <TestQuestions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test/diagnostics"
        element={
          <ProtectedRoute>
            <TestDiagnostics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test/results"
        element={
          <ProtectedRoute>
            <TestResults />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <AppRoutes />
      </AppStateProvider>
    </BrowserRouter>
  )
}
