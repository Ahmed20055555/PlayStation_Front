import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative w-full -mt-14 sm:-mt-16" style={{ minHeight: "100dvh" }}>

      {/* Background Image - True Full Screen */}
      <Image
        src="/background.png"
        alt="PlayStation background"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        quality={90}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Content - Centered Vertically & Horizontally */}
      <div
        className="relative z-10 w-full flex flex-col items-center justify-center text-center px-2 sm:px-2 animate-fade-in-up"
        style={{ minHeight: "100dvh" }}
      >
        {/* Header */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 tracking-tight text-white leading-tight drop-shadow-lg">
          PS Lounge <span className="text-blue-400">Pro</span>
        </h1>

        <p className="text-sm sm:text-lg md:text-xl text-white/75 mb-8 sm:mb-10 max-w-xs sm:max-w-2xl mx-auto leading-relaxed drop-shadow">
          نظام متكامل ومبسط لإدارة غرف وحجوزات البلايستيشن.
          تابع أرباحك وإيراداتك بسهولة واحترافية.
        </p>

        {/* CTA Box */}
        <Link href="/rooms" className="w-full max-w-xs sm:max-w-sm group">
          <div className="p-5 sm:p-8 rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md shadow-2xl flex flex-col items-center text-center transition-all duration-300 hover:border-blue-400/50 hover:bg-black/55 active:scale-95 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-blue-500/25 transition-all duration-300 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transform group-hover:translate-x-1 transition-transform rotate-180">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-1.5 sm:mb-2">احجز غرفة الآن</h3>
            <p className="text-xs text-white/55 leading-relaxed">اضغط هنا للانتقال إلى صفحة إدارة وحجز الغرف</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
