import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { getApiUrl } from "../../config/environment";

const DoctorLoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`${getApiUrl()}/booking/doctor-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }
      localStorage.setItem('doctorToken', data.data.token);
      localStorage.setItem('doctor', JSON.stringify(data.data.doctor));
      navigate('/doctor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="بوابة الطبيب"
      description="أدخل بريدك الإلكتروني أو هاتفك وكلمة المرور للدخول إلى بوابة الطبيب"
      eyebrow="تسجيل دخول الأطباء"
      visualBadge="بوابة الطبيب"
      visualTitle="منصة الأطباء"
      visualDescription="تابع جدول مواعيدك، مرضاك، أوقات عملك، ومدفوعاتك من بوابة واحدة."
      footer={
        <div className="elite-form-link-row">
          <Link to="/auth/login" className="elite-form-link">تسجيل دخول الإدارة</Link>
        </div>
      }
    >
      {error ? (
        <AuthNotice variant="error" title="تعذر تسجيل الدخول">{error}</AuthNotice>
      ) : null}
      <form onSubmit={handleSubmit} className="elite-form-content">
        <div className="elite-input-group">
          <label htmlFor="email" className="elite-label">البريد الإلكتروني أو رقم الهاتف</label>
          <div className="elite-input-wrapper">
            <input id="email" name="email" type="text" value={formData.email} onChange={handleChange}
              className="elite-input" placeholder="doctor@email.com" disabled={isLoading} required />
            <Mail className="elite-input-icon" />
          </div>
        </div>
        <div className="elite-input-group">
          <label htmlFor="password" className="elite-label">كلمة المرور</label>
          <div className="elite-input-wrapper">
            <input id="password" name="password" type={showPassword ? "text" : "password"}
              value={formData.password} onChange={handleChange} className="elite-input"
              placeholder="••••••••" disabled={isLoading} required />
            <button type="button" className="elite-input-password-toggle"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <Lock className="elite-input-icon" />
          </div>
        </div>
        <button type="submit" disabled={isLoading || !formData.email || !formData.password}
          className="elite-submit-button">
          {isLoading ? <><LoadingSpinner size="sm" color="white" /><span>جاري الدخول...</span></> : "دخول إلى بوابة الطبيب"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default DoctorLoginPage;
