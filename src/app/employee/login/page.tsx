"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("employeeAuthToken");
    if (token) {
      router.push("/employee/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("employeeAuthToken", data.token);
        sessionStorage.setItem("employeeData", JSON.stringify(data.employee));
        router.push("/employee/dashboard");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || "بيانات الدخول غير صحيحة");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-xl border border-white/10 max-w-sm w-full text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 relative z-10 border border-blue-500/20">
          👤
        </div>
        <h2 className="text-2xl font-bold mb-2 relative z-10">بوابة الموظفين</h2>
        <p className="text-sm text-muted-foreground mb-6 relative z-10">أدخل بياناتك للوصول إلى لوحتك الخاصة</p>
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <input
            type="text"
            placeholder="اسم المستخدم"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            dir="ltr"
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            dir="ltr"
            required
          />
          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-bold transition-colors">
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
