import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  Package,
  Truck,
  FileOutput,
  FileText,
  Settings,
  Users,
  Wallet,
  UserCog,
  BookOpen,
  ClipboardList
} from 'lucide-react';
import { menuConfig } from '../config/menuConfig';

const iconMap = {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  Package,
  Truck,
  FileOutput,
  FileText,
  Settings,
  Users,
  Wallet,
  UserCog,
  BookOpen,
  ClipboardList
};

const SidebarNew = ({ role = 'admin' }) => {
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const renderMenuItem = (item, index) => {
    const Icon = iconMap[item.icon];
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isOpen = openMenus[item.label];

    if (hasSubmenu) {
      return (
        <div key={`menu-${index}-${item.label}`} className="mb-1">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon className="w-5 h-5" />}
              <span className="font-medium">{item.label}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {isOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map((subItem, subIndex) => {
                const SubIcon = iconMap[subItem.icon];
                return (
                  <NavLink
                    key={`submenu-${index}-${subIndex}-${subItem.path}`}
                    to={subItem.path}
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    {SubIcon && <SubIcon className="w-4 h-4" />}
                    <span className="text-sm">{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={`menu-${index}-${item.path}`}
        to={item.path}
        className={({ isActive }) => 
          `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
            isActive 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`
        }
      >
        {Icon && <Icon className="w-5 h-5" />}
        <span className="font-medium">{item.label}</span>
        {item.badge && (
          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">ระบบจัดการหนังสือเรียน</h2>
      </div>
      <nav>
        {menuConfig[role]?.map((item, index) => renderMenuItem(item, index))}
      </nav>
    </div>
  );
};

export default SidebarNew;