import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Edit3, Trash2, UserPlus, Shield, Loader2, User } from 'lucide-react'
import Swal from 'sweetalert2'

const roleLabels = { 
  admin: 'ผู้ดูแลระบบ', 
  teacher: 'ครู', 
  staff: 'เจ้าหน้าที่พัสดุ',
  warehouse: 'เจ้าหน้าที่คลัง'
}
const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['', 'kg2','kg3','p1','p2','p3','p4','p5','p6','m1','m2','m3']

const PAGE_SIZE = 10

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [addForm, setAddForm] = useState({ email: '', password: '', full_name: '', role: 'teacher', homeroom_grade: '', homeroom_room: '' })

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchUsers error:', error)
        setUsers([])
      } else {
        // แสดงทุก role: admin, teacher, staff, warehouse
        setUsers(data || [])
      }
    } catch (err) {
      console.error('fetchUsers exception:', err)
      setUsers([])
    }
    setLoading(false)
  }

  const handleAddTeacher = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบ', confirmButtonColor: '#2563eb' })
      return
    }

    // บันทึก session ของ admin ก่อน
    const { data: { session: adminSession } } = await supabase.auth.getSession()

    // สร้าง user ผ่าน Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: addForm.email,
      password: addForm.password,
      options: {
        data: { full_name: addForm.full_name, role: addForm.role }
      }
    })

    if (authError) {
      Swal.fire({ icon: 'error', title: 'สร้างบัญชีไม่สำเร็จ', text: authError.message })
      return
    }

    // เพิ่มข้อมูลในตาราง users
    if (authData.user) {
      await supabase.from('users').upsert({
        id: authData.user.id,
        email: addForm.email,
        full_name: addForm.full_name,
        role: addForm.role,
        homeroom_grade: addForm.homeroom_grade || null,
        homeroom_room: addForm.homeroom_room || null,
        is_active: true
      })
    }

    // restore session ของ admin กลับ
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    Swal.fire({ icon: 'success', title: 'เพิ่มผู้ใช้สำเร็จ', timer: 1500, showConfirmButton: false })
    setShowModal(false)
    setAddForm({ email: '', password: '', full_name: '', role: 'teacher', homeroom_grade: '', homeroom_room: '' })
    fetchUsers()
  }

  const updateRole = async (id, newRole) => {
    const result = await Swal.fire({
      title: `เปลี่ยนตำแหน่งเป็น "${roleLabels[newRole]}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
    })
    if (!result.isConfirmed) return

    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id)
    if (error) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message })
    } else {
      Swal.fire({ icon: 'success', title: 'อัพเดทสำเร็จ', timer: 1200, showConfirmButton: false })
      fetchUsers()
    }
  }

  const toggleActive = async (id, currentActive, name) => {
    const action = currentActive ? 'ระงับ' : 'เปิดใช้งาน'
    const result = await Swal.fire({
      title: `${action}ผู้ใช้ "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: currentActive ? '#dc2626' : '#16a34a',
    })
    if (!result.isConfirmed) return

    const { error } = await supabase.from('users').update({ is_active: !currentActive }).eq('id', id)
    if (error) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message })
    } else {
      Swal.fire({ icon: 'success', title: `${action}สำเร็จ`, timer: 1200, showConfirmButton: false })
      fetchUsers()
    }
  }

  const openEditUser = (u) => {
    setEditUser({ id: u.id, full_name: u.full_name, homeroom_grade: u.homeroom_grade || '', homeroom_room: u.homeroom_room || '' })
  }

  const handleUpdateUser = async () => {
    if (!editUser) return
    const { error } = await supabase.from('users').update({
      homeroom_grade: editUser.homeroom_grade || null,
      homeroom_room: editUser.homeroom_room || null,
    }).eq('id', editUser.id)

    if (error) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message })
    } else {
      Swal.fire({ icon: 'success', title: 'อัพเดทสำเร็จ', timer: 1200, showConfirmButton: false })
      setEditUser(null)
      fetchUsers()
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const filtered = users.filter(u => {
    const matchSearch = (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">การจัดการผู้ใช้</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการบัญชีผู้ใช้ทั้งหมดในระบบ ({users.length} คน)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
          <UserPlus size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(roleLabels).map(([role, label]) => (
          <div key={role} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              role === 'admin' ? 'bg-purple-50' : 
              role === 'staff' ? 'bg-orange-50' : 
              role === 'warehouse' ? 'bg-green-50' : 
              'bg-blue-50'
            }`}>
              <User size={20} className={
                role === 'admin' ? 'text-purple-600' : 
                role === 'staff' ? 'text-orange-600' : 
                role === 'warehouse' ? 'text-green-600' : 
                'text-blue-600'
              } />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold">{users.filter(u => u.role === role).length}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ค้นหาชื่อหรืออีเมล..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
          </div>
          <select className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1) }}>
            <option value="all">ทุกตำแหน่ง</option>
            {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="text-left px-4 py-3 font-medium">อีเมล</th>
                <th className="text-center px-4 py-3 font-medium">ตำแหน่ง</th>
                <th className="text-center px-4 py-3 font-medium">ครูประจำชั้น</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium">วันที่สมัคร</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <User size={16} className="text-blue-500" />}
                      </div>
                      <span className="font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      className="text-xs border rounded-lg px-2 py-1.5 bg-white"
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                    >
                      {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.role === 'teacher' ? (
                      u.homeroom_grade ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {gradeLabel[u.homeroom_grade] || u.homeroom_grade}{u.homeroom_room ? `/${u.homeroom_room}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">ยังไม่กำหนด</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active !== false ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {u.role === 'teacher' && (
                        <button onClick={() => openEditUser(u)} className="text-xs px-3 py-1.5 rounded-lg border text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Edit3 size={13} className="inline mr-1" />กำหนดชั้น
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(u.id, u.is_active !== false, u.full_name)}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${u.is_active !== false ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                      >
                        {u.is_active !== false ? 'ระงับ' : 'เปิดใช้งาน'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">ไม่พบผู้ใช้</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">แสดง {(currentPage-1)*PAGE_SIZE+1} ถึง {Math.min(currentPage*PAGE_SIZE, filtered.length)} จาก {filtered.length}</p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">ก่อนหน้า</button>
              {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold mb-4">เพิ่มผู้ใช้ใหม่</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อ-นามสกุล *</label>
                <input type="text" className="input-field mt-1" placeholder="เช่น สมชาย ใจดี" value={addForm.full_name} onChange={e => setAddForm(p => ({...p, full_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">อีเมล *</label>
                <input type="email" className="input-field mt-1" placeholder="example@email.com" value={addForm.email} onChange={e => setAddForm(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">รหัสผ่าน *</label>
                <input type="password" className="input-field mt-1" placeholder="อย่างน้อย 6 ตัวอักษร" value={addForm.password} onChange={e => setAddForm(p => ({...p, password: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">ตำแหน่ง *</label>
                <select className="input-field mt-1" value={addForm.role} onChange={e => setAddForm(p => ({...p, role: e.target.value}))}>
                  <option value="teacher">ครู</option>
                  <option value="staff">เจ้าหน้าที่พัสดุ</option>
                  <option value="warehouse">เจ้าหน้าที่คลัง</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>
              {addForm.role === 'teacher' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">ครูประจำชั้น</label>
                    <select className="input-field mt-1" value={addForm.homeroom_grade} onChange={e => setAddForm(p => ({...p, homeroom_grade: e.target.value}))}>
                      <option value="">ไม่ระบุ</option>
                      {gradeOptions.filter(g => g).map(g => <option key={g} value={g}>{gradeLabel[g]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">ห้อง</label>
                    <select className="input-field mt-1" value={addForm.homeroom_room} onChange={e => setAddForm(p => ({...p, homeroom_room: e.target.value}))}>
                      <option value="">ไม่ระบุ</option>
                      {['1','2','3','4','5','6'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">ยกเลิก</button>
              <button onClick={handleAddTeacher} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">เพิ่มผู้ใช้</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Homeroom Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold mb-4">กำหนดครูประจำชั้น</h3>
            <p className="text-sm text-gray-500 mb-4">{editUser.full_name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชั้นเรียน</label>
                <select className="input-field mt-1" value={editUser.homeroom_grade} onChange={e => setEditUser(p => ({...p, homeroom_grade: e.target.value}))}>
                  <option value="">ไม่ระบุ</option>
                  {gradeOptions.filter(g => g).map(g => <option key={g} value={g}>{gradeLabel[g]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">ห้อง</label>
                <select className="input-field mt-1" value={editUser.homeroom_room} onChange={e => setEditUser(p => ({...p, homeroom_room: e.target.value}))}>
                  <option value="">ไม่ระบุ</option>
                  {['1','2','3','4','5','6'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">ยกเลิก</button>
              <button onClick={handleUpdateUser} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}