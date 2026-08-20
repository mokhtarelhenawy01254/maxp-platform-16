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
      setError("┘è╪▒╪¼┘ë ┘à┘ä╪í ╪¼┘à┘è╪╣ ╪º┘ä╪¡┘é┘ê┘ä ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐");
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
        throw new Error(data.message || '┘ü╪┤┘ä ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä');
      }
      localStorage.setItem('doctorToken', data.data.token);
      localStorage.setItem('doctor', JSON.stringify(data.data.doctor));
      navigate('/doctor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || '┘ü╪┤┘ä ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╖╪¿┘è╪¿"
      description="╪ú╪»╪«┘ä ╪¿╪▒┘è╪»┘â ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ┘ç╪º╪¬┘ü┘â ┘ê┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘ä┘ä╪»╪«┘ê┘ä ╪Ñ┘ä┘ë ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╖╪¿┘è╪¿"
      eyebrow="╪¬╪│╪¼┘è┘ä ╪»╪«┘ê┘ä ╪º┘ä╪ú╪╖╪¿╪º╪í"
      visualBadge="╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╖╪¿┘è╪¿"
      visualTitle="┘à┘å╪╡╪⌐ ╪º┘ä╪ú╪╖╪¿╪º╪í"
      visualDescription="╪¬╪º╪¿╪╣ ╪¼╪»┘ê┘ä ┘à┘ê╪º╪╣┘è╪»┘â╪î ┘à╪▒╪╢╪º┘â╪î ╪ú┘ê┘é╪º╪¬ ╪╣┘à┘ä┘â╪î ┘ê┘à╪»┘ü┘ê╪╣╪º╪¬┘â ┘à┘å ╪¿┘ê╪º╪¿╪⌐ ┘ê╪º╪¡╪»╪⌐."
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
          <label htmlFor="email" className="elite-label">╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü</label>
          <div className="elite-input-wrapper">
            <input id="email" name="email" type="text" value={formData.email} onChange={handleChange}
              className="elite-input" placeholder="doctor@email.com" disabled={isLoading} required />
            <Mail className="elite-input-icon" />
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
        <button type="submit" disabled={isLoading || !formData.email || !formData.password}
          className="elite-submit-button">
          {isLoading ? <><LoadingSpinner size="sm" color="white" /><span>╪¼╪º╪▒┘è ╪º┘ä╪»╪«┘ê┘ä...</span></> : "╪»╪«┘ê┘ä ╪Ñ┘ä┘ë ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╖╪¿┘è╪¿"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default DoctorLoginPage;
