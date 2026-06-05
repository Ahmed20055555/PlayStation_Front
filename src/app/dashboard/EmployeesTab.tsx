"use client";

import { useState, useEffect } from "react";

interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
  phone: string | null;
  shift: string | null;
  salary: number | null;
  isActive: boolean;
}

export default function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", username: "", password: "", role: "employee", phone: "", shift: "", salary: "" });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      setError("خطأ في جلب بيانات الموظفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      if (res.ok) {
        setNewEmp({ name: "", username: "", password: "", role: "employee", phone: "", shift: "", salary: "" });
        setShowAdd(false);
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.message || "حدث خطأ");
      }
    } catch (err) {
      alert("خطأ في الاتصال");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف الموظف؟")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees/${id}`, { method: "DELETE" });
      fetchEmployees();
    } catch (err) {
      alert("خطأ في الاتصال");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">إدارة الموظفين</h2>
          <p className="text-muted-foreground text-sm">أضف وحذف وعدل بيانات موظفي البلايستيشن</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary py-2 px-4 rounded-xl">
          {showAdd ? "إلغاء" : "➕ إضافة موظف"}
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-6 rounded-xl border border-primary/20 mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">الاسم</label>
              <input required value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm mb-1">اسم المستخدم (للدخول)</label>
              <input required value={newEmp.username} onChange={e => setNewEmp({ ...newEmp, username: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">كلمة المرور</label>
              <input required type="password" value={newEmp.password} onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">الدور</label>
              <select value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white">
                <option value="employee">موظف (كاشير/عامل)</option>
                <option value="manager">مدير فرع</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الوردية</label>
              <input value={newEmp.shift} onChange={e => setNewEmp({ ...newEmp, shift: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" placeholder="مثال: صباحي" />
            </div>
            <div>
              <label className="block text-sm mb-1">الراتب</label>
              <input type="number" value={newEmp.salary} onChange={e => setNewEmp({ ...newEmp, salary: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 mt-2">
              <button type="submit" className="btn-primary w-full md:w-auto px-8 py-2.5 rounded-xl">حفظ الموظف</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground">جاري التحميل...</p>
      ) : employees.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">لا يوجد موظفين حالياً</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp.id} className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center text-xl border border-white/10">
                    👤
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{emp.name}</h3>
                    <p className="text-xs text-primary">{emp.role === 'manager' ? 'مدير' : 'موظف'}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(emp.id)} className="text-red-400 hover:text-red-300 text-sm bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded">حذف</button>
              </div>
              
              <div className="space-y-2 text-sm text-white/70 relative z-10">
                <p>📛 المستخدم: <span className="text-white font-medium">{emp.username}</span></p>
                {emp.shift && <p>⏱️ الوردية: <span className="text-white font-medium">{emp.shift}</span></p>}
                {emp.salary && <p>💰 الراتب: <span className="text-white font-medium">{emp.salary} ج</span></p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
