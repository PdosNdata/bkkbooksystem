import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  ClipboardList, CheckCircle, Wallet, Users,
  Printer, Plus, AlertCircle, X, ArrowRight, Loader2
} from 'lucide-react'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import TeacherDashboardPage from './TeacherDashboardPage'
import {
  getDashboardStats,
  getOrderTrends,
  getOrderStatusDistribution,
  getUnreadNotifications,
  formatCurrency,
} from '../../services/dashboard.service'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
)

export default function DashboardPage() {
  const { user } = useAuth()

  // ถ้าเป็น teacher ให้แสดง TeacherDashboardPage
  if (user?.role === 'teacher') {
    return <TeacherDashboardPage />
  }

  const [showAlert, setShowAlert] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [dashStats, setDashStats] = useState(null)
  const [trendData, setTrendData] = useState({ labels: [], data: [] })
  const [statusDist, setStatusDist] = useState({ total: 0, data: [0, 0, 0, 0], percentages: [0, 0, 0, 0] })
  const [notifCount, setNotifCount] = useState(0)
  const [trendMonths, setTrendMonths] = useState(6)

  const currentYear = new Date().getFullYear() + 543

  useEffect(() => {
    fetchDashboardData()
  }, [user, trendMonths])

  const fetchDashboardData = async () => {
    setLoadingData(true)
    try {
      const [stats, trends, distribution, notifs] = await Promise.all([
        getDashboardStats(currentYear),
        getOrderTrends(currentYear, trendMonths),
        getOrderStatusDistribution(currentYear),
        user?.id ? getUnreadNotifications(user.id) : { count: 0 },
      ])

      setDashStats(stats)
      setTrendData(trends)
      setStatusDist(distribution)
      setNotifCount(notifs.count)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const stats = dashStats ? [
    {
      label: 'รออนุมัติ',
      value: dashStats.pendingOrders.toLocaleString(),
      unit: 'คำสั่งซื้อ',
      icon: ClipboardList,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      label: 'คำสั่งซื้อที่อนุมัติแล้ว',
      value: dashStats.approvedOrders.toLocaleString(),
      unit: 'คำสั่งซื้อ',
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
    // {
    //   label: 'งบประมาณที่ใช้ไป',
    //   value: formatCurrency(dashStats.usedBudget),
    //   unit: `/ ${formatCurrency(dashStats.totalBudget)}`,
    //   change: `ใช้ไป ${dashStats.budgetPercentage}%`,
    //   changeColor: 'text-blue-500',
    //   icon: Wallet,
    //   iconBg: 'bg-blue-50',
    //   iconColor: 'text-blue-500',
    //   progress: dashStats.budgetPercentage,
    // },
    {
      label: 'งบประมาณที่ใช้ไป',
      value: (dashStats.usedBudget || 0).toLocaleString('th-TH'),
      unit: `/ ${(dashStats.totalBudget || 0).toLocaleString('th-TH')} บาท`,
      change: `ใช้ไป ${dashStats.budgetPercentage}%`,
      changeColor: 'text-blue-500',
      icon: Wallet,
      iconBg: 'bg-blue-150',
      iconColor: 'text-blue-800',
      progress: dashStats.budgetPercentage,
    },
    {
      label: 'ผู้ใช้งานทั้งหมด',
      value: dashStats.totalUsers.toLocaleString(),
      unit: 'คน',
      icon: Users,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
  ] : []

  const lineData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'คำสั่งซื้อ',
        data: trendData.data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#2563eb',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, ticks: { font: { size: 12 }, stepSize: 1 } },
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
    },
  }

  const doughnutData = {
    labels: ['อนุมัติแล้ว', 'รอดำเนินการ', 'กำลังดำเนินการ', 'ยกเลิกแล้ว'],
    datasets: [
      {
        data: statusDist.data,
        backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  const totalOrders = statusDist.total
  const doughnutPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
      const { width, height, ctx } = chart
      ctx.restore()
      ctx.font = 'bold 24px Sarabun, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      const isDark = document.documentElement.classList.contains('dark')
      ctx.fillStyle = isDark ? '#f9fafb' : '#1f2937'
      ctx.fillText(totalOrders.toLocaleString(), width / 2, height / 2 - 10)
      ctx.font = '12px Sarabun, sans-serif'
      ctx.fillStyle = isDark ? '#d1d5db' : '#9ca3af'
      ctx.fillText('คำสั่งซื้อทั้งหมด', width / 2, height / 2 + 14)
      ctx.save()
    },
  }

  const statusLabels = [
    { label: 'อนุมัติแล้ว', color: 'bg-green-500' },
    { label: 'รอดำเนินการ', color: 'bg-yellow-500' },
    { label: 'กำลังดำเนินการ', color: 'bg-blue-500' },
    { label: 'ยกเลิกแล้ว', color: 'bg-red-500' },
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">ยินดีต้อนรับกลับ, {user?.name || 'ผู้ดูแลระบบ'}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            นี่คือภาพรวมคำสั่งซื้อหนังสือเรียนประจำปีการศึกษา {currentYear}.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors">
            <Printer size={16} />
            พิมพ์รายงาน
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            คำสั่งซื้อใหม่
          </button>
        </div>
      </div>

      {/* Alert */}
      {showAlert && notifCount > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-blue-600 dark:text-blue-400" />
            <p className="text-sm dark:text-gray-200">
              <span className="font-medium">ต้องการความสนใจ:</span>{' '}
              คุณมี {notifCount} การแจ้งเตือนที่ยังไม่ได้อ่านเกี่ยวกับคำสั่งซื้อหนังสือเรียนใหม่
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1 hover:underline">
              ตรวจสอบตอนนี้ <ArrowRight size={14} />
            </button>
            <button onClick={() => setShowAlert(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.iconBg} dark:bg-opacity-20`}>
                  <Icon size={20} className={stat.iconColor} />
                </div>
                {stat.change && (
                  <span className={`text-xs font-medium ${stat.changeColor}`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold dark:text-white">
                {stat.value}
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">{stat.unit}</span>
              </p>
              {stat.progress !== undefined && (
                <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold dark:text-white">แนวโน้มคำสั่งซื้อ</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">ปริมาณคำสั่งซื้อรายเดือนใน {trendMonths} เดือนที่ผ่านมา</p>
            </div>
            <select
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={trendMonths}
              onChange={(e) => setTrendMonths(Number(e.target.value))}
            >
              <option value={6}>6 เดือนที่ผ่านมา</option>
              <option value={12}>12 เดือนที่ผ่านมา</option>
            </select>
          </div>
          <div className="h-64">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <h3 className="font-semibold mb-4 dark:text-white">การกระจายสถานะคำสั่งซื้อ</h3>
          <div className="h-48">
            {totalOrders > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} plugins={[doughnutPlugin]} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                ยังไม่มีข้อมูลคำสั่งซื้อ
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {statusLabels.map((item, i) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                <span className="text-gray-400 dark:text-gray-500">({statusDist.percentages[i]}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
