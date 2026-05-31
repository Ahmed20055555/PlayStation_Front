import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="glass-panel p-12 rounded-2xl text-center max-w-2xl mx-auto border border-primary/20">
        <h1 className="text-5xl font-extrabold mb-6 leading-tight">
          أهلاً بك في <span className="neon-text">PS Lounge Pro</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          النظام الأمثل والمتكامل لإدارة غرف وحجوزات البلايستيشن، ومتابعة الأرباح والإيرادات. مصمم باحترافية لتجربة مستخدم مذهلة وسلسة.
        </p>
        
        <div className="flex space-x-6 space-x-reverse justify-center">
          <Link href="/rooms" className="btn-secondary text-lg px-8 py-6 rounded-xl">
            إدارة الغرف
          </Link>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="fixed top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>
  );
}
