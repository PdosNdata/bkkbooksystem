const features = [
  {
    title: 'สั่งซื้อง่าย',
    desc: 'ระบบคัดเลือกออนไลน์ เชื่อมโยงฐานข้อมูลหนังสือเรียนมาตรฐาน',
    icon: '🛒',
  },
  {
    title: 'ติดตามสถานะ Real-time',
    desc: 'ตรวจสอบการสั่งซื้อ การอนุมัติ และการจัดส่งได้ทันที',
    icon: '📍',
  },
  {
    title: 'รายงานโปร่งใส',
    desc: 'สรุปงบประมาณและการเบิกจ่าย ตรวจสอบย้อนหลังได้',
    icon: '📊',
  },
]

export default function FeatureSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center dark:text-white">
          ฟีเจอร์เด่นเพื่อการศึกษา
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mt-3">
          ระบบที่ออกแบบมาเพื่อลดภาระงานเอกสาร
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
              <div className="text-4xl">{f.icon}</div>
              <h3 className="mt-4 text-xl font-semibold dark:text-white">{f.title}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}