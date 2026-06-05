"use client";

import { useState, useEffect } from "react";

interface AttendanceLog {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  date: string;
  employee: {
    name: string;
    username: string;
    role: string;
  };
}

export default function AttendanceTab() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance?date=${filterDate}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [filterDate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">سجل الحضور والانصراف</h2>
          <p className="text-muted-foreground text-sm">تابع دوام الموظفين وساعات عملهم</p>
        </div>
        <div className="flex items-center gap-2 bg-input border border-border p-2 rounded-xl">
          <span className="text-sm">📅 التاريخ:</span>
          <input 
            type="date" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-transparent text-white focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">جاري التحميل...</p>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
          لا يوجد سجل حضور لهذا اليوم ({filterDate})
        </div>
      ) : (
        <div className="overflow-x-auto glass-panel rounded-xl border border-white/5">
          <table className="w-full text-right text-sm">
            <thead className="bg-black/40 border-b border-white/10 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">الموظف</th>
                <th className="px-6 py-4 font-medium">وقت الدخول</th>
                <th className="px-6 py-4 font-medium">وقت الخروج</th>
                <th className="px-6 py-4 font-medium">ساعات العمل</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(log => {
                let hoursWorked = "-";
                if (log.clockOut) {
                    const start = new Date(log.clockIn);
                    const end = new Date(log.clockOut);
                    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    hoursWorked = diff.toFixed(1) + " ساعة";
                }
                const isActive = !log.clockOut;

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{log.employee.name}</div>
                      <div className="text-xs text-muted-foreground">{log.employee.role}</div>
                    </td>
                    <td className="px-6 py-4 text-green-400 font-medium">
                      {new Date(log.clockIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-red-400 font-medium">
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </td>
                    <td className="px-6 py-4 text-white/80">{hoursWorked}</td>
                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">متواجد الآن</span>
                      ) : (
                        <span className="bg-white/10 text-white/50 px-3 py-1 rounded-full text-xs font-bold">انتهى دوامه</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
