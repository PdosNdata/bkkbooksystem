import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase จะดึง token จาก URL hash โดยอัตโนมัติ
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          navigate('/login', { replace: true })
          return
        }

        if (session) {
          const u = session.user
          const userData = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
            role: u.user_metadata?.role || 'teacher',
            avatar: u.user_metadata?.avatar_url || null,
          }
          localStorage.setItem('token', session.access_token)
          localStorage.setItem('user', JSON.stringify(userData))
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Callback error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 text-lg">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
}
