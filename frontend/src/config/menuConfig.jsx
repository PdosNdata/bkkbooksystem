export const menuConfig = {
  admin: [
    { label: 'แดชบอร์ด', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'คำสั่งซื้อ', path: '/orders', icon: 'ShoppingCart', badge: '12' },
    { label: 'นักเรียน', path: '/students', icon: 'GraduationCap' },
    { 
      label: 'จัดการหนังสือเรียน', 
      icon: 'Package',
      submenu: [
        { label: 'คลังหนังสือ', path: '/inventory', icon: 'Package' },
        { label: 'รับหนังสือจากสำนักพิมพ์', path: '/book-receipts', icon: 'Truck' },
        { label: 'เบิกหนังสือ', path: '/withdrawals', icon: 'FileOutput' },
        { label: 'รายงาน', path: '/reports', icon: 'FileText' },
      ]
    },
    { 
      label: 'การตั้งค่า', 
      icon: 'Settings',
      submenu: [
        { label: 'การจัดการผู้ใช้', path: '/users', icon: 'Users' },
        { label: 'การตั้งค่างบประมาณ', path: '/budget', icon: 'Wallet' },
        { label: 'การตั้งค่าเอกสารและปีงบประมาณ', path: '/settingdoc', icon: 'Wallet' },
        { label: 'ตั้งค่าผู้ใช้', path: '/profile', icon: 'UserCog' },
      ]
    },
  ],
  teacher: [
    { label: 'แดชบอร์ด', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'รายการหนังสือ', path: '/class-books', icon: 'BookOpen' },
    { label: 'สำรวจและสั่งหนังสือเรียน', path: '/my-orders', icon: 'ClipboardList' },
    { label: 'ตั้งค่าผู้ใช้', path: '/profile', icon: 'Settings' },
  ],
  staff: [
    { label: 'แดชบอร์ด', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'คำสั่งซื้อ', path: '/orders', icon: 'ShoppingCart', badge: '12' },
    { 
      label: 'จัดการหนังสือเรียน', 
      icon: 'Package',
      submenu: [
        { label: 'คลังหนังสือ', path: '/inventory', icon: 'Package' },
        { label: 'รับหนังสือจากสำนักพิมพ์', path: '/book-receipts', icon: 'Truck' },
        { label: 'เบิกหนังสือ', path: '/withdrawals', icon: 'FileOutput' },
        { label: 'รายงาน', path: '/reports', icon: 'FileText' },
      ]
    },
    { 
      label: 'การตั้งค่า', 
      icon: 'Settings',
      submenu: [
        { label: 'การจัดการผู้ใช้', path: '/users', icon: 'Users' },
        { label: 'การตั้งค่างบประมาณ', path: '/budget', icon: 'Wallet' },
        { label: 'ตั้งค่าผู้ใช้', path: '/profile', icon: 'UserCog' },
      ]
    },
  ],
  warehouse: [
    { label: 'แดชบอร์ด', path: '/dashboard', icon: 'LayoutDashboard' },
    { 
      label: 'จัดการหนังสือเรียน', 
      icon: 'Package',
      submenu: [
        { label: 'คลังหนังสือ', path: '/inventory', icon: 'Package' },
        { label: 'รับหนังสือจากสำนักพิมพ์', path: '/book-receipts', icon: 'Truck' },
        { label: 'รายงาน', path: '/reports', icon: 'FileText' },
      ]
    },
    { label: 'ตั้งค่าผู้ใช้', path: '/profile', icon: 'Settings' },
  ],
};