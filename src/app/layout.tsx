import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "لوحة تحكم بلايستيشن برو | إدارة الحجوزات",
  description: "نظام إدارة غرف وحجوزات البلايستيشن الخاص بك بسهولة واحترافية.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-white/5 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-foreground flex items-center justify-center">
                  <span className="text-background font-bold text-[10px] sm:text-sm">PS</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight hidden sm:block">
                  <span className="text-foreground">Lounge</span> <span className="text-muted-foreground">Pro</span>
                </h1>
              </div>
              <nav className="flex items-center gap-2 sm:gap-4">
                <a href="/rooms" className="text-[11px] sm:text-sm font-medium hover:text-foreground text-muted-foreground transition-colors">إدارة الغرف</a>
                <a href="#" className="text-[11px] sm:text-sm font-medium hover:text-foreground text-muted-foreground transition-colors hidden sm:block">التقارير</a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
