"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [playstationName, setPlaystationName] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [instapayNumber, setInstapayNumber] = useState("");
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings`);
      if (response.ok) {
        const data = await response.json();
        setPlaystationName(data.playstationName || "");
        setLogoImage(data.logoImage || "");
        setInstapayNumber(data.instapayNumber || "");
        setVodafoneCashNumber(data.vodafoneCashNumber || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playstationName,
          logoImage,
          instapayNumber,
          vodafoneCashNumber,
        }),
      });

      if (response.ok) {
        alert("تم حفظ الإعدادات بنجاح!");
        // We might want to reload the page or update global context here
        window.location.reload();
      } else {
        alert("حدث خطأ أثناء حفظ الإعدادات");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex-1 p-4 lg:p-8 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen w-full mx-auto overflow-x-hidden animate-fadeIn" dir="rtl">
      <div className="w-full max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-lg sm:text-xl">
              🎮
            </span>
            إعدادات النظام
          </h1>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-lg sm:text-xl">💾</span>
            )}
            حفظ التغييرات
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* General Settings */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">الإعدادات العامة</h2>
            
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-white/70">اسم البلايستيشن</label>
              <input
                type="text"
                value={playstationName}
                onChange={(e) => setPlaystationName(e.target.value)}
                placeholder="مثال: X-Gamer PlayStation"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-white/70">الشعار (اللوجو)</label>
                <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 sm:p-6 border-2 border-dashed border-white/20 rounded-xl bg-black/20 hover:bg-black/40 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()} onDragOver={(e)=>e.preventDefault()} onDrop={handleDrop}>
                {logoImage ? (
                  <img src={logoImage} alt="Logo Preview" className="h-16 sm:h-24 object-contain" />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl sm:text-3xl">
                    🖼️
                  </div>
                )}
                <span className="text-xs sm:text-sm text-white/60">اضغط لرفع صورة الشعار</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-purple-400">📱</span>
              أرقام الدفع والتحويل
            </h2>
            
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-white/70">رقم إنستا باي (InstaPay)</label>
              <input
                type="text"
                value={instapayNumber}
                onChange={(e) => setInstapayNumber(e.target.value)}
                placeholder="أدخل رقم إنستا باي"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-white/70">رقم فودافون كاش (Vodafone Cash)</label>
              <input
                type="text"
                value={vodafoneCashNumber}
                onChange={(e) => setVodafoneCashNumber(e.target.value)}
                placeholder="أدخل رقم فودافون كاش"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
