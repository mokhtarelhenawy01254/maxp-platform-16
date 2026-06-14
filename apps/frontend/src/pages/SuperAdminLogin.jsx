import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Eye, EyeOff, Shield, LayoutDashboard, Lock, Mail } from "lucide-react";

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => { setFormData(p => ({ ...p, [e.target.name]: e.target.value })); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError("جميع الحقول مطلوبة"); return; }
    try {
      setLoading(true); setError("");
      const response = await fetch(buildApiUrl("super-admin/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!response.ok) { let m = "فشل في تسجيل الدخول"; try { const d = await response.json(); m = d.message || m; } catch {} throw new Error(m); }
      const data = await response.json();
      if (data.success) {
        const userData = { ...data.data.user, companyId: data.data.user.companyId || null, company: data.data.user.company || null };
        tokenManager.setAccessToken(data.data.token); localStorage.setItem("user", JSON.stringify(userData));
        const loggedInUser = await login(userData, data.data.token);
        if (loggedInUser) { ["SUPER_ADMIN", "Project Manager", "Team Lead", "Developer", "Tester"].includes(loggedInUser.role) ? navigate("/super-admin/dashboard") : navigate("/company-dashboard"); }
        else setError("فشل في تحديث حالة تسجيل الدخول");
      } else setError(data.message || "فشل في تسجيل الدخول");
    } catch (err) { setError(err.message || "حدث خطأ في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center gap-8">
          <div className="hidden lg:block text-white flex-1 max-w-lg">
            <h1 className="text-5xl font-bold leading-tight mb-4">لوحة تحكم <span className="text-blue-300 block">مدير النظام</span></h1>
            <p className="text-xl mb-8 opacity-90">إدارة شاملة ومتقدمة لجميع جوانب النظام</p>
            <div className="space-y-4">{[{ icon: <LayoutDashboard />, text: "لوحة تحكم متقدمة وتحليلات شاملة" }, { icon: <Shield />, text: "أمان عالي المستوى وحماية متقدمة" }, { icon: <Lock />, text: "صلاحيات إدارية كاملة" }].map((f, i) => <div key={i} className="flex items-center gap-3"><div className="p-3 bg-white/10 rounded-xl backdrop-blur">{f.icon}</div><span className="text-lg">{f.text}</span></div>)}</div>
          </div>
          <div className="w-full max-w-md">
            <Card className="bg-white/95 dark:bg-slate-800/80 backdrop-blur-xl border-0 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white px-8 py-8 text-center">
                <div className="size-20 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur border-2 border-white/30"><Lock className="size-10" /></div>
                <h1 className="text-2xl font-bold">مدير النظام</h1>
                <Badge className="bg-white/20 text-white border-0 mt-2">SUPER ADMIN</Badge>
                <p className="text-sm mt-2 opacity-90">تسجيل دخول آمن لوحة التحكم الرئيسية</p>
              </div>
              <CardContent className="p-8">
                {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div><Label>البريد الإلكتروني</Label><div className="relative"><Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input name="email" type="email" value={formData.email} onChange={handleChange} required className="pr-10" placeholder="admin@example.com" /></div></div>
                    <div><Label>كلمة المرور</Label><div className="relative"><Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required className="pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all disabled:from-gray-400 disabled:to-gray-500" disabled={loading} size="lg">
                      {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                  </div>
                  <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  <div className="text-center"><Button variant="link" size="sm" className="text-muted-foreground" onClick={() => navigate("/auth/login")}>العودة لتسجيل الدخول العادي</Button></div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;