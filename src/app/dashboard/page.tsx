"use client";

import { useEffect, useState } from "react";
import SettingsPage from "../settings/page";

interface AnalyticsData {
  monthlyRevenue: number;
  activeRooms: number;
  totalCompleted: number;
}

interface Room {
  id: string;
  name: string;
  consoleType: string;
  hourlyRate: number;
  discountRate?: number;
  discountStart?: number;
  discountEnd?: number;
}

interface PendingReservation {
  id: string;
  customerName?: string;
  customerPhone?: string;
  transferToNumber?: string;
  isOpentime: boolean;
  startTime: string;
  endTime: string | null;
  totalPrice: number;
  transferImage?: string;
  room: { name: string; consoleType: string };
}

interface Activity {
  id: string;
  status: string;
  startTime: string;
  totalPrice: number;
  room?: {
    name: string;
    consoleType: string;
  };
}

const tabs = [
  { id: "add-room", label: "إضافة غرفة", icon: "🎮" },
  { id: "pending", label: "انتظار تأكيد", icon: "⏳" },
  { id: "overview", label: "نظرة عامة", icon: "📊" },
  { id: "settings", label: "الإعدادات", icon: "⚙️" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12 منتصف الليل" : i === 12 ? "12 ظهراً" : i < 12 ? `${i} صباحاً` : `${i - 12} مساءً`
}));

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState("add-room");
  const [showMenu, setShowMenu] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("dashboardAuthToken");
    if (token) {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        sessionStorage.setItem("dashboardAuthToken", data.token);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAuthError(errorData.message || "بيانات الدخول غير صحيحة");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError("خطأ في الاتصال بالخادم");
    }
  };

  const [newRoom, setNewRoom] = useState({ name: "", consoleType: "PS5", hourlyRate: 40, discountRate: "", discountStart: "", discountEnd: "" });
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations/pending`);
      const data = await res.json();
      setPendingReservations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch pending:", e);
    }
  };



  const fetchRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
    }
  };

  const fetchOverview = () => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/revenue`).then(res => res.json()).catch(() => ({})),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations`).then(res => res.json()).catch(() => ([]))
    ])
      .then(([analyticsData, reservationsData]) => {
        setData(analyticsData?.monthlyRevenue !== undefined ? analyticsData : { monthlyRevenue: 0, activeRooms: 0, totalCompleted: 0 });
        setRecentActivities(Array.isArray(reservationsData) ? reservationsData : []);
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch dashboard data:", error);
        setData({ monthlyRevenue: 0, activeRooms: 0, totalCompleted: 0 });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRooms();
    fetchPending();
    fetchOverview();

    const pendingTimer = setInterval(() => {
      fetchPending();
      fetchOverview();
    }, 3000);

    return () => clearInterval(pendingTimer);
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom),
      });
      if (res.ok) {
        setAddSuccess(true);
        setNewRoom({ name: "", consoleType: "PS5", hourlyRate: 40, discountRate: "", discountStart: "", discountEnd: "" });
        fetchRooms();
        setTimeout(() => setAddSuccess(false), 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAddError(errorData.message || "حدث خطأ أثناء إضافة الغرفة. تحقق من اتصال قاعدة البيانات.");
      }
    } catch (error) {
      console.error("Failed to add room:", error);
      setAddError("حدث خطأ في الاتصال بالخادم.");
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الغرفة؟")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms/${id}`, { method: "DELETE" });
      fetchRooms();
    } catch (error) {
      console.error("Failed to delete room:", error);
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms/${editingRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingRoom.name,
          consoleType: editingRoom.consoleType,
          hourlyRate: editingRoom.hourlyRate,
          discountRate: editingRoom.discountRate,
          discountStart: editingRoom.discountStart,
          discountEnd: editingRoom.discountEnd,
        }),
      });
      setEditingRoom(null);
      fetchRooms();
    } catch (error) {
      console.error("Failed to update room:", error);
    }
  };

  if (isAuthChecking) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] animate-in fade-in duration-500">
        <div className="glass-panel p-8 rounded-xl border border-white/10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-2">تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mb-6">أدخل البريد الإلكتروني وكلمة المرور للوصول إلى لوحة التحكم</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-primary text-white"
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-primary text-white"
              required
            />
            {authError && <p className="text-red-400 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full btn-primary py-3 text-lg font-bold">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background overflow-hidden" dir="rtl">

      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between md:hidden p-4 bg-card border-b border-border z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-md hover:bg-muted transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
        </div>
      </div>

      {/* Mobile Drawer Overlay & Menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden" onClick={() => setShowMenu(false)}>
          <aside className="w-[250px] sm:w-64 h-full bg-card p-4 animate-in slide-in-from-right flex flex-col shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <h2 className="text-xl font-bold">لوحة التحكم</h2>
              <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-muted rounded-full">✕</button>
            </div>

            <nav className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-2">القائمة</p>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === tab.id
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-border">
              <button
                onClick={() => {
                  sessionStorage.removeItem("dashboardAuthToken");
                  setIsAuthenticated(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-300"
              >
                <span className="text-xl">🚪</span>
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (matches the user's image) */}
      <aside className="hidden md:flex flex-col w-[280px] h-screen sticky top-0 bg-card border-l border-border p-6 shadow-sm z-10 shrink-0 overflow-y-auto" dir="rtl">
        <div className="flex flex-col items-center mb-10 mt-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <p className="text-xs text-muted-foreground mt-1">إدارة بلايستيشن برو</p>
        </div>

        <nav className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-2">الرئيسية</p>
          <div className="bg-background rounded-2xl p-2 shadow-sm border border-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 mb-1 last:mb-0 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md scale-[1.02]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-8">
          <button
            onClick={() => {
              sessionStorage.removeItem("dashboardAuthToken");
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-300 group"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform">🚪</span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 h-screen overflow-y-auto bg-background p-4 md:p-8 animate-in fade-in duration-500">

        {/* إضافة غرفة */}
        {activeTab === "add-room" && (
          <div className="space-y-6">
            {addSuccess && (
              <div className="glass-panel p-4 rounded-xl border border-green-500/30 bg-green-500/10 animate-in slide-in-from-top-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <p className="text-green-400 font-medium">تمت إضافة الغرفة بنجاح!</p>
              </div>
            )}
            {addError && (
              <div className="glass-panel p-4 rounded-xl border border-red-500/30 bg-red-500/10 animate-in slide-in-from-top-4 flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <p className="text-red-400 font-medium">{addError}</p>
              </div>
            )}
            <div className="glass-panel p-4 md:p-8 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg bg-primary/20 flex items-center justify-center text-base md:text-xl shrink-0">🎮</div>
                <div>
                  <h3 className="text-base md:text-xl font-bold">إضافة غرفة جديدة</h3>
                  <p className="text-[10px] md:text-sm text-muted-foreground">أدخل بيانات الغرفة وسيتم حفظها في النظام مباشرة.</p>
                </div>
              </div>
              <form onSubmit={handleAddRoom} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">اسم الغرفة / الرقم</label>
                    <input
                      required
                      type="text"
                      value={newRoom.name}
                      onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                      placeholder="مثال: غرفة VIP 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">نوع الجهاز</label>
                    <select
                      value={newRoom.consoleType}
                      onChange={e => setNewRoom({ ...newRoom, consoleType: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                    >
                      <option value="PS5">بلايستيشن 5</option>
                      <option value="PS4">بلايستيشن 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">سعر الساعة (جنيه)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={newRoom.hourlyRate}
                      onChange={e => setNewRoom({ ...newRoom, hourlyRate: Number(e.target.value) })}
                      className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                    />
                  </div>
                </div>

                {/* إعدادات الخصم (اختياري) */}
                <div className="border-t border-white/10 pt-4 md:pt-5 mt-2">
                  <h4 className="text-xs md:text-sm font-bold text-muted-foreground mb-3 md:mb-4">وقت الخصم (اختياري)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">السعر وقت الخصم (جنيه)</label>
                      <input
                        type="number"
                        min="0"
                        value={newRoom.discountRate}
                        onChange={e => setNewRoom({ ...newRoom, discountRate: e.target.value })}
                        className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                        placeholder="بدون خصم"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">من الساعة</label>
                      <select
                        value={newRoom.discountStart === "" ? "" : newRoom.discountStart}
                        onChange={e => setNewRoom({ ...newRoom, discountStart: e.target.value })}
                        className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                      >
                        <option value="">-- اختر --</option>
                        {HOURS.map(h => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">إلى الساعة</label>
                      <select
                        value={newRoom.discountEnd === "" ? "" : newRoom.discountEnd}
                        onChange={e => setNewRoom({ ...newRoom, discountEnd: e.target.value })}
                        className="w-full bg-input border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-primary text-white transition-all"
                      >
                        <option value="">-- اختر --</option>
                        {HOURS.map(h => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full md:w-auto px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base font-bold">
                  حفظ الغرفة
                </button>
              </form>
            </div>

            {/* قائمة الغرف الحالية */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-white/10 flex items-center justify-center text-sm md:text-base shrink-0">📋</div>
                <h3 className="text-base md:text-lg font-bold">الغرف الحالية</h3>
                <span className="mr-auto text-[10px] md:text-xs text-muted-foreground bg-white/5 px-2 md:px-3 py-0.5 md:py-1 rounded-full shrink-0">{rooms.length} غرفة</span>
              </div>
              {rooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-xl">
                  لا توجد غرف بعد. أضف أول غرفة من الفورم أعلاه!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map(room => (
                    <div key={room.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors group">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0 ${room.consoleType === 'PS5' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                          {room.consoleType}
                        </div>
                        <div>
                          <p className="font-semibold text-xs md:text-sm">{room.name}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-0">{room.hourlyRate} جنيه / ساعة</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 md:gap-2">
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="p-1 md:p-1.5 rounded-lg bg-secondary/20 text-secondary hover:bg-secondary/40 transition-colors text-[10px] md:text-xs"
                          title="تعديل"
                        >✏️</button>
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="p-1 md:p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/40 transition-colors text-[10px] md:text-xs"
                          title="حذف"
                        >🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ===== قسم انتظار التأكيد ===== */}
        {activeTab === "pending" && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-base">⏳</div>
                <h3 className="text-lg font-bold">حجوزات في انتظار تأكيد الدفع</h3>
                <span className="mr-auto text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold">
                  {pendingReservations.length} طلب
                </span>
                <button
                  onClick={fetchPending}
                  className="text-xs text-muted-foreground hover:text-white transition-colors px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >🔄 تحديث</button>
              </div>

              {pendingReservations.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
                  لا توجد حجوزات في انتظار التأكيد حالياً ✅
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReservations.map(res => {
                    let hours = "";
                    if (!res.isOpentime && res.endTime) {
                      hours = ((new Date(res.endTime).getTime() - new Date(res.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1);
                    }
                    return (
                      <div key={res.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xl shrink-0">💳</div>
                          <div>
                            <p className="font-bold">{res.room?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {res.customerName || "عميل غير مسجل"}
                              {res.customerPhone && <span className="text-primary ml-2">📞 {res.customerPhone}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {res.isOpentime ? <span className="font-bold text-green-400">فترة مفتوحة (Open Time)</span> : `${hours} ساعة`}
                              {res.transferToNumber && <span className="ml-2">· 💳 محول لـ: {res.transferToNumber.split(':')[0]}</span>}
                              <span className="ml-2">· 🕒 {new Date(res.startTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-extrabold text-yellow-400">{Math.ceil(res.totalPrice / 2)} جنيه</p>
                            <p className="text-xs text-muted-foreground">المبلغ المطلوب</p>
                          </div>
                          <div className="flex gap-2">
                            {res.transferImage && (
                              <button
                                onClick={() => setViewReceiptUrl(res.transferImage || null)}
                                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors text-sm font-bold"
                              >🖼️ الإيصال</button>
                            )}
                            <button
                              onClick={async () => {
                                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations/${res.id}/confirm-payment`, { method: "PATCH" });
                                fetchPending();
                              }}
                              className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors text-sm font-bold"
                            >✅ تأكيد الدفع</button>
                            <button
                              onClick={async () => {
                                if (!confirm("هل تريد رفض هذا الحجز؟")) return;
                                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations/${res.id}/reject-payment`, { method: "PATCH" });
                                fetchPending();
                              }}
                              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors text-sm font-bold"
                            >❌ رفض</button>
                          </div>
                        </div>
                      </div>
                    );

                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal صورة الإيصال */}
        {viewReceiptUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setViewReceiptUrl(null)}>
            <div className="relative max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-all"
              >✕</button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewReceiptUrl} alt="Receipt" className="object-contain max-h-[85vh] rounded-xl border border-white/20 shadow-2xl" />
            </div>
          </div>
        )}

        {/* Modal التعديل */}
        {editingRoom && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-background border border-border p-8 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
              <h3 className="text-2xl font-bold mb-6">تعديل الغرفة</h3>
              <form onSubmit={handleEditRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">اسم الغرفة</label>
                  <input
                    required
                    type="text"
                    value={editingRoom.name}
                    onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">نوع الجهاز</label>
                  <select
                    value={editingRoom.consoleType}
                    onChange={e => setEditingRoom({ ...editingRoom, consoleType: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  >
                    <option value="PS5">بلايستيشن 5</option>
                    <option value="PS4">بلايستيشن 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">سعر الساعة الأساسي (جنيه)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editingRoom.hourlyRate}
                    onChange={e => setEditingRoom({ ...editingRoom, hourlyRate: Number(e.target.value) })}
                    className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-sm font-bold text-muted-foreground mb-3">وقت الخصم (اختياري)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">السعر في الخصم</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRoom.discountRate || ""}
                        onChange={e => setEditingRoom({ ...editingRoom, discountRate: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">من الساعة</label>
                      <select
                        value={editingRoom.discountStart ?? ""}
                        onChange={e => setEditingRoom({ ...editingRoom, discountStart: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                      >
                        <option value="">-- اختر --</option>
                        {HOURS.map(h => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">إلى الساعة</label>
                      <select
                        value={editingRoom.discountEnd ?? ""}
                        onChange={e => setEditingRoom({ ...editingRoom, discountEnd: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                      >
                        <option value="">-- اختر --</option>
                        {HOURS.map(h => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="submit" className="btn-primary flex-1">حفظ التعديلات</button>
                  <button type="button" onClick={() => setEditingRoom(null)} className="btn-secondary flex-1">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نظرة عامة */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-4 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">الإيراد الشهري</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-4xl font-extrabold text-white">{data?.monthlyRevenue.toLocaleString()} جنيه</span>
                  <span className="text-sm text-green-400 font-medium">+12.5%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">مقارنة بالشهر الماضي</p>
              </div>
              <div className="glass-panel p-4 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">الغرف النشطة حالياً</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-4xl font-extrabold text-white">{data?.activeRooms}</span>
                  <span className="text-sm text-muted-foreground font-medium">/ 10 إجمالي</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">يجري اللعب فيها الآن</p>
              </div>
              <div className="glass-panel p-4 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">الجلسات المكتملة</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">{data?.totalCompleted}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">خلال هذا الشهر</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="p-4 md:p-6 rounded-2xl flex flex-col bg-transparent">
                <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 pb-3 md:pb-4 border-b border-white/10 text-right">النشاطات الأخيرة</h3>
                <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4">
                  {recentActivities.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-4">لا توجد نشاطات حالياً</p>
                  ) : (
                    recentActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-[#111111] dark:bg-[#111111] border border-white/5 shadow-sm hover:bg-[#1a1a1a] transition-all gap-2">

                        <div className="flex items-center gap-2 md:gap-4 text-right flex-1 min-w-0">
                          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] md:text-xs font-bold shrink-0">
                            {activity.room?.consoleType === 'PS5' ? 'PS5' : 'PS4'}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <p className="font-bold text-xs md:text-sm text-white truncate">
                              {activity.status === 'completed' ? 'انتهت جلسة' : 'بدأت جلسة'} {activity.room?.name}
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
                              {new Date(activity.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 mr-1">
                          {activity.totalPrice > 0 && (
                            <span className="text-[#22c55e] font-bold text-xs md:text-sm whitespace-nowrap">+{activity.totalPrice} ج</span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الإعدادات */}
        {activeTab === "settings" && (
          <div className="bg-black/20 rounded-2xl border border-white/5 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
            <SettingsPage />
          </div>
        )}
      </main>
    </div>
  );
}
