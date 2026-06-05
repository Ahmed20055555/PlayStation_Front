"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: string | null;
  createdAt: string;
}

interface AttendanceLog {
  id: string;
  clockIn: string;
  clockOut: string | null;
}

interface BreakRequest {
  id: string;
  type: string;
  reason: string;
  duration: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeLog, setActiveLog] = useState<AttendanceLog | null>(null);
  const [breakRequests, setBreakRequests] = useState<BreakRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Break request form
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [breakForm, setBreakForm] = useState({ type: "break", reason: "", duration: "15 دقيقة" });

  useEffect(() => {
    const token = sessionStorage.getItem("employeeAuthToken");
    const empData = sessionStorage.getItem("employeeData");
    if (!token || !empData) {
      router.push("/employee/login");
      return;
    }
    setEmployee(JSON.parse(empData));
  }, [router]);

  const fetchBreakRequests = async (empId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/break-requests?employeeId=${empId}`);
      if (res.ok) {
        const data: BreakRequest[] = await res.json();
        setBreakRequests(data);
      }
    } catch (e) {
      console.error("Error fetching break requests", e);
    }
  };

  useEffect(() => {
    if (!employee) return;
    
    const fetchData = async () => {
      try {
        // Fetch Announcements
        const annRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements`);
        if (annRes.ok) {
          const allAnns: Announcement[] = await annRes.json();
          const filtered = allAnns.filter(a => !a.targetRole || a.targetRole === employee.role);
          setAnnouncements(filtered);
        }

        // Fetch Today's Attendance
        const today = new Date().toISOString().split('T')[0];
        const attRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance?employeeId=${employee.id}&date=${today}`);
        if (attRes.ok) {
            const logs: AttendanceLog[] = await attRes.json();
            const active = logs.find(l => !l.clockOut);
            setActiveLog(active || null);
        }

        // Fetch Break Requests
        await fetchBreakRequests(employee.id);
      } catch (e) {
        console.error("Error fetching employee data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employee]);

  const handleClockIn = async () => {
    if (!employee) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id })
      });
      if (res.ok) {
        const log = await res.json();
        setActiveLog(log);
      } else {
        alert("لا يمكن تسجيل الدخول. قد تكون مسجلاً بالفعل.");
      }
    } catch (e) {
      alert("خطأ بالاتصال");
    }
  };

  const handleClockOut = async () => {
    if (!employee) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id })
      });
      if (res.ok) {
        setActiveLog(null);
        alert("تم تسجيل الخروج بنجاح. شكراً لك!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "حدث خطأ أثناء تسجيل الخروج");
      }
    } catch (e) {
      alert("خطأ بالاتصال");
    }
  };

  const handleBreakRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/break-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, ...breakForm })
      });
      if (res.ok) {
        setShowBreakForm(false);
        setBreakForm({ type: "break", reason: "", duration: "15 دقيقة" });
        await fetchBreakRequests(employee.id);
      } else {
        alert("حدث خطأ أثناء إرسال الطلب");
      }
    } catch (e) {
      alert("خطأ بالاتصال");
    }
  };

  const handleLogout = () => {
      sessionStorage.removeItem("employeeAuthToken");
      sessionStorage.removeItem("employeeData");
      router.push("/employee/login");
  };

  if (loading || !employee) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
  }

  const statusLabel = (s: string) => {
    if (s === 'approved') return { text: 'تمت الموافقة ✅', cls: 'bg-green-500/20 text-green-400 border-green-500/20' };
    if (s === 'rejected') return { text: 'مرفوض ❌', cls: 'bg-red-500/20 text-red-400 border-red-500/20' };
    return { text: 'في الانتظار ⏳', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' };
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 animate-in fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-3xl border border-blue-500/20">
              👤
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">مرحباً، {employee.name}</h1>
              <p className="text-muted-foreground">{employee.role === 'manager' ? 'مدير فرع' : 'موظف'}</p>
            </div>
        </div>
        <button onClick={handleLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          تسجيل الخروج 🚪
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Attendance + Break Request */}
        <div className="md:col-span-1 space-y-6">
            {/* Attendance Action */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group flex flex-col items-center justify-center text-center">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-colors ${activeLog ? 'bg-green-500/20' : 'bg-white/5'}`}></div>
              <h2 className="text-xl font-bold mb-2 z-10">الحضور والانصراف</h2>
              <p className="text-sm text-muted-foreground mb-6 z-10">
                {activeLog ? 'أنت الآن في فترة الدوام ⏱️' : 'سجل بداية ورديتك 🟢'}
              </p>
              
              <div className="z-10 w-full">
                {activeLog ? (
                    <button onClick={handleClockOut} className="w-full bg-red-600/90 hover:bg-red-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span>تسجيل الخروج</span>
                        <span>🛑</span>
                    </button>
                ) : (
                    <button onClick={handleClockIn} className="w-full bg-green-600/90 hover:bg-green-600 text-white py-4 rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span>تسجيل الدخول</span>
                        <span>✅</span>
                    </button>
                )}
              </div>
              
              {activeLog && (
                  <p className="mt-4 text-xs text-green-400 z-10 font-bold bg-green-500/10 px-3 py-1.5 rounded-full">
                      وقت الدخول: {new Date(activeLog.clockIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
              )}
            </div>

            {/* Break / Permission Request */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -ml-8 -mt-8"></div>
              <div className="flex items-center justify-between mb-4 z-10 relative">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">☕</span>
                  <h2 className="text-lg font-bold">طلب إذن / بريك</h2>
                </div>
              </div>
              
              {!showBreakForm ? (
                <button onClick={() => setShowBreakForm(true)} className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 py-3 rounded-xl font-bold transition-all active:scale-95 border border-orange-500/20 z-10 relative">
                  📝 تقديم طلب جديد
                </button>
              ) : (
                <form onSubmit={handleBreakRequest} className="space-y-3 z-10 relative">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">نوع الطلب</label>
                    <select value={breakForm.type} onChange={e => setBreakForm({...breakForm, type: e.target.value})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white text-sm">
                      <option value="break">بريك ☕</option>
                      <option value="permission">إذن 🚪</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">المدة</label>
                    <select value={breakForm.duration} onChange={e => setBreakForm({...breakForm, duration: e.target.value})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white text-sm">
                      <option value="15 دقيقة">15 دقيقة</option>
                      <option value="30 دقيقة">30 دقيقة</option>
                      <option value="ساعة">ساعة</option>
                      <option value="ساعتين">ساعتين</option>
                      <option value="باقي اليوم">باقي اليوم</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">السبب</label>
                    <textarea required value={breakForm.reason} onChange={e => setBreakForm({...breakForm, reason: e.target.value})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white text-sm min-h-[60px]" placeholder="اكتب السبب..."></textarea>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-orange-500/90 hover:bg-orange-500 text-white py-2 rounded-xl font-bold text-sm transition-all">إرسال</button>
                    <button type="button" onClick={() => setShowBreakForm(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 py-2 rounded-xl font-bold text-sm transition-all">إلغاء</button>
                  </div>
                </form>
              )}

              {/* Recent Requests */}
              {breakRequests.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 z-10 relative">
                  <p className="text-xs text-muted-foreground font-bold mb-2">طلباتك الأخيرة:</p>
                  {breakRequests.slice(0, 5).map(req => {
                    const st = statusLabel(req.status);
                    return (
                      <div key={req.id} className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">{req.type === 'break' ? '☕ بريك' : '🚪 إذن'} - {req.duration}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.text}</span>
                        </div>
                        <p className="text-[11px] text-white/60">{req.reason}</p>
                        {req.adminNote && <p className="text-[11px] text-blue-400 mt-1">💬 رد المدير: {req.adminNote}</p>}
                        <p className="text-[9px] text-white/30 mt-1">{new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>

        {/* Announcements */}
        <div className="md:col-span-2">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 h-full">
              <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                  <span className="text-2xl">📢</span>
                  <h2 className="text-xl font-bold">لوحة الإعلانات</h2>
              </div>

              {announcements.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                      لا توجد إعلانات أو تنبيهات جديدة 🌟
                  </div>
              ) : (
                  <div className="space-y-4">
                      {announcements.map(ann => (
                          <div key={ann.id} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-bold text-lg text-blue-400">{ann.title}</h3>
                                  <span className="text-[10px] text-muted-foreground bg-black/40 px-2 py-1 rounded-md">
                                      {new Date(ann.createdAt).toLocaleDateString('ar-EG')}
                                  </span>
                              </div>
                              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                          </div>
                      ))}
                  </div>
              )}
            </div>
        </div>

      </div>
    </div>
  );
}
