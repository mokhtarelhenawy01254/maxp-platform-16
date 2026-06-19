import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

const MessagingCheckout: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error" | "trial" | "success">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [trialInfo, setTrialInfo] = useState<{ trialDays: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth/login?redirect=/checkout/messaging");
      return;
    }

    apiClient.post("/platform-subscription/messaging-checkout", {})
      .then((res: any) => {
        if (res.data?.success && res.data?.data?.sessionUrl) {
          setStatus("redirecting");
          window.location.href = res.data.data.sessionUrl;
        } else if (res.data?.success && res.data?.data?.skipPayment) {
          setTrialInfo(res.data.data);
          setStatus("trial");
        } else {
          setStatus("error");
          setErrorMsg(res.data?.message || "فشل إنشاء جلسة الدفع");
        }
      })
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(err.response?.data?.message || "خطأ في الاتصال");
      });
  }, [navigate]);

  const handleUpgrade = async () => {
    try {
      setStatus("loading");
      const res = await apiClient.post("/platform-subscription/messaging-upgrade", {});
      if (res.data?.success && res.data?.data?.sessionUrl) {
        setStatus("redirecting");
        window.location.href = res.data.data.sessionUrl;
      } else {
        setStatus("trial");
        setErrorMsg("فشل إنشاء جلسة الدفع");
      }
    } catch {
      setStatus("trial");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
      <div className="text-center max-w-md p-8">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">جاري تجهيز باقة AI + Inbox...</h2>
            <p className="text-sm opacity-60">يرجى الانتظار</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">جاري تحويلك لبوابة الدفع الآمنة...</h2>
            <p className="text-sm opacity-60">سيتم تحويلك إلى كاشير للدفع</p>
          </>
        )}
        {status === "trial" && (
          <>
            <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold mb-2">باقة AI + Inbox مفعّلة!</h2>
            <p className="text-sm opacity-80 mb-2">تم تفعيل الباقة تجريبياً لمدة {trialInfo?.trialDays || 7} أيام</p>
            <p className="text-xs opacity-50 mb-6">جرّب كل المميزات بدون دفع. بعد انتهاء الفترة التجريبية، اشترك لاستمرار الخدمة.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.location.href = "/company-dashboard"} className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors">
                ابدأ الآن
              </button>
              <button onClick={handleUpgrade} className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20">
                اشترك الآن — ٩٩٩ ج.م/شهر
              </button>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
            <p className="text-sm opacity-60 mb-4">{errorMsg}</p>
            <button onClick={() => navigate("/lp/ai-inbox")} className="px-6 py-2 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors">
              العودة للصفحة الرئيسية
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagingCheckout;
