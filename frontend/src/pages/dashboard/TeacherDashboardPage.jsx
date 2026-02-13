import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  ShoppingCart, Clock, CheckCircle, Search, Eye, Loader2
} from 'lucide-react'
import { getTeacherOrders } from '../../services/dashboard.service'

const statusMap = {
  pending: 'รอดำเนินการ',
  approved: 'อนุมัติแล้ว',
  shipping: 'กำลังจัดส่ง',
  completed: 'จัดส่งสำเร็จ',
  cancelled: 'ยกเลิก',
}

const statusStyles = {
  'รอดำเนินการ': 'bg-yellow-100 text-yellow-700',
  'อนุมัติแล้ว': 'bg-blue-100 text-blue-700',
  'กำลังจัดส่ง': 'bg-indigo-100 text-indigo-700',
  'จัดส่งสำเร็จ': 'bg-green-100 text-green-700',
  'ยกเลิก': 'bg-red-100 text-red-700',
}

const PAGE_SIZE = 5

// ฟอร์แมตวันที่เป็นภาษาไทย
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const buddhistYear = d.getFullYear() + 543
  return `${d.getDate()} ${months[d.getMonth()]} ${buddhistYear}`
}

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (user?.id) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    setLoadingData(true)
    try {
      const data = await getTeacherOrders(user.id)
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const filtered = orders.filter((o) => {
    const displayStatus = statusMap[o.status] || o.status
    const matchSearch = (o.order_number || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (o.classroom || '').toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = statusFilter === 'ทั้งหมด' || displayStatus === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const completedOrders = orders.filter(o => o.status === 'completed').length

  const stats = [
    { label: 'คำสั่งซื้อทั้งหมด', value: totalOrders, icon: ShoppingCart, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'รอดำเนินการ', value: pendingOrders, icon: Clock, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    { label: 'จัดส่งสำเร็จ', value: completedOrders, icon: CheckCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  ]

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">สถานะคำสั่งซื้อของฉัน</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">ติดตามคำสั่งซื้อหนังสือเรียนประจำชั้นของคุณ</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.iconBg} dark:bg-opacity-20`}>
                  <Icon size={24} className={stat.iconColor} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="ค้นหารหัสคำสั่งซื้อ หรือ ชั้นเรียน..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <select
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          >
            <option>ทั้งหมด</option>
            <option>รอดำเนินการ</option>
            <option>อนุมัติแล้ว</option>
            <option>กำลังจัดส่ง</option>
            <option>จัดส่งสำเร็จ</option>
            <option>ยกเลิก</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                <th className="text-left px-4 py-3 font-medium rounded-tl-lg">รหัสคำสั่งซื้อ</th>
                <th className="text-left px-4 py-3 font-medium">วันที่สั่งซื้อ</th>
                <th className="text-left px-4 py-3 font-medium">ชั้นเรียน</th>
                <th className="text-center px-4 py-3 font-medium">จำนวน (เล่ม)</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 font-medium rounded-tr-lg">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.map((order) => {
                const displayStatus = statusMap[order.status] || order.status
                return (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{order.classroom || '-'}</td>
                    <td className="px-4 py-3 text-center dark:text-gray-200">{order.total_quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyles[displayStatus] || 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200'}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm">
                        <Eye size={15} /> ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    {orders.length === 0 ? 'ยังไม่มีคำสั่งซื้อ' : 'ไม่พบรายการที่ค้นหา'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              แสดง {(currentPage - 1) * PAGE_SIZE + 1} ถึง{' '}
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 dark:text-gray-200"
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 dark:text-gray-200"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
