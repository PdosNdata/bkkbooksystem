export default function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold dark:text-white">
            เริ่มต้นใช้งานระบบ <span className="text-blue-600 dark:text-blue-400">Education Book System</span> วันนี้
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            ยกระดับการบริหารจัดการหนังสือเรียนให้มีประสิทธิภาพ โปร่งใส และตรวจสอบได้
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <button className="btn-primary">ลงชื่อเข้าใช้งาน</button>
            <button className="btn-outline">ติดต่อฝ่ายบริการลูกค้า</button>
          </div>
        </div>
      </div>
    </section>
  )
}