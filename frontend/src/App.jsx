import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

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
import BookReceiptsPage from './pages/dashboard/BookReceiptsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import BudgetPage from './pages/admin/BudgetPage'
import BookReceiptsPageNew from './pages/dashboard/BookReceiptsPageNew'
import BookReceiptsPage1 from './pages/dashboard/BookReceiptsPage1'
import BookReceiptsPageNew1 from './pages/dashboard/BookReceiptsPageNew1'
import BookReceiptsPageNew2 from './pages/dashboard/BookReceiptsPageNew2'
import BookReceiptsPageNew3 from './pages/dashboard/BookReceiptsPageNew3'
import InventoryPage1 from './pages/dashboard/InventoryPage1'
import InventoryPage2 from './pages/dashboard/InventoryPage2'
import InventoryPage3 from './pages/dashboard/InventoryPage3'
import SettingDoc from './pages/dashboard/settingdoc'
import WithdrawalsPage11 from './pages/dashboard/WithdrawalsPage11'
import BookReceiptsPageNew4 from './pages/dashboard/BookReceiptsPageNew4'
import BookReceiptsPageNew5 from './pages/dashboard/BookReceiptsPageNew5'
import SettingDoc1 from './pages/dashboard/settingdoc1'
import OrdersPage1 from './pages/dashboard/OrdersPage1'

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
        <Route path="/orders" element={<OrdersPage1 />} />
        <Route path="/inventory" element={<InventoryPage3 />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/budget" element={<BudgetSettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/class-books" element={<ClassBooksPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/withdrawals" element={<WithdrawalsPage11/>} />
        <Route path="/settingdoc" element={<SettingDoc1/>} />
        <Route path="/book-receipts" element={<BookReceiptsPageNew5 />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
