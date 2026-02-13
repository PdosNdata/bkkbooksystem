import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { motion } from 'framer-motion'
import { User, Lock, Eye, Moon, Sun } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: localStorage.getItem('rememberedEmail') || '',
    password: '',
    role: localStorage.getItem('rememberedRole') || 'teacher',
    remember: !!localStorage.getItem('rememberedEmail'),
  })
  const [errors, setErrors] = useState({})
  const validate = (name, value) => {
    let message = ''
  
    if (name === 'username') {
      if (!value) message = 'กรุณากรอกชื่อผู้ใช้หรือเลขประจำตัวครู'
      else if (value.length < 4) message = 'ต้องมีอย่างน้อย 4 ตัวอักษร'
    }
  
    if (name === 'password') {
      if (!value) message = 'กรุณากรอกรหัสผ่าน'
      else if (value.length < 6) message = 'รหัสผ่านอย่างน้อย 6 ตัว'
    }
  
    setErrors(prev => ({ ...prev, [name]: message }))
  }
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    validate(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(form.username, form.password, form.role, form.remember)

    setLoading(false)

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ!',
        text: 'ยินดีต้อนรับเข้าสู่ระบบ',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#16a34a',
        timer: 1500,
        timerProgressBar: true,
      }).then(() => {
        navigate('/dashboard')
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        text: result.message,
        confirmButtonText: 'ลองใหม่',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors duration-200">
      {/* Dark Mode Toggle - Fixed Position */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full shadow-lg transition-colors z-50"
        title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 transition-colors duration-200">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-blue-50 dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                📘
              </div>
              <span className="font-semibold text-lg dark:text-white">
                Education Book System
              </span>
            </div>

            <h2 className="text-3xl font-bold mb-4 dark:text-white">
              ระบบบริหารจัดการหนังสือเรียน<br />โรงเรียนบ้านค้อดอนแคน
            </h2>

            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              ระบบสำหรับครูประจำชั้นเพื่ออำนวยความสะดวกในการสำรวจและสั่งหนังสือเรียน
              สำหรับนักเรียนระดับอนุบาลถึงมัธยมศึกษาปีที่ 3
            </p>
          </div>

          <div className="flex gap-4 text-sm text-blue-600 dark:text-blue-400 mt-8">
            <span>✔ รวดเร็ว</span>
            <span>✔ แม่นยำ</span>
            <span>✔ ตรวจสอบได้</span>
          </div>
        </div>

        {/* Right panel (Login Form) */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold mb-2 dark:text-white">เข้าสู่ระบบ</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">เข้าสู่ระบบในฐานะ</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, role: 'teacher' }))}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.role === 'teacher'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-lg">👩‍🏫</span> ครู
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, role: 'admin' }))}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.role === 'admin'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-lg">🛡️</span> แอดมิน
                </button>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                {form.role === 'admin' ? 'อีเมลแอดมิน' : 'อีเมลครู'}
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder={form.role === 'admin' ? 'กรอกอีเมลแอดมิน' : 'กรอกอีเมลครู'}
                required
                className="input-field"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium dark:text-gray-200">รหัสผ่าน</label>
                <button
                  type="button"
                  className="text-sm text-blue-600 dark:text-blue-400"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2 text-sm dark:text-gray-300">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                className="rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <span>จดจำการเข้าสู่ระบบ</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-60"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
            <span className="text-sm text-gray-400 dark:text-gray-500">หรือ</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={async () => {
              const result = await loginWithGoogle()
              if (!result.success) {
                Swal.fire({
                  icon: 'error',
                  title: 'เข้าสู่ระบบไม่สำเร็จ',
                  text: result.message,
                  confirmButtonText: 'ตกลง',
                  confirmButtonColor: '#dc2626',
                })
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <div className="mt-5 text-center space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีบัญชี?{' '}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                สมัครสมาชิก
              </Link>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ติดปัญหาการใช้งาน?{' '}
              <span className="text-blue-600 dark:text-blue-400 cursor-pointer">
                ติดต่อฝ่ายสนับสนุน
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-xs text-gray-400 dark:text-gray-500">
        © 2024 Textbook Ordering System. All rights reserved.
      </div>
    </div>
  )
}