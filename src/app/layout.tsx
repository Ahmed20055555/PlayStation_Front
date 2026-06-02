import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

const cairo = Cairo({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "لوحة تحكم بلايستيشن برو | إدارة الحجوزات",
  description: "نظام إدارة غرف وحجوزات البلايستيشن الخاص بك بسهولة واحترافية.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let playstationName = "Lounge Pro";
  let logoImage = "";

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.playstationName) playstationName = data.playstationName;
      if (data.logoImage) logoImage = data.logoImage;
    }
  } catch (error) {
    console.error("Error fetching settings for layout:", error);
  }

  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-white/5 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-start gap-2">
              {logoImage ? (
                <img src={logoImage} alt={playstationName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded" />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-foreground flex items-center justify-center">
                  <span className="text-background font-bold text-[10px] sm:text-sm">PS</span>
                </div>
              )}
              <h1 className="text-base sm:text-lg font-bold tracking-tight">{playstationName}</h1>
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
