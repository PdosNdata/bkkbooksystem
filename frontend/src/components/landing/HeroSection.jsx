import { useNavigate } from 'react-router-dom'

export default function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        
        {/* Left */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight dark:text-white">
            ระบบบริหารจัดการ<br />
            <span className="text-blue-600 dark:text-blue-400">หนังสือเรียนฟรี</span><br />
            ครบวงจร
          </h1>

          <p className="mt-6 text-gray-600 dark:text-gray-300">
            สำหรับโรงเรียนบ้านค้อดอนแคน ในระดับอนุบาลถึงมัธยมศึกษาปีที่ 3  
            สะดวก รวดเร็ว ตรวจสอบได้ ช่วยให้การจัดการงบประมาณและการสั่งซื้อเป็นเรื่องง่าย
          </p>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              ลงชื่อเข้าใช้งาน
            </button>

            <button className="btn-outline">
              คู่มือการใช้งาน
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="bg-violet-400 w-full rounded-sm p-2 shadow-lg">
          <img
            src="/src/assets/images/pic1.png"
            alt="Education"
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}
