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

    // Support HH:MM time strings from <input type="time" />
    if (reservationForm.startTimeInput.includes(":") && reservationForm.endTimeInput.includes(":")) {
      const [startH, startM] = reservationForm.startTimeInput.split(":").map(Number);
      const [endH, endM] = reservationForm.endTimeInput.split(":").map(Number);

      let diff = (endH + endM / 60) - (startH + startM / 60);
      if (diff <= 0) diff += 24; // Handles crossing midnight
      return diff;
    }

    const startH = Number(reservationForm.startTimeInput);
    const endH = Number(reservationForm.endTimeInput);
    if (isNaN(startH) || isNaN(endH)) return 0;
    let diff = endH - startH;
    if (diff <= 0) diff += 12;
    return diff;
  };

  const getStartEndDates = () => {
    const start = new Date();
    let end = new Date();
    if (!reservationForm.isOpentime && reservationForm.startTimeInput && reservationForm.endTimeInput) {
      if (reservationForm.startTimeInput.includes(":") && reservationForm.endTimeInput.includes(":")) {
        const [startH, startM] = reservationForm.startTimeInput.split(":").map(Number);
        start.setHours(startH, startM, 0, 0);

        const hours = getCalculatedHours();
        end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      } else {
        const targetH = Number(reservationForm.startTimeInput);
        const current12 = start.getHours() % 12 || 12;
        let diffCurrent = targetH - current12;
        if (diffCurrent < -6) diffCurrent += 12;
        if (diffCurrent > 6) diffCurrent -= 12;

        start.setHours(start.getHours() + diffCurrent, 0, 0, 0);

        const hours = getCalculatedHours();
        end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      }
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
    <>
      {/* ===== Modal ===== */}
      {reservingRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 overflow-hidden">

            {/* ---- خطوة 1: الفورم ---- */}
            {step === "form" && (
              <div className="p-6 sm:p-8 bg-[#0a0a0a] flex flex-col gap-6 text-right" dir="rtl">
                <h3 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">حجز الغرفة</h3>

                <form onSubmit={handleProceedToPayment} className="flex flex-col gap-6">
                  {/* Customer Info */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 text-right">
                      <label className="block text-sm text-muted-foreground mb-2 font-medium">اسم العميل (اختياري)</label>
                      <input
                        type="text"
                        value={reservationForm.customerName}
                        onChange={e => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                        placeholder="اسم العميل"
                        className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 text-white text-right focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <label className="block text-sm text-muted-foreground mb-2 font-medium">رقم تليفون العميل</label>
                      <input
                        type="tel"
                        required
                        value={reservationForm.customerPhone}
                        onChange={e => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                        placeholder="رقم الموبايل"
                        className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 text-white text-right focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Transfer To Number */}
                  <div className="text-right">
                    <label className="block text-sm text-muted-foreground mb-2 font-medium">الرقم اللي هيحول عليه الفلوس</label>
                    <div className="relative">
                      <select
                        required
                        value={reservationForm.transferToNumber}
                        onChange={e => setReservationForm({ ...reservationForm, transferToNumber: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 text-white text-right focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                        dir="rtl"
                      >
                        <option value="">-- اختر الرقم --</option>
                        <option value={`InstaPay: ${INSTAPAY_NUMBER}`}>إنستا باي - {INSTAPAY_NUMBER}</option>
                        <option value={`Vodafone Cash: ${VODAFONE_CASH_NUMBER}`}>فودافون كاش - {VODAFONE_CASH_NUMBER}</option>
                      </select>
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Booking Type Selector */}
                  <div className="p-4 rounded-xl border border-white/5 bg-[#121212] flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-10">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={`text-sm sm:text-base font-semibold transition-colors ${reservationForm.isOpentime ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'}`}>
                        فترة مفتوحة (Open Time)
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${reservationForm.isOpentime ? 'border-white' : 'border-muted-foreground group-hover:border-white/80'}`}>
                        {reservationForm.isOpentime && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        checked={reservationForm.isOpentime}
                        onChange={() => setReservationForm({ ...reservationForm, isOpentime: true })}
                      />
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={`text-sm sm:text-base font-semibold transition-colors ${!reservationForm.isOpentime ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'}`}>
                        تحديد وقت (من - إلى)
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!reservationForm.isOpentime ? 'border-white' : 'border-muted-foreground group-hover:border-white/80'}`}>
                        {!reservationForm.isOpentime && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        checked={!reservationForm.isOpentime}
                        onChange={() => setReservationForm({ ...reservationForm, isOpentime: false })}
                      />
                    </label>
                  </div>

                  {/* Dynamic Time Inputs & Price Preview */}
                  <div className="p-6 rounded-xl border border-white/5 bg-[#1c1c1c] flex flex-col items-center text-center">
                    {reservationForm.isOpentime ? (
                      <div className="animate-fade-in-up w-full flex flex-col gap-5">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 text-right">
                            <label className="block text-sm text-muted-foreground mb-2 font-medium">وقت الاستلام</label>
                            <div className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-between text-muted-foreground focus-within:ring-2 focus-within:ring-white/20 transition-all">
                              <input
                                type="time"
                                className="bg-transparent text-white focus:outline-none w-full font-medium"
                                value={reservationForm.startTimeInput}
                                onChange={e => setReservationForm({ ...reservationForm, startTimeInput: e.target.value })}
                              />
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                          </div>
                          <div className="flex-1 text-right opacity-50 pointer-events-none">
                            <label className="block text-sm text-muted-foreground mb-2 font-medium">وقت الانتهاء</label>
                            <div className="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between text-muted-foreground">
                              <span className="w-full font-medium">--:-- --</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 pt-5 border-t border-white/5 w-full">
                          <p className="text-sm sm:text-base text-muted-foreground mb-3 font-medium">المبلغ المطلوب (عربون)</p>
                          <h2 className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight">
                            {getEffectiveRate(reservingRoom).rate} <span className="text-2xl sm:text-3xl font-bold">جنيه</span>
                          </h2>
                          <p className="text-xs sm:text-sm text-muted-foreground font-medium">عربون تمن ساعة للفترة المفتوحة</p>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in-up w-full flex flex-col gap-5">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 text-right">
                            <label className="block text-sm text-muted-foreground mb-2 font-medium">وقت الاستلام (من)</label>
                            <div className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-between text-muted-foreground focus-within:ring-2 focus-within:ring-white/20 transition-all">
                              <input
                                required={!reservationForm.isOpentime}
                                type="time"
                                className="bg-transparent text-white focus:outline-none w-full font-medium"
                                value={reservationForm.startTimeInput}
                                onChange={e => setReservationForm({ ...reservationForm, startTimeInput: e.target.value })}
                              />
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                          </div>
                          <div className="flex-1 text-right">
                            <label className="block text-sm text-muted-foreground mb-2 font-medium">وقت الانتهاء (إلى)</label>
                            <div className="w-full h-12 px-4 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-between text-muted-foreground focus-within:ring-2 focus-within:ring-white/20 transition-all">
                              <input
                                required={!reservationForm.isOpentime}
                                type="time"
                                className="bg-transparent text-white focus:outline-none w-full font-medium"
                                value={reservationForm.endTimeInput}
                                onChange={e => setReservationForm({ ...reservationForm, endTimeInput: e.target.value })}
                              />
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                          </div>
                        </div>

                        {(getCalculatedHours() > 0) && (
                          <div className="mt-2 pt-5 border-t border-white/5 w-full">
                            <p className="text-sm sm:text-base text-muted-foreground mb-3 font-medium">المبلغ المطلوب (عربون)</p>
                            <h2 className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight">
                              {Math.ceil((getCalculatedHours() * getEffectiveRate(reservingRoom).rate) / 2)} <span className="text-2xl sm:text-3xl font-bold">جنيه</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                              عربون نص مبلغ الـ {getCalculatedHours()} ساعات
                              {getEffectiveRate(reservingRoom).isDiscounted && (
                                <span className="text-green-400 mr-1"> 🏷️ (سعر خصم)</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shared Info Note with PS Controller SVG */}
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-start gap-3 text-right text-xs text-muted-foreground w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white shrink-0 mt-0.5 animate-pulse">
                        <path d="M6 12h4m-2-2v4" />
                        <circle cx="15" cy="12" r="1.5" className="fill-white" />
                        <circle cx="18" cy="10" r="1" className="fill-white" />
                        <circle cx="18" cy="14" r="1" className="fill-white" />
                        <path d="M21 9.5A3.5 3.5 0 0 0 17.5 6h-11A3.5 3.5 0 0 0 3 9.5v5A3.5 3.5 0 0 0 6.5 18h11a3.5 3.5 0 0 0 3.5-3.5v-5z" />
                      </svg>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="font-semibold text-white">ملحوظة تهمك (توقيت الحجز):</span>
                        <p>☀️ <strong className="text-white">AM</strong> تعني صباحاً (من 12:00 بعد منتصف الليل حتى 11:59 ظهراً)</p>
                        <p>🌙 <strong className="text-white">PM</strong> تعني مساءً (من 12:00 ظهراً حتى 11:59 قبل منتصف الليل)</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <button type="submit" className="flex-[2] bg-white text-black hover:bg-gray-200 transition-colors rounded-xl h-12 sm:h-14 font-bold text-base flex items-center justify-center gap-2">
                      <span>التالي: طريقة الدفع</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </button>
                    <button type="button" onClick={closeModal} className="flex-1 bg-[#1c1c1c] border border-white/10 text-white hover:bg-[#2c2c2c] transition-colors rounded-xl h-12 sm:h-14 font-bold text-base flex items-center justify-center">
                      إلغاء
                    </button>
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
                  {"تم استلام طلبك وسيتم تأكيد الحجز فور مراجعة الدفع من قِبل الأدمن."}
                  <br />
                  {"يُرجى الانتظار أو التواصل معنا."}
                </p>
                <button onClick={closeModal} className="btn-primary w-full py-3">حسناً</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== قائمة الغرف ===== */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-in fade-in duration-700">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">جاري تحميل الغرف...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
            لا توجد غرف حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {rooms.map(room => {
              const isReserved = room.reservations && room.reservations.length > 0;
              const { rate, isDiscounted } = getEffectiveRate(room);

              return (
                <div
                  key={room.id}
                  onClick={() => !isReserved && openReservation(room)}
                  className={`relative flex flex-col rounded-2xl p-3 sm:p-4 transition-all duration-300 group overflow-hidden
                    ${
                      isReserved
                        ? 'bg-[#0f0f0f] border border-red-500/30 cursor-not-allowed'
                        : 'bg-[#0f0f0f] border border-white/5 cursor-pointer hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)] hover:-translate-y-0.5'
                    }`}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none ${
                    isReserved ? '' : 'group-hover:opacity-100'
                  } bg-gradient-to-br from-green-500/5 to-transparent`} />

                  {/* Status dot */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                      room.consoleType === 'PS5' ? 'bg-white/8 text-white/70' : 'bg-blue-500/15 text-blue-400'
                    }`}>
                      {room.consoleType === 'PS5' ? 'PS5' : 'PS4'}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isReserved ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                    }`} />
                  </div>

                  {/* Room Name */}
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight mb-2 truncate text-right">{room.name}</h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1" dir="rtl">
                    <span className="text-2xl sm:text-3xl font-black text-white leading-none">{rate}</span>
                    <span className="text-[10px] sm:text-xs text-white/40 font-medium">جنيه/ساعة</span>
                    {isDiscounted && (
                      <span className="text-[10px] text-white/25 line-through">{room.hourlyRate}</span>
                    )}
                  </div>

                  {isDiscounted && (
                    <span className="text-[10px] text-green-400 font-medium">🏷️ خصم نشط</span>
                  )}

                  {/* Status label */}
                  <div className={`mt-3 pt-2.5 border-t text-center text-[10px] sm:text-xs font-semibold transition-colors duration-200 ${
                    isReserved
                      ? 'border-red-500/15 text-red-400'
                      : 'border-white/5 text-white/30 group-hover:text-green-400'
                  }`}>
                    {isReserved ? 'محجوزة الآن' : 'اضغط للحجز ←'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
