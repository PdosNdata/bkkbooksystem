import { Bell, Search, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export default function Topbar() {
  const { isDarkMode, toggleDarkMode } = useTheme()

  return (
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors duration-200">
      <h1 className="text-lg font-semibold dark:text-white">ภาพรวมแดชบอร์ด</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={18} />
          <input
            className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            placeholder="ค้นหาคำสั่งซื้อ, นักเรียน, หรือ ISBN..."
          />
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/avatar.png"
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="text-sm font-medium dark:text-white">ผู้ดูแลระบบ</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">หัวหน้าบริหาร</p>
          </div>
        </div>
      </div>
    </header>
  )
}