import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  FileText,
  Calendar,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  status: string;
  notes: string;
  birthday: string;
  password?: string;
}

const CustomerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    status: "LEAD",
    notes: "",
    birthday: "",
    password: "",
  });

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await apiClient.get(`/customers/${id}`);
        const c = res.data?.data?.customer || res.data?.data || res.data;
        let birthdayVal = "", addressVal = "", cityVal = "", countryVal = "";
        try {
          if (c?.metadata) {
            const m = typeof c.metadata === "string" ? JSON.parse(c.metadata) : c.metadata;
            if (m) {
              birthdayVal = m.birthday || "";
              addressVal = m.address || "";
              cityVal = m.city || "";
              countryVal = m.country || "";
            }
          }
        } catch {}

        setFormData({
          firstName: c?.firstName || "",
          lastName: c?.lastName || "",
          email: c?.email || "",
          phone: c?.phone || "",
          address: c?.address || addressVal || "",
          city: c?.city || cityVal || "",
          country: c?.country || countryVal || "",
          status: c?.status || "LEAD",
          notes: c?.notes || "",
          birthday: birthdayVal,
          password: "",
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "فشل في تحميل بيانات العميل");
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomer();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;
      await apiClient.put(`/customers/${id}`, payload);
      setSuccessMessage("تم حفظ التعديلات بنجاح");
      setTimeout(() => navigate(`/customers/${id}`), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل في حفظ التغييرات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-sans p-4 sm:p-6 text-foreground text-xs" dir="rtl">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/70 pb-3">
        <Link
          to={`/customers/${id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="رجوع"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">تعديل ملف العميل</h1>
          <p className="text-[11px] text-muted-foreground">
            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim() : "تحديث البيانات الشخصية وتفاصيل الاتصال"}
          </p>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border/70 bg-card p-5 space-y-5 shadow-xs">
        {/* Personal info */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>البيانات الشخصية</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">الاسم الأول *</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">اسم العائلة *</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                تاريخ الميلاد
              </label>
              <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
            </div>
          </div>
        </section>

        {/* Contact info */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span>الاتصال والحساب</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">رقم الهاتف</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right" placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">البريد الإلكتروني</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} dir="ltr" className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right" placeholder="customer@mail.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                كلمة المرور الجديدة (اختياري)
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} minLength={6} dir="ltr" className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono" placeholder="اتركها فارغة للإبقاء على الحالية" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Address and status */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>العنوان والحالة</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block mb-1 font-medium text-foreground">العنوان</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="الشارع، المنطقة..." />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">المدينة</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">الدولة</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">حالة العميل</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="LEAD">عميل محتمل (Lead)</option>
                <option value="ACTIVE">نشط (Active)</option>
                <option value="INACTIVE">غير نشط (Inactive)</option>
                <option value="BLOCKED">محظور (Blocked)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-1.5">
          <label className="block font-medium text-foreground flex items-center gap-1">
            <FileText className="h-3 w-3 text-muted-foreground" />
            ملاحظات داخلية
          </label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="ملاحظات وتفضيلات إضافية..." />
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <Link to={`/customers/${id}`} className="rounded-md border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors">
            إلغاء
          </Link>
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50">
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerEdit;
