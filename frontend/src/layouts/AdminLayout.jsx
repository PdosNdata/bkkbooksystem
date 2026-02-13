import AdminSidebar from '@/components/sidebar/AdminSidebar'
import AdminTopbar from '@/components/topbar/AdminTopbar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <AdminTopbar />

        <main className="p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}