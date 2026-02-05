import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { lazy, Suspense } from 'react'

import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'
import AuthCallbackPage from './pages/public/AuthCallbackPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import StudentsPage from './pages/dashboard/StudentsPage'
import OrdersPage from './pages/dashboard/OrdersPage'
import InventoryPage from './pages/dashboard/InventoryPage'
import UserManagementPage from './pages/dashboard/UserManagementPage'
import BudgetSettingsPage from './pages/dashboard/BudgetSettingsPage'
import ReportsPage from './pages/dashboard/ReportsPage'
import ClassBooksPage from './pages/dashboard/ClassBooksPage'
import MyOrdersPage from './pages/dashboard/MyOrdersPage'
import WithdrawalsPage from './pages/dashboard/WithdrawalsPage'
const BookReceiptsPage = lazy(() => import('./pages/dashboard/BookReceiptsPage'))
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import BudgetPage from './pages/admin/BudgetPage'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Route>
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/budget"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <BudgetPage />
          </ProtectedRoute>
        }
      />
      {/* Dashboard */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/budget" element={<BudgetSettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/class-books" element={<ClassBooksPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/withdrawals" element={<WithdrawalsPage />} />
        <Route path="/book-receipts" element={<Suspense fallback={<div className="flex items-center justify-center h-64">กำลังโหลด...</div>}><BookReceiptsPage /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
