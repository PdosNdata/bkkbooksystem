import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Search, Eye, Plus, Filter, CheckCircle, XCircle,
  Truck, Clock, Loader2, ChevronDown
} from 'lucide-react'
import Swal from 'sweetalert2'

const statusMap = {
  pending: { label: 'รอดำเนินการ', style: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติแล้ว', style: 'bg-blue-100 text-blue-700' },
  shipping: { label: 'กำลังจัดส่ง', style: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'จัดส่งสำเร็จ', style: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', style: 'bg-red-100 text-red-700' },
}

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

const PAGE_SIZE = 10

export default function OrdersPage1() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, users!orders_teacher_id_fkey(full_name)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, newStatus) => {
    const statusLabel = statusMap[newStatus]?.label
    const result = await Swal.fire({
      title: `เปลี่ยนสถานะเป็น "${statusLabel}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
    })
    if (!result.isConfirmed) return

    try {
      // ดึงข้อมูลคำสั่งซื้อ
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('status, grade, year, total_amount')
        .eq('id', id)
        .single()

      if (orderError) throw orderError

      const updates = { status: newStatus }
      if (newStatus === 'approved') updates.approved_at = new Date().toISOString()
      if (newStatus === 'shipping') updates.shipped_at = new Date().toISOString()
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
      if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString()

      // อัปเดตสถานะคำสั่งซื้อ
      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      // ถ้าอนุมัติคำสั่งซื้อ ให้อัปเดต budget
      if (newStatus === 'approved' && orderData.status !== 'approved') {
        const currentYear = new Date().getFullYear() + 543 // ใช้ปี พ.ศ.
        
        // ดึงข้อมูล budget ปัจจุบัน
        const { data: budgetData, error: budgetFetchError } = await supabase
          .from('budgets')
          .select('id, used_amount, amount')
          .eq('grade', orderData.grade)
          .eq('year', currentYear)
          .maybeSingle()

        if (budgetFetchError) {
          console.error('Error fetching budget:', budgetFetchError)
          throw budgetFetchError
        }

        if (budgetData) {
          // อัปเดต used_amount
          const newUsedAmount = (budgetData.used_amount || 0) + (orderData.total_amount || 0)
          
          const { error: budgetUpdateError } = await supabase
            .from('budgets')
            .update({
              used_amount: newUsedAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', budgetData.id)

          if (budgetUpdateError) {
            console.error('Error updating budget:', budgetUpdateError)
            throw budgetUpdateError
          }

          console.log(`✅ Budget updated: ${budgetData.used_amount} → ${newUsedAmount} (added ${orderData.total_amount})`)
        } else {
          console.warn(`⚠️ No budget found for grade ${orderData.grade}, year ${currentYear}`)
        }
      }

      // ถ้ายกเลิกคำสั่งซื้อที่เคยอนุมัติไว้ ให้ลด used_amount
      if (newStatus === 'cancelled' && orderData.status === 'approved') {
        const currentYear = new Date().getFullYear() + 543
        
        const { data: budgetData, error: budgetFetchError } = await supabase
          .from('budgets')
          .select('id, used_amount')
          .eq('grade', orderData.grade)
          .eq('year', currentYear)
          .maybeSingle()

        if (budgetFetchError) {
          console.error('Error fetching budget:', budgetFetchError)
        }

        if (budgetData) {
          const newUsedAmount = Math.max(0, (budgetData.used_amount || 0) - (orderData.total_amount || 0))
          
          await supabase
            .from('budgets')
            .update({
              used_amount: newUsedAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', budgetData.id)

          console.log(`✅ Budget restored: ${budgetData.used_amount} → ${newUsedAmount} (refunded ${orderData.total_amount})`)
        }
      }

      Swal.fire({ 
        icon: 'success', 
        title: 'อัพเดทสำเร็จ', 
        timer: 1200, 
        showConfirmButton: false 
      })
      fetchOrders()

    } catch (error) {
      console.error('Update error:', error)
      Swal.fire({ 
        icon: 'error', 
        title: 'ผิดพลาด', 
        text: error.message, 
        confirmButtonColor: '#2563eb' 
      })
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.users?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.classroom || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">จัดการคำสั่งซื้อ</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">รายการคำสั่งซื้อหนังสือเรียนทั้งหมด ({orders.length} รายการ)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ค้นหารหัสคำสั่งซื้อ, ชื่อครู, ชั้นเรียน..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
          </div>
          <select className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
            <option value="all">ทุกสถานะ</option>
            {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm dark:text-gray-200">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <th className="text-left px-4 py-3 font-medium">รหัสคำสั่งซื้อ</th>
                <th className="text-left px-4 py-3 font-medium">ครูผู้สั่ง</th>
                <th className="text-left px-4 py-3 font-medium">ชั้นเรียน</th>
                <th className="text-center px-4 py-3 font-medium">จำนวน</th>
                <th className="text-right px-4 py-3 font-medium">ยอดรวม</th>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-blue-600">{order.order_number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.users?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.classroom || '-'}</td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">{order.total_quantity} เล่ม</td>
                  <td className="px-4 py-3 text-right dark:text-gray-300">{Number(order.total_amount || 0).toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusMap[order.status]?.style || 'bg-gray-100 dark:bg-gray-600'}`}>
                      {statusMap[order.status]?.label || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="relative inline-block">
                      <select
                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                      >
                        {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">ไม่พบรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">แสดง {(currentPage-1)*PAGE_SIZE+1} ถึง {Math.min(currentPage*PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700">ก่อนหน้า</button>
              {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700">ถัดไป</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
