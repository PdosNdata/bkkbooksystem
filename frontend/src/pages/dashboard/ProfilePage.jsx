import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Camera, User, Mail, Shield, Lock, Eye, EyeOff, Save, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('profile') // profile | password
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ข้อมูลโปรไฟล์
  const [profileForm, setProfileForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
  })

  // เปลี่ยนรหัสผ่าน
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // อัพโหลดรูปภาพ
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ตรวจสอบไฟล์
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'ไฟล์ไม่ถูกต้อง', text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', confirmButtonColor: '#2563eb' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'ไฟล์ใหญ่เกินไป', text: 'ขนาดไฟล์ต้องไม่เกิน 2 MB', confirmButtonColor: '#2563eb' })
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      // อัพโหลดไปยัง Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // ดึง public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // อัพเดท user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      // อัพเดท local state
      const updatedUser = { ...user, avatar: publicUrl }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      if (setUser) setUser(updatedUser)

      Swal.fire({ icon: 'success', title: 'เปลี่ยนรูปโปรไฟล์สำเร็จ', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Upload error:', error)
      Swal.fire({ icon: 'error', title: 'อัพโหลดไม่สำเร็จ', text: error.message || 'กรุณาลองใหม่', confirmButtonColor: '#2563eb' })
    } finally {
      setUploading(false)
    }
  }

  // บันทึกโปรไฟล์
  const handleSaveProfile = async () => {
    if (!profileForm.fullName.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่อ-นามสกุล', confirmButtonColor: '#2563eb' })
      return
    }

    setLoading(true)
    try {
      // อัพเดท user metadata ใน Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileForm.fullName.trim() }
      })

      if (error) throw error

      // อัพเดท local state
      const updatedUser = { ...user, name: profileForm.fullName.trim() }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      if (setUser) setUser(updatedUser)

      Swal.fire({ icon: 'success', title: 'บันทึกข้อมูลสำเร็จ', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Update profile error:', error)
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message || 'กรุณาลองใหม่', confirmButtonColor: '#2563eb' })
    } finally {
      setLoading(false)
    }
  }

  // เปลี่ยนรหัสผ่าน
  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', confirmButtonColor: '#2563eb' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'กรุณากรอกรหัสผ่านยืนยันให้ตรงกัน', confirmButtonColor: '#2563eb' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      setPasswordForm({ newPassword: '', confirmPassword: '' })
      Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Change password error:', error)
      Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: error.message || 'กรุณาลองใหม่', confirmButtonColor: '#2563eb' })
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = {
    admin: 'ผู้ดูแลระบบ',
    teacher: 'ครู',
    staff: 'เจ้าหน้าที่',
    warehouse: 'ฝ่ายคลังสินค้า',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">ตั้งค่าผู้ใช้</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ</p>
      </div>

      {/* Avatar Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-blue-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold dark:text-white">{user?.name || '-'}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 px-3 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2 MB</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'profile' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          ข้อมูลส่วนตัว
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'password' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          เปลี่ยนรหัสผ่าน
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 dark:text-gray-200">
              <User size={16} className="text-gray-400" /> ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="กรอกชื่อ-นามสกุล"
              className="input-field"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 dark:text-gray-200">
              <Mail size={16} className="text-gray-400" /> อีเมล
            </label>
            <input
              type="email"
              value={profileForm.email}
              disabled
              className="input-field bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ไม่สามารถเปลี่ยนอีเมลได้</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 dark:text-gray-200">
              <Shield size={16} className="text-gray-400" /> ตำแหน่ง
            </label>
            <input
              type="text"
              value={roleLabel[user?.role] || user?.role}
              disabled
              className="input-field bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            บันทึกข้อมูล
          </button>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 dark:text-gray-200">
              <Lock size={16} className="text-gray-400" /> รหัสผ่านใหม่
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 dark:text-gray-200">
              <Lock size={16} className="text-gray-400" /> ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="input-field"
            />
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">รหัสผ่านไม่ตรงกัน</p>
            )}
          </div>

          {/* Password Strength */}
          {passwordForm.newPassword && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium text-gray-600 dark:text-gray-300 mb-2">ความรัดกุมของรหัสผ่าน:</p>
              <p className={passwordForm.newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                {passwordForm.newPassword.length >= 8 ? '✅' : '⬜'} อย่างน้อย 8 ตัวอักษร
              </p>
              <p className={/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                {/[A-Z]/.test(passwordForm.newPassword) ? '✅' : '⬜'} ตัวพิมพ์ใหญ่ (A-Z)
              </p>
              <p className={/[a-z]/.test(passwordForm.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                {/[a-z]/.test(passwordForm.newPassword) ? '✅' : '⬜'} ตัวพิมพ์เล็ก (a-z)
              </p>
              <p className={/[0-9]/.test(passwordForm.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                {/[0-9]/.test(passwordForm.newPassword) ? '✅' : '⬜'} ตัวเลข (0-9)
              </p>
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={loading || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            เปลี่ยนรหัสผ่าน
          </button>
        </div>
      )}
    </div>
  )
}
