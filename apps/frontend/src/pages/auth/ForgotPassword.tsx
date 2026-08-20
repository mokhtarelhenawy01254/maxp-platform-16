import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight } from "lucide-react";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import axios from "axios";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post("/api/v1/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل في إرسال رابط استعادة كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSurface
      title="استعادة كلمة المرور"
      description="أدخل بريدك الإلكتروني وسنرسل لك رابطاً لاستعادة الوصول إلى حسابك."
      eyebrow="Security Recovery"
      footer={
        <div className="elite-form-link-row">
          <span>تذكرت كلمة المرور؟</span>
          <Link to="/auth/login" className="elite-form-link">تسجيل الدخول</Link>
        </div>
      }
      visualTitle={<>الأمان <br /> يأتي <span style={{ color: "var(--auth-accent)" }}>أولاً</span></>}
      visualDescription="نحن نستخدم أحدث تقنيات التشفير لضمان حماية بياناتك ومساحة عملك دائماً."
      visualBadge="حماية الحساب"
    >
      {success ? (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">تحقق من بريدك</h3>
          <p className="text-slate-500 mb-8">لقد أرسلنا رابط الاستعادة إلى {email}. يرجى التحقق من صندوق الوارد والرسائل المهملة.</p>
          <Link to="/auth/login" className="elite-submit-button">العودة للدخول</Link>
        </div>
      ) : (
        <>
          {error && <AuthNotice variant="error" title="فشل الطلب">{error}</AuthNotice>}
          
          <form onSubmit={handleSubmit}>
            <div className="elite-input-group">
              <label className="elite-label">البريد الإلكتروني</label>
              <div className="elite-input-wrapper">
                <input
                  type="email"
                  required
                  className="elite-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Mail className="elite-input-icon" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="elite-submit-button">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <span>إرسال رابط الاستعادة</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </AuthSurface>
  );
};

export default ForgotPassword;
