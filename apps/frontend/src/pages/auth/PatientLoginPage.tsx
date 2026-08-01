import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Lock, Phone, Eye, EyeOff } from "lucide-react";
import { getApiUrl } from "../../config/environment";

const PatientLoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`${getApiUrl()}/booking/patient-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }
      localStorage.setItem('patientToken', data.data.token);
      localStorage.setItem('patient', JSON.stringify(data.data.patient));
      navigate('/patient/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="بوابة المريض"
      description="أدخل رقم هاتفك وكلمة المرور للاطلاع على مواعيدك وتاريخك الطبي"
      eyebrow="تسجيل دخول المرضى"
      visualBadge="بوابة المريض"
      visualTitle="منصة المرضى"
      visualDescription="تابع مواعيدك، تاريخك الطبي، وفواتيرك من بوابة واحدة."
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
          <label htmlFor="phone" className="elite-label">رقم الهاتف</label>
          <div className="elite-input-wrapper">
            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
              className="elite-input" placeholder="01xxxxxxxxx" dir="ltr" disabled={isLoading} required />
            <Phone className="elite-input-icon" />
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
        <button type="submit" disabled={isLoading || !formData.phone || !formData.password}
          className="elite-submit-button">
          {isLoading ? <><LoadingSpinner size="sm" color="white" /><span>جاري الدخول...</span></> : "دخول إلى بوابة المريض"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default PatientLoginPage;
