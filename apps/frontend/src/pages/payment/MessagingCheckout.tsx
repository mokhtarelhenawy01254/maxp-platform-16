import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

const MessagingCheckout: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error" | "success">("loading");
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
      <div className="text-center max-w-md p-8">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">جاري تجهيز عملية الدفع...</h2>
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
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
            <p className="text-sm opacity-60 mb-4">{errorMsg}</p>
            <button onClick={() => navigate("/lp/messaging")} className="px-6 py-2 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors">
              العودة للصفحة الرئيسية
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagingCheckout;
