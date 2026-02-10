import { Routes, Route } from 'react-router-dom'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  )
}
