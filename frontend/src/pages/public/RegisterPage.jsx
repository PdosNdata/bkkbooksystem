import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Swal from 'sweetalert2'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'teacher',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (name, value) => {
    let message = ''

    if (name === 'fullName') {
      if (!value) message = 'กรุณากรอกชื่อ-นามสกุล'
      else if (value.length < 4) message = 'ต้องมีอย่างน้อย 4 ตัวอักษร'
    }

    if (name === 'email') {
      if (!value) message = 'กรุณากรอกอีเมล'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'รูปแบบอีเมลไม่ถูกต้อง'
    }

    if (name === 'password') {
      if (!value) message = 'กรุณากรอกรหัสผ่าน'
      else if (value.length < 6) message = 'รหัสผ่านอย่างน้อย 6 ตัว'
    }

    if (name === 'confirmPassword') {
      if (!value) message = 'กรุณายืนยันรหัสผ่าน'
      else if (value !== form.password) message = 'รหัสผ่านไม่ตรงกัน'
    }

    setErrors(prev => ({ ...prev, [name]: message }))
    return message === ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value,
    }))
    validate(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate all fields
    const isValidFullName = validate('fullName', form.fullName)
    const isValidEmail = validate('email', form.email)
    const isValidPassword = validate('password', form.password)
    const isValidConfirmPassword = validate('confirmPassword', form.confirmPassword)

    if (!isValidFullName || !isValidEmail || !isValidPassword || !isValidConfirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        text: 'ตรวจสอบข้อมูลที่กรอกอีกครั้ง',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#2563eb',
      })
      return
    }

    // ตรวจสอบความรัดกุมของรหัสผ่าน
    const passwordStrength = checkPasswordStrength(form.password)
    if (!passwordStrength.isStrong) {
      Swal.fire({
        icon: 'warning',
        title: 'รหัสผ่านไม่รัดกุม',
        html: `
          <p class="text-left">รหัสผ่านควรประกอบด้วย:</p>
          <ul class="text-left mt-2">
            <li>${passwordStrength.hasMinLength ? '✅' : '❌'} อย่างน้อย 8 ตัวอักษร</li>
            <li>${passwordStrength.hasUppercase ? '✅' : '❌'} ตัวพิมพ์ใหญ่ (A-Z)</li>
            <li>${passwordStrength.hasLowercase ? '✅' : '❌'} ตัวพิมพ์เล็ก (a-z)</li>
            <li>${passwordStrength.hasNumber ? '✅' : '❌'} ตัวเลข (0-9)</li>
          </ul>
        `,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#2563eb',
      })
      return
    }

    setLoading(true)

    const result = await register(form.email, form.password, form.fullName, form.role)

    setLoading(false)

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'สมัครสมาชิกสำเร็จ!',
        text: 'ระบบจะพาคุณไปหน้าเข้าสู่ระบบ',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#16a34a',
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        navigate('/login')
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: 'สมัครสมาชิกไม่สำเร็จ',
        text: result.message,
        confirmButtonText: 'ลองใหม่',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  // ฟังก์ชันตรวจสอบความรัดกุมของรหัสผ่าน
  const checkPasswordStrength = (password) => {
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    return {
      isStrong: hasMinLength && hasUppercase && hasLowercase && hasNumber,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-green-50 dark:bg-gray-700">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                📘
              </div>
              <span className="font-semibold text-lg">
                Education Book System
              </span>
            </div>

            <h2 className="text-3xl font-bold mb-4 dark:text-white">
              สมัครสมาชิก<br />เพื่อเข้าใช้งานระบบ
            </h2>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              ระบบบริหารจัดการหนังสือเรียนสำหรับครูประจำชั้น
              โรงเรียนบ้านค้อดอนแคน
            </p>
          </div>

          <div className="flex gap-4 text-sm text-green-600 mt-8">
            <span>✔ ฟรี</span>
            <span>✔ ง่าย</span>
            <span>✔ ปลอดภัย</span>
          </div>
        </div>

        {/* Right panel (Register Form) */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold mb-2 dark:text-white">สมัครสมาชิก</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            กรุณากรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้
          </p>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="กรอกชื่อ-นามสกุล"
                className="input-field"
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                อีเมล
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="กรอกอีเมล"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Role - ครูเท่านั้น */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                ตำแหน่ง
              </label>
              <div className="flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                <span className="text-lg">👩‍🏫</span> ครู
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัว)"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">ยืนยันรหัสผ่าน</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="input-field"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-secondary disabled:opacity-60"
            >
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-xs text-gray-400 dark:text-gray-500">
        © 2024 Textbook Ordering System. All rights reserved.
      </div>
    </div>
  )
}
