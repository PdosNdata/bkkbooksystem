import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { UserCheck, Search, Loader2, BookOpen } from 'lucide-react'

export default function DistributionsPage() {
  const [loading, setLoading] = useState(true)
  const [distributions, setDistributions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDistributions()
  }, [])

  const fetchDistributions = async () => {
    setLoading(true)
    // TODO: เชื่อมต่อกับตาราง distributions จริง
    // const { data, error } = await supabase.from('distributions').select('*')
    setDistributions([])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500">กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="text-blue-600" />
            แจกหนังสือให้นักเรียน
          </h1>
          <p className="text-gray-500 text-sm mt-1">บันทึกการแจกหนังสือเรียนให้นักเรียน</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหานักเรียน..."
              className="pl-10 pr-4 py-2.5 border rounded-xl text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary flex items-center gap-2">
            <UserCheck size={18} />
            บันทึกการแจก
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">ยังไม่มีข้อมูลการแจกหนังสือ</p>
            <p className="text-sm mt-1">เริ่มบันทึกการแจกหนังสือให้นักเรียนได้ที่นี่</p>
          </div>
        </div>
      </div>
    </div>
  )
}
