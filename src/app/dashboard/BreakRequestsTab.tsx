"use client";

import { useState, useEffect } from "react";

interface BreakRequest {
  id: string;
  employeeId: string;
  type: string;
  reason: string;
  duration: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  employee: {
    name: string;
    username: string;
    role: string;
  };
}

export default function BreakRequestsTab() {
  const [requests, setRequests] = useState<BreakRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = filter === "all"
        ? `${process.env.NEXT_PUBLIC_API_URL}/break-requests`
        : `${process.env.NEXT_PUBLIC_API_URL}/break-requests?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleAction = async (id: string, status: string, adminNote?: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/break-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (e) {
      alert("خطأ بالاتصال");
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'approved') return { text: 'تمت الموافقة ✅', cls: 'bg-green-500/20 text-green-400 border-green-500/20' };
    if (s === 'rejected') return { text: 'مرفوض ❌', cls: 'bg-red-500/20 text-red-400 border-red-500/20' };
    return { text: 'في الانتظار ⏳', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' };
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">طلبات الأذونات والبريك</h2>
          <p className="text-muted-foreground text-sm">وافق أو ارفض طلبات الموظفين</p>
        </div>
        <div className="flex items-center gap-2">
          {["pending", "approved", "rejected", "all"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f === 'pending' ? '⏳ قيد الانتظار' : f === 'approved' ? '✅ مقبول' : f === 'rejected' ? '❌ مرفوض' : '📋 الكل'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
          لا توجد طلبات {filter === 'pending' ? 'في الانتظار' : ''} حالياً
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const st = statusLabel(req.status);
            return (
              <div key={req.id} className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                  {/* Request Info */}
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center text-2xl shrink-0">
                      {req.type === 'break' ? '☕' : '🚪'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{req.employee.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.text}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {req.type === 'break' ? 'طلب بريك' : 'طلب إذن'} • المدة: {req.duration || 'غير محدد'} • {new Date(req.createdAt).toLocaleString('ar-EG')}
                      </p>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <p className="text-sm text-white/80">📝 السبب: {req.reason}</p>
                      </div>
                      {req.adminNote && (
                        <p className="text-xs text-blue-400 mt-2">💬 ملاحظتك: {req.adminNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleAction(req.id, 'approved')}
                        className="flex-1 sm:flex-none bg-green-500/20 hover:bg-green-500/30 text-green-400 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border border-green-500/20"
                      >
                        ✅ موافقة
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt("سبب الرفض (اختياري):");
                          handleAction(req.id, 'rejected', note || undefined);
                        }}
                        className="flex-1 sm:flex-none bg-red-500/20 hover:bg-red-500/30 text-red-400 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border border-red-500/20"
                      >
                        ❌ رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
