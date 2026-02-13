import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Search, Bell, User, Moon, Sun } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Navbar() {
  const { user } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [openMenu, setOpenMenu] = useState(false)

  return (
    <>
      {/* Navbar */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-6 transition-colors duration-200">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-2xl text-gray-600 dark:text-gray-300"
            onClick={() => setOpenMenu(true)}
          >
            ☰
          </button>
          <h1 className="font-semibold text-lg hidden md:block dark:text-white">ภาพรวมแดชบอร์ด</h1>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="ค้นหาคำสั่งซื้อ, นักเรียน, หรือ ISBN..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'teacher' ? 'ครู' : user.role}
                </p>
              </div>
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {openMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenMenu(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar mobile onClose={() => setOpenMenu(false)} />
          </div>
        </div>
      )}
    </>
  )
}
