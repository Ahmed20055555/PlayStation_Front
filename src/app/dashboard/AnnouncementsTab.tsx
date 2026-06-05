"use client";

import { useState, useEffect } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: string | null;
  createdAt: string;
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: "", content: "", targetRole: "" });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnn),
      });
      if (res.ok) {
        setNewAnn({ title: "", content: "", targetRole: "" });
        setShowAdd(false);
        fetchAnnouncements();
      }
    } catch (err) {
      alert("خطأ في الاتصال");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الإعلان؟")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements/${id}`, { method: "DELETE" });
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">الإعلانات والتنبيهات</h2>
          <p className="text-muted-foreground text-sm">أرسل رسائل وتنبيهات لموظفيك لتظهر في لوحتهم</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary py-2 px-4 rounded-xl">
          {showAdd ? "إلغاء" : "📢 إعلان جديد"}
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-6 rounded-xl border border-primary/20 mb-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">عنوان الإعلان</label>
              <input required value={newAnn.title} onChange={e => setNewAnn({ ...newAnn, title: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" placeholder="مثال: خصم جديد بمناسبة العيد" />
            </div>
            <div>
              <label className="block text-sm mb-1">المحتوى والتفاصيل</label>
              <textarea required value={newAnn.content} onChange={e => setNewAnn({ ...newAnn, content: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white min-h-[100px]" placeholder="اكتب تفاصيل الإعلان هنا..."></textarea>
            </div>
            <div>
              <label className="block text-sm mb-1">توجيه إلى (اختياري)</label>
              <select value={newAnn.targetRole} onChange={e => setNewAnn({ ...newAnn, targetRole: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white max-w-xs">
                <option value="">الكل (جميع الموظفين)</option>
                <option value="employee">الموظفين العاديين فقط</option>
                <option value="manager">المديرين فقط</option>
              </select>
            </div>
            <button type="submit" className="btn-primary px-8 py-2.5 rounded-xl mt-2">نشر الإعلان</button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground">جاري التحميل...</p>
      ) : announcements.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">لا توجد إعلانات سابقة</div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id} className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    📢
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{ann.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      {new Date(ann.createdAt).toLocaleDateString('ar-EG')} - {ann.targetRole ? `موجه لـ: ${ann.targetRole}` : 'موجه للكل'}
                    </p>
                    <p className="text-white/80 text-sm whitespace-pre-wrap">{ann.content}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(ann.id)} className="text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-sm shrink-0">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
