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
      setError("┘è╪▒╪¼┘ë ┘à┘ä╪í ╪¼┘à┘è╪╣ ╪º┘ä╪¡┘é┘ê┘ä ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐");
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
        throw new Error(data.message || '┘ü╪┤┘ä ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä');
      }
      localStorage.setItem('patientToken', data.data.token);
      localStorage.setItem('patient', JSON.stringify(data.data.patient));
      navigate('/patient/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || '┘ü╪┤┘ä ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒┘è╪╢"
      description="╪ú╪»╪«┘ä ╪▒┘é┘à ┘ç╪º╪¬┘ü┘â ┘ê┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘ä┘ä╪º╪╖┘ä╪º╪╣ ╪╣┘ä┘ë ┘à┘ê╪º╪╣┘è╪»┘â ┘ê╪¬╪º╪▒┘è╪«┘â ╪º┘ä╪╖╪¿┘è"
      eyebrow="╪¬╪│╪¼┘è┘ä ╪»╪«┘ê┘ä ╪º┘ä┘à╪▒╪╢┘ë"
      visualBadge="╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒┘è╪╢"
      visualTitle="┘à┘å╪╡╪⌐ ╪º┘ä┘à╪▒╪╢┘ë"
      visualDescription="╪¬╪º╪¿╪╣ ┘à┘ê╪º╪╣┘è╪»┘â╪î ╪¬╪º╪▒┘è╪«┘â ╪º┘ä╪╖╪¿┘è╪î ┘ê┘ü┘ê╪º╪¬┘è╪▒┘â ┘à┘å ╪¿┘ê╪º╪¿╪⌐ ┘ê╪º╪¡╪»╪⌐."
      footer={
        <div className="elite-form-link-row">
          <Link to="/auth/login" className="elite-form-link">╪¬╪│╪¼┘è┘ä ╪»╪«┘ê┘ä ╪º┘ä╪Ñ╪»╪º╪▒╪⌐</Link>
        </div>
      }
    >
      {error ? (
        <AuthNotice variant="error" title="╪¬╪╣╪░╪▒ ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä">{error}</AuthNotice>
      ) : null}
      <form onSubmit={handleSubmit} className="elite-form-content">
        <div className="elite-input-group">
          <label htmlFor="phone" className="elite-label">╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü</label>
          <div className="elite-input-wrapper">
            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
              className="elite-input" placeholder="01xxxxxxxxx" dir="ltr" disabled={isLoading} required />
            <Phone className="elite-input-icon" />
          </div>
        </div>
        <div className="elite-input-group">
          <label htmlFor="password" className="elite-label">┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒</label>
          <div className="elite-input-wrapper">
            <input id="password" name="password" type={showPassword ? "text" : "password"}
              value={formData.password} onChange={handleChange} className="elite-input"
              placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" disabled={isLoading} required />
            <button type="button" className="elite-input-password-toggle"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <Lock className="elite-input-icon" />
          </div>
        </div>
        <button type="submit" disabled={isLoading || !formData.phone || !formData.password}
          className="elite-submit-button">
          {isLoading ? <><LoadingSpinner size="sm" color="white" /><span>╪¼╪º╪▒┘è ╪º┘ä╪»╪«┘ê┘ä...</span></> : "╪»╪«┘ê┘ä ╪Ñ┘ä┘ë ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒┘è╪╢"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default PatientLoginPage;
