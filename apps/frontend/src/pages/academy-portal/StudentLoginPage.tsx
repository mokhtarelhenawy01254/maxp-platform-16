import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Phone, ArrowLeft, Loader2, Sparkles, BookOpen } from "lucide-react";

const StudentLoginPage: React.FC = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("يرجى إدخال رقم الهاتف المسجل");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/v1/academy/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "تعذر العثور على اشتراك مرتبط بهذا الرقم");
      }

      localStorage.setItem("studentToken", data.token);
      localStorage.setItem("studentPhone", data.student.phone);
      localStorage.setItem("studentName", data.student.name);

      navigate("/portal/my-courses", { replace: true });
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-6 text-right" dir="rtl">
      {/* Icon & Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">تسجيل دخول الطالب</h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          أدخل رقم الموبايل الذي اشتركت به في الكورس للوصول إلى دروسك ومتابعة تقدمك.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            رقم الموبايل المسجل
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010xxxxxxxx"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-800 font-mono dir-ltr text-right pl-10"
              disabled={loading}
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !phone.trim()}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحقق من الاشتراك...</span>
            </>
          ) : (
            <>
              <span>دخول إلى كورساتي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Alternative actions */}
      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
        <Link
          to="/portal/catalog"
          className="inline-flex items-center justify-center gap-1.5 font-bold text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>لست مشتركاً بعد؟ تصفح كتالوج الكورسات وشاهد المعاينة مجاناً</span>
        </Link>
      </div>
    </div>
  );
};

export default StudentLoginPage;
