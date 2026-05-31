"use client";

import { useState, useEffect } from "react";

interface Reservation {
  id: number;
  status: string;
}

interface Room {
  id: string;
  name: string;
  consoleType: string;
  hourlyRate: number;
  discountRate?: number;
  discountStart?: number;
  discountEnd?: number;
  reservations?: Reservation[];
}

// ← غيّر الأرقام دي لأرقامك الحقيقية
const INSTAPAY_NUMBER = "01012345678";
const VODAFONE_CASH_NUMBER = "01098765432";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservingRoom, setReservingRoom] = useState<Room | null>(null);
  const [reservationForm, setReservationForm] = useState({ customerName: "", customerPhone: "", transferToNumber: "", isOpentime: true, startTimeInput: "", endTimeInput: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  // step: 'form' | 'payment' | 'done'
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const timeTimer = setInterval(() => setNow(new Date()), 60_000);
    const roomsTimer = setInterval(fetchRooms, 3000);
    return () => {
      clearInterval(timeTimer);
      clearInterval(roomsTimer);
    };
  }, []);

  const getEffectiveRate = (room: Room) => {
    if (room.discountRate == null || room.discountStart == null || room.discountEnd == null) {
      return { rate: room.hourlyRate, isDiscounted: false };
    }
    const currentHour = now.getHours();
    const start = room.discountStart;
    const end = room.discountEnd;
    let isDiscountActive = false;
    if (start < end) {
      isDiscountActive = currentHour >= start && currentHour < end;
    } else {
      isDiscountActive = currentHour >= start || currentHour < end;
    }
    return isDiscountActive
      ? { rate: room.discountRate, isDiscounted: true }
      : { rate: room.hourlyRate, isDiscounted: false };
  };

  const openReservation = (room: Room) => {
    setReservingRoom(room);
    setReservationForm({ customerName: "", customerPhone: "", transferToNumber: "", isOpentime: true, startTimeInput: "", endTimeInput: "" });
    setStep("form");
    setTotalPrice(0);
  };

  const getCalculatedHours = () => {
    if (reservationForm.isOpentime || !reservationForm.startTimeInput || !reservationForm.endTimeInput) return 0;
    const startH = Number(reservationForm.startTimeInput);
    const endH = Number(reservationForm.endTimeInput);
    if (isNaN(startH) || isNaN(endH)) return 0;
    let diff = endH - startH;
    if (diff <= 0) diff += 12;
    return diff;
  };

  const getStartEndDates = () => {
    let start = new Date();
    let end = new Date();
    if (!reservationForm.isOpentime && reservationForm.startTimeInput && reservationForm.endTimeInput) {
      const targetH = Number(reservationForm.startTimeInput);
      let current12 = start.getHours() % 12 || 12;
      let diffCurrent = targetH - current12;
      if (diffCurrent < -6) diffCurrent += 12;
      if (diffCurrent > 6) diffCurrent -= 12;

      start.setHours(start.getHours() + diffCurrent, 0, 0, 0);

      const hours = getCalculatedHours();
      end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    } else {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    return { start, end };
  };

  const closeModal = () => {
    setReservingRoom(null);
    setStep("form");
  };

  // الخطوة الأولى: حساب السعر والانتقال لصفحة الدفع
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservingRoom) return;
    const rate = getEffectiveRate(reservingRoom).rate;
    if (reservationForm.isOpentime) {
      setTotalPrice(rate); // 1 hour deposit
    } else {
      const hours = getCalculatedHours();
      if (hours === 0) {
        alert("يرجى التأكد من إدخال وقت صحيح (من - إلى)");
        return;
      }
      setTotalPrice(Math.round(hours * rate));
    }
    setStep("payment");
  };

  // الخطوة الثانية: تسجيل الحجز كـ pending_payment بعد أن يؤكد العميل التحويل
  const handleConfirmTransfer = async () => {
    if (!reservingRoom) return;
    setIsSubmitting(true);
    const { start, end } = getStartEndDates();
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: reservingRoom.id,
          customerName: reservationForm.customerName,
          customerPhone: reservationForm.customerPhone,
          transferToNumber: reservationForm.transferToNumber,
          isOpentime: reservationForm.isOpentime,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      setStep("done");
      fetchRooms();
    } catch (error) {
      console.error("Failed to reserve room:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ===== Modal ===== */}
      {reservingRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">

            {/* ---- خطوة 1: الفورم ---- */}
            {step === "form" && (
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6 text-center">حجز الغرفة</h3>
                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">اسم العميل (اختياري)</label>
                      <input
                        type="text"
                        value={reservationForm.customerName}
                        onChange={e => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                        className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                        placeholder="اسم العميل"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">رقم تليفون العميل</label>
                      <input
                        type="tel"
                        required
                        value={reservationForm.customerPhone}
                        onChange={e => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                        className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                        placeholder="رقم الموبايل"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">الرقم اللي هيحول عليه الفلوس</label>
                    <select
                      required
                      value={reservationForm.transferToNumber}
                      onChange={e => setReservationForm({ ...reservationForm, transferToNumber: e.target.value })}
                      className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white"
                    >
                      <option value="">-- اختر الرقم --</option>
                      <option value={`InstaPay: ${INSTAPAY_NUMBER}`}>إنستا باي - {INSTAPAY_NUMBER}</option>
                      <option value={`Vodafone Cash: ${VODAFONE_CASH_NUMBER}`}>فودافون كاش - {VODAFONE_CASH_NUMBER}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3 mb-2 bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="timeType"
                          checked={reservationForm.isOpentime}
                          onChange={() => setReservationForm({ ...reservationForm, isOpentime: true })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium">فترة مفتوحة (Open Time)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="timeType"
                          checked={!reservationForm.isOpentime}
                          onChange={() => setReservationForm({ ...reservationForm, isOpentime: false })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium">تحديد وقت (من - إلى)</span>
                      </label>
                    </div>

                    {!reservationForm.isOpentime && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">من الساعة (رقم بس)</label>
                          <input
                            required={!reservationForm.isOpentime}
                            type="number"
                            min="1"
                            max="12"
                            value={reservationForm.startTimeInput}
                            onChange={e => setReservationForm({ ...reservationForm, startTimeInput: e.target.value })}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white text-center text-xl font-bold"
                            placeholder="مثال: 12"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">إلى الساعة (رقم بس)</label>
                          <input
                            required={!reservationForm.isOpentime}
                            type="number"
                            min="1"
                            max="12"
                            value={reservationForm.endTimeInput}
                            onChange={e => setReservationForm({ ...reservationForm, endTimeInput: e.target.value })}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-white text-center text-xl font-bold"
                            placeholder="مثال: 2"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* معاينة السعر لحظية */}
                  {(reservationForm.isOpentime || getCalculatedHours() > 0) && (
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">المبلغ المطلوب (عربون)</p>
                      <p className="text-3xl font-extrabold text-primary">
                        {reservationForm.isOpentime ? Math.ceil(getEffectiveRate(reservingRoom).rate / 2) : Math.ceil((getCalculatedHours() * getEffectiveRate(reservingRoom).rate) / 2)} جنيه
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reservationForm.isOpentime ? 'عربون نص تمن ساعة للفترة المفتوحة' : `عربون نص مبلغ الـ ${getCalculatedHours()} ساعات`}
                        {getEffectiveRate(reservingRoom).isDiscounted && (
                          <span className="text-green-400 mr-1"> 🏷️ (سعر خصم)</span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 py-3">التالي: طريقة الدفع →</button>
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1 py-3">إلغاء</button>
                  </div>
                </form>
              </div>
            )}

            {/* ---- خطوة 2: الدفع ---- */}
            {step === "payment" && (
              <div>
                {/* رأس المبلغ */}
                <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-6 text-center border-b border-white/10">
                  <p className="text-sm text-muted-foreground mb-1">حوّل <span className="text-primary font-bold">{reservationForm.isOpentime ? 'تمن ساعة (عربون)' : 'نص المبلغ كعربون'}</span></p>
                  <p className="text-5xl font-extrabold text-white">{reservationForm.isOpentime ? totalPrice : Math.ceil(totalPrice / 2)} <span className="text-xl font-medium text-muted-foreground">جنيه</span></p>
                  {!reservationForm.isOpentime && (
                    <p className="text-xs text-muted-foreground mt-2 line-through opacity-60">المبلغ الكامل: {totalPrice} جنيه</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{reservationForm.isOpentime ? 'فترة مفتوحة' : `${getCalculatedHours().toFixed(1)} ساعة`} في {reservingRoom.name}</p>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-center text-sm text-muted-foreground font-medium">اختر طريقة الدفع وحوّل المبلغ</p>

                  {/* InstaPay */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-[#7B2FBE]/20 flex items-center justify-center text-2xl shrink-0">💜</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">InstaPay</p>
                      <p className="text-xs text-muted-foreground">إنستا باي</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-primary text-lg">{INSTAPAY_NUMBER}</p>
                    </div>
                  </div>

                  {/* Vodafone Cash */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl shrink-0">🔴</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Vodafone Cash</p>
                      <p className="text-xs text-muted-foreground">فودافون كاش</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-red-400 text-lg">{VODAFONE_CASH_NUMBER}</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-400">⚠️ يكفي تحول <strong>{reservationForm.isOpentime ? `${totalPrice} جنيه` : `نص المبلغ (${Math.ceil(totalPrice / 2)} جنيه)`}</strong> كعربون، والباقي عند الحضور. بعد التحويل اضغط "أكدت التحويل"</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmTransfer}
                      disabled={isSubmitting}
                      className="btn-primary flex-1 py-3 disabled:opacity-50"
                    >
                      {isSubmitting ? "جاري الإرسال..." : "✅ أكدت التحويل"}
                    </button>
                    <button onClick={() => setStep("form")} className="btn-secondary px-4 py-3">
                      ← رجوع
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---- خطوة 3: تم الإرسال ---- */}
            {step === "done" && (
              <div className="p-8 text-center space-y-4">
                <div className="text-6xl">✅</div>
                <h3 className="text-2xl font-bold">تم إرسال طلب الحجز!</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  تم استلام طلبك وسيتم تأكيد الحجز فور مراجعة الدفع من قِبل الأدمن.<br />
                  يُرجى الانتظار أو التواصل معنا.
                </p>
                <button onClick={closeModal} className="btn-primary w-full py-3">حسناً</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== قائمة الغرف ===== */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">جاري تحميل الغرف...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
          لا توجد غرف حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.map(room => {
            const isReserved = room.reservations && room.reservations.length > 0;
            const { rate, isDiscounted } = getEffectiveRate(room);

            return (
              <div
                key={room.id}
                className={`glass-panel p-6 rounded-xl transition-all group border-2 ${isReserved
                  ? 'border-red-500/50 opacity-70 cursor-not-allowed'
                  : 'border-green-500/30 hover:border-green-500/60 hover:scale-[1.02] cursor-pointer'
                  }`}
                onClick={() => !isReserved && openReservation(room)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{room.name}</h3>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${room.consoleType === 'PS5' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                      {room.consoleType === 'PS5' ? 'بلايستيشن 5' : 'بلايستيشن 4'}
                    </span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${isReserved ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {isReserved ? '🔴 محجوزة' : '🟢 متاحة'}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-white">{rate}</span>
                  <span className="text-sm font-medium text-muted-foreground">جنيه / ساعة</span>
                  {isDiscounted && (
                    <span className="text-xs text-muted-foreground line-through">{room.hourlyRate}</span>
                  )}
                </div>

                {isDiscounted && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                    🏷️ وقت الخصم نشط الآن
                  </div>
                )}

                {!isReserved && (
                  <div className="mt-4 text-center text-xs text-primary/70 font-medium group-hover:text-primary transition-colors">
                    اضغط للحجز ←
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
