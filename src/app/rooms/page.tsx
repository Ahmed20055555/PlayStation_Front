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


export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservingRoom, setReservingRoom] = useState<Room | null>(null);
  const [reservationForm, setReservationForm] = useState({ customerName: "", customerPhone: "", transferToNumber: "", transferImage: "", isOpentime: true, startTimeInput: "", endTimeInput: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  // step: 'form' | 'payment' | 'done'
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [instapayNumber, setInstapayNumber] = useState("01012345678");
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState("01098765432");

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.instapayNumber) setInstapayNumber(data.instapayNumber);
        if (data.vodafoneCashNumber) setVodafoneCashNumber(data.vodafoneCashNumber);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

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
    fetchSettings();
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
    setReservationForm({ customerName: "", customerPhone: "", transferToNumber: "", transferImage: "", isOpentime: true, startTimeInput: "", endTimeInput: "" });
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReservationForm(prev => ({ ...prev, transferImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
          transferImage: reservationForm.transferImage,
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 flex flex-col max-h-[90svh]">

            {/* ---- Header ---- */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <div className="text-center">
                <p className="text-xs text-white/40 font-medium">{reservingRoom.name}</p>
                <h3 className="text-base font-bold text-white">
                  {step === "form" ? "حجز غرفة" : step === "payment" ? "تأكيد الدفع" : "تم الحجز! ✅"}
                </h3>
              </div>
              {/* Step indicator */}
              <div className="flex gap-1">
                {["form","payment"].map((s,i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? "w-5 bg-white" : step === "done" ? "w-3 bg-green-400" : i === 0 && step === "payment" ? "w-3 bg-white/40" : "w-3 bg-white/15"}`} />
                ))}
              </div>
            </div>

            {/* ---- Scrollable Body ---- */}
            <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain" style={{WebkitOverflowScrolling:"touch"}}>

              {/* ---- خطوة 1: الفورم ---- */}
              {step === "form" && (
                <div className="p-4 sm:p-5 flex flex-col gap-4 text-right" dir="rtl">

                  {/* Customer Info - 2 cols */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-medium">اسم العميل</label>
                      <input
                        type="text"
                        value={reservationForm.customerName}
                        onChange={e => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                        placeholder="اختياري"
                        className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-white/25 transition-all placeholder:text-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-medium">رقم التليفون <span className="text-red-400">*</span></label>
                      <input
                        type="tel"
                        required
                        value={reservationForm.customerPhone}
                        onChange={e => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                        className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-white/25 transition-all placeholder:text-white/20"
                      />
                    </div>
                  </div>


                  {/* Booking Type Toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setReservationForm({ ...reservationForm, isOpentime: true })}
                      className={`h-12 rounded-xl text-sm font-semibold transition-all border ${reservationForm.isOpentime ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/8 hover:border-white/20'}`}>
                      ⏳ مفتوح
                    </button>
                    <button type="button" onClick={() => setReservationForm({ ...reservationForm, isOpentime: false })}
                      className={`h-12 rounded-xl text-sm font-semibold transition-all border ${!reservationForm.isOpentime ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/8 hover:border-white/20'}`}>
                      🕐 وقت محدد
                    </button>
                  </div>

                  {/* Time Inputs + Price */}
                  <div className="bg-white/3 rounded-2xl border border-white/6 p-4 flex flex-col gap-4">
                    {reservationForm.isOpentime ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-white/40 mb-1.5 text-right">وقت الاستلام</label>
                          <div className="h-11 px-3 rounded-xl bg-white/5 border border-white/8 flex items-center focus-within:ring-1 focus-within:ring-white/25 transition-all">
                            <input type="time" className="bg-transparent text-white focus:outline-none w-full text-sm font-medium" value={reservationForm.startTimeInput} onChange={e => setReservationForm({ ...reservationForm, startTimeInput: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex-1 opacity-35 pointer-events-none">
                          <label className="block text-xs text-white/40 mb-1.5 text-right">وقت الانتهاء</label>
                          <div className="h-11 px-3 rounded-xl bg-white/3 border border-white/5 flex items-center text-sm text-white/30">--:--</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-white/40 mb-1.5 text-right">من الساعة</label>
                          <div className="h-11 px-3 rounded-xl bg-white/5 border border-white/8 flex items-center focus-within:ring-1 focus-within:ring-white/25 transition-all">
                            <input required={!reservationForm.isOpentime} type="time" className="bg-transparent text-white focus:outline-none w-full text-sm font-medium" value={reservationForm.startTimeInput} onChange={e => setReservationForm({ ...reservationForm, startTimeInput: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-white/40 mb-1.5 text-right">إلى الساعة</label>
                          <div className="h-11 px-3 rounded-xl bg-white/5 border border-white/8 flex items-center focus-within:ring-1 focus-within:ring-white/25 transition-all">
                            <input required={!reservationForm.isOpentime} type="time" className="bg-transparent text-white focus:outline-none w-full text-sm font-medium" value={reservationForm.endTimeInput} onChange={e => setReservationForm({ ...reservationForm, endTimeInput: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Price Preview */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-right">
                        <p className="text-xs text-white/30 mb-0.5">عربون مطلوب</p>
                        {!reservationForm.isOpentime && getCalculatedHours() > 0 && (
                          <p className="text-xs text-white/25">{getCalculatedHours()} ساعة {getEffectiveRate(reservingRoom).isDiscounted && <span className="text-green-400">🏷️</span>}</p>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-3xl font-black text-white">
                          {reservationForm.isOpentime
                            ? getEffectiveRate(reservingRoom).rate
                            : getCalculatedHours() > 0 ? Math.ceil((getCalculatedHours() * getEffectiveRate(reservingRoom).rate) / 2) : "--"
                          }
                        </span>
                        <span className="text-sm text-white/40 mr-1">جنيه</span>
                      </div>
                    </div>
                  </div>

                  {/* AM/PM Note - compact */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 text-xs text-white/40" dir="rtl">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/50 shrink-0 animate-pulse mt-1 self-start">
                      <path d="M6 12h4m-2-2v4"/><circle cx="15" cy="12" r="1.5" className="fill-white"/><circle cx="18" cy="10" r="1" className="fill-white"/><circle cx="18" cy="14" r="1" className="fill-white"/><path d="M21 9.5A3.5 3.5 0 0 0 17.5 6h-11A3.5 3.5 0 0 0 3 9.5v5A3.5 3.5 0 0 0 6.5 18h11a3.5 3.5 0 0 0 3.5-3.5v-5z"/>
                    </svg>
                    <div className="flex flex-col gap-1">
                      <span>☀️ <strong className="text-white/60 text-[13px]">AM</strong> (من 12 بالليل لحد 11:59 قبل الظهر)</span>
                      <span>🌙 <strong className="text-white/60 text-[13px]">PM</strong> (من 12 الظهر لحد 11:59 قبل منتصف الليل)</span>
                    </div>
                  </div>

                </div>
              )}

              {/* ---- خطوة 2: الدفع ---- */}
              {step === "payment" && (
                <div className="flex flex-col gap-4 p-4 sm:p-5" dir="rtl">
                  <div className="rounded-2xl bg-gradient-to-br from-white/8 to-white/3 border border-white/10 p-5 text-center">
                    <p className="text-xs text-white/40 mb-1">{reservationForm.isOpentime ? "عربون فترة مفتوحة" : `عربون ${getCalculatedHours()} ساعة`}</p>
                    <p className="text-5xl font-black text-white mb-0.5">{reservationForm.isOpentime ? totalPrice : Math.ceil(totalPrice / 2)}</p>
                    <p className="text-sm text-white/40">جنيه · {reservingRoom.name}</p>
                    {!reservationForm.isOpentime && <p className="text-xs text-white/25 mt-1 line-through">المبلغ الكامل: {totalPrice} جنيه</p>}
                  </div>
                  <p className="text-sm font-bold text-white text-center">اختر الرقم اللي حولت عليه <span className="text-red-400">*</span></p>
                  <p className="text-xs text-white/40 text-center mb-1">عشان نقدر نأكد حجزك بسرعة</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setReservationForm({ ...reservationForm, transferToNumber: `InstaPay: ${instapayNumber}` })}
                      className={`relative overflow-hidden group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${reservationForm.transferToNumber.includes('InstaPay') ? 'bg-purple-500/10 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/50' : 'bg-white/4 border-white/8 hover:bg-white/10'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${reservationForm.transferToNumber.includes('InstaPay') ? 'border-purple-500' : 'border-white/20'}`}>
                        {reservationForm.transferToNumber.includes('InstaPay') && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                      </div>

                      <div className="flex flex-col flex-1 mx-3 text-right">
                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors">إنستا باي (InstaPay)</span>
                        <p className="font-mono font-bold text-white text-base">{instapayNumber}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReservationForm({ ...reservationForm, transferToNumber: `Vodafone Cash: ${vodafoneCashNumber}` })}
                      className={`relative overflow-hidden group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${reservationForm.transferToNumber.includes('Vodafone Cash') ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20 ring-1 ring-red-500/50' : 'bg-white/4 border-white/8 hover:bg-white/10'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${reservationForm.transferToNumber.includes('Vodafone Cash') ? 'border-red-500' : 'border-white/20'}`}>
                        {reservationForm.transferToNumber.includes('Vodafone Cash') && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </div>
                      
                      <div className="flex flex-col flex-1 mx-3 text-right">
                        <span className="font-bold text-white group-hover:text-red-400 transition-colors">فودافون كاش (Vodafone Cash)</span>
                        <p className="font-mono font-bold text-red-400 text-base">{vodafoneCashNumber}</p>
                      </div>
                    </button>
                  </div>
                  <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3 text-center mb-2">
                    <p className="text-xs text-amber-400/80">⚠️ حوّل <strong className="text-amber-300">{reservationForm.isOpentime ? `${totalPrice}` : `${Math.ceil(totalPrice/2)}`} جنيه</strong> كعربون والباقي عند الحضور</p>
                  </div>
                  
                  {/* Upload Screenshot */}
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs text-white/40 mb-1">إرفاق صورة التحويل (اختياري، يسرع التأكيد)</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer bg-white/3">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {reservationForm.transferImage ? (
                          <span className="text-2xl mb-1">✅</span>
                        ) : (
                          <svg className="w-6 h-6 mb-2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        )}
                        <p className="text-xs text-white/50">{reservationForm.transferImage ? "تم إرفاق الصورة بنجاح!" : "اضغط هنا لرفع الاسكرين شوت"}</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              )}

              {/* ---- خطوة 3: تم ---- */}
              {step === "done" && (
                <div className="p-8 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center text-4xl">✅</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تم إرسال الطلب!</h3>
                    <p className="text-sm text-white/40 leading-relaxed">سيتم تأكيد الحجز بعد مراجعة الدفع.<br/>يُرجى الانتظار أو التواصل معنا.</p>
                  </div>
                </div>
              )}

            </div>

            {/* ---- Fixed Bottom Actions ---- */}
            <div className="px-4 pb-5 pt-3 border-t border-white/5 shrink-0 bg-[#0d0d0d]">
              {step === "form" && (
                <form onSubmit={handleProceedToPayment} className="flex gap-2">
                  <button type="submit" className="flex-1 h-12 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                    التالي
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                  </button>
                  <button type="button" onClick={closeModal} className="w-24 h-12 rounded-xl bg-white/5 border border-white/8 text-white/60 font-semibold text-sm hover:bg-white/10 transition-all">
                    إلغاء
                  </button>
                </form>
              )}
              {step === "payment" && (
                <div className="flex gap-2">
                  <button onClick={handleConfirmTransfer} disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-400 disabled:opacity-50 active:scale-95 transition-all">
                    {isSubmitting ? "جاري الإرسال..." : "✅ أكدت التحويل"}
                  </button>
                  <button onClick={() => setStep("form")} className="w-24 h-12 rounded-xl bg-white/5 border border-white/8 text-white/60 font-semibold text-sm hover:bg-white/10 transition-all">
                    ← رجوع
                  </button>
                </div>
              )}
              {step === "done" && (
                <button onClick={closeModal} className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 transition-all">
                  حسناً، تم! 🎮
                </button>
              )}
            </div>

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
