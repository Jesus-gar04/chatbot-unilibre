import { Routes, Route, Navigate } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import useAuthStore from './store/authStore'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public chatbot */}
      <Route path="/" element={<ChatPage />} />

      {/* Admin login */}
      <Route path="/admin" element={<AdminLogin />} />

      {/* Admin dashboard — JWT protected */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to chatbot */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
