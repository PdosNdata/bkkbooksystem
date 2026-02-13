import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { menuConfig } from '../config/menuConfig'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, FileText, BookOpen, LogOut, Settings, GraduationCap,
  ClipboardList, FileOutput, Truck, UserCog, UserCheck, ChevronDown, ChevronRight
} from 'lucide-react'

const iconMap = {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, FileText, BookOpen, Settings, GraduationCap,
  ClipboardList, FileOutput, Truck, UserCog, UserCheck
}

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [openMenus, setOpenMenus] = useState({})

  if (!user) return null

  const menus = menuConfig[user.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  const renderMenuItem = (item, index) => {
    const Icon = iconMap[item.icon] || LayoutDashboard
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isOpen = openMenus[item.label]

    // ถ้ามีเมนูย่อย
    if (hasSubmenu) {
      return (
        <div key={`menu-${item.label}-${index}`} className="mb-1">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
            {isOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          
          {isOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map((subItem, subIndex) => {
                const SubIcon = iconMap[subItem.icon] || LayoutDashboard
                return (
                  <NavLink
                    key={`submenu-${subItem.path}-${subIndex}`}
                    to={subItem.path}
                    onClick={mobile ? onClose : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <SubIcon size={16} />
                    <span className="text-sm">{subItem.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // เมนูปกติ (ไม่มีเมนูย่อย)
    return (
      <NavLink
        key={`menu-${item.path}-${index}`}
        to={item.path}
        onClick={mobile ? onClose : undefined}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`
        }
      >
        <Icon size={18} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b">
        <div className="bg-blue-600 text-white p-2.5 rounded-xl">
          <Package size={20} />
        </div>
        <div>
          <p className="font-bold text-sm">ระบบบริหารจัดการหนังสือเรียน</p>
          <p className="text-xs text-gray-400">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menus.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-500 hover:text-red-500 text-sm w-full px-4 py-2"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}