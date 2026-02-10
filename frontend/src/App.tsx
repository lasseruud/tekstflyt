import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import WizardLayout from './pages/wizard/WizardLayout'

export default function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext.Provider value={auth}>
      <Toaster position="top-right" />
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="ny" element={<WizardLayout />} />
          <Route path="wizard/:id" element={<WizardLayout />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  )
}
