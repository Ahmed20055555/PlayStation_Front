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
          <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <h1 className="text-2xl font-bold neon-text tracking-wider">PS LOUNGE PRO</h1>
              <nav className="flex space-x-6 space-x-reverse">
                <a href="/rooms" className="text-sm font-medium hover:text-primary transition-colors">إدارة الغرف</a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
