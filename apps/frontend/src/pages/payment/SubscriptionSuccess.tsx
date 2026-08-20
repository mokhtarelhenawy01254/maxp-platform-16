import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const SUCCESS_STATUSES = new Set([
  "success",
  "SUCCESS",
  "CAPTURED",
  "APPROVED",
  "PAID",
]);

const FAILURE_STATUSES = new Set([
  "failed",
  "FAILED",
  "CANCELLED",
  "REJECTED",
  "DECLINED",
  "ERROR",
]);

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("statusCode");
  const billingId = searchParams.get("billingId");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  const isSuccess = SUCCESS_STATUSES.has(status || "") || SUCCESS_STATUSES.has(paymentStatus || "");
  const isFailure = FAILURE_STATUSES.has(status || "") || FAILURE_STATUSES.has(paymentStatus || "");

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
        <div className="text-center max-w-md p-8">
          <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">╪¼╪º╪▒┘è ╪¬╪ú┘â┘è╪» ╪¬┘ü╪╣┘è┘ä ╪¿╪º┘é╪¬┘â...</h2>
          <p className="text-sm opacity-60">┘è╪▒╪¼┘ë ╪º┘ä╪º┘å╪¬╪╕╪º╪▒</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
      <div className="text-center max-w-md p-8">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">╪¿╪º┘é╪⌐ AI + Inbox ┘à┘ü╪╣┘æ┘ä╪⌐!</h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              ╪¬┘à ╪Ñ╪¬┘à╪º┘à ╪º┘ä╪º╪┤╪¬╪▒╪º┘â ┘ê╪¬┘ü╪╣┘è┘ä ╪º┘ä╪¿╪º┘é╪⌐ ╪¿┘å╪¼╪º╪¡ ≡ƒÄë
              <br />
              ╪¼┘à┘è╪╣ ╪ú╪»┘ê╪º╪¬ ╪º┘ä╪¬┘ê╪º╪╡┘ä ╪¼╪º┘ç╪▓╪⌐ ╪º┘ä╪ó┘å ┘ä┘ä╪º╪│╪¬╪«╪»╪º┘à.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.location.href = "/unified-inbox"; }}
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                ╪º╪¿╪»╪ú ╪º┘ä╪ó┘å ΓÇö ╪╡┘å╪»┘ê┘é ╪º┘ä┘ê╪º╪▒╪»
              </button>
              <button
                onClick={() => navigate("/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                ╪¬╪╡┘ü╪¡ ╪º┘ä╪¿╪º┘é╪º╪¬
              </button>
            </div>
          </>
        ) : isFailure ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">┘ä┘à ┘è┘â╪¬┘à┘ä ╪º┘ä╪»┘ü╪╣</h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              ┘ä┘à ┘è╪¬┘à ╪¬╪ú┘â┘è╪» ╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪»┘ü╪╣. ┘è┘à┘â┘å┘â ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐ ┘à╪▒╪⌐ ╪ú╪«╪▒┘ë ╪ú┘ê ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪»┘ü╪╣.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/checkout/messaging")}
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                ╪Ñ╪╣╪º╪»╪⌐ ┘à╪¡╪º┘ê┘ä╪⌐ ╪º┘ä╪»┘ü╪╣
              </button>
              <button
                onClick={() => navigate("/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                ╪º┘ä╪▒╪¼┘ê╪╣ ┘ä┘ä┘à╪¬╪¼╪▒
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">╪¼╪º╪▒┘ì ┘à╪¬╪º╪¿╪╣╪⌐ ╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪»┘ü╪╣</h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              ╪│┘å┘é┘ê┘à ╪¿╪¬╪ú┘â┘è╪» ╪º┘ä╪╣┘à┘ä┘è╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪«┘ä╪º┘ä ┘ä╪¡╪╕╪º╪¬.{billingId ? " ╪¿╪▒╪¼╪º╪í ╪º┘ä╪º╪¡╪¬┘ü╪º╪╕ ╪¿╪▒┘é┘à ╪º┘ä╪╣┘à┘ä┘è╪⌐ ┘ä┘ä╪▒╪¼┘ê╪╣ ╪Ñ┘ä┘è┘ç╪º ╪╣┘å╪» ╪º┘ä╪¡╪º╪¼╪⌐." : ""}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.location.href = "/unified-inbox"; }}
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                ┘à╪¬╪º╪¿╪╣╪⌐ ┘ä╪╡┘å╪»┘ê┘é ╪º┘ä┘ê╪º╪▒╪»
              </button>
              <button
                onClick={() => navigate("/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                ╪¬╪╡┘ü╪¡ ╪º┘ä╪¿╪º┘é╪º╪¬
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
