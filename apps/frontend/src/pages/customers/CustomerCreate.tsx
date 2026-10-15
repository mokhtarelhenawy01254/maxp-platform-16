import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  UserPlus,
  Eye,
  EyeOff,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  FileText
} from "lucide-react";
import { apiClient } from "../../services/apiClient";

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
  password: string;
}

const CustomerCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) {
      setError("الاسم الأول مطلوب");
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        password: formData.password || undefined,
      };

      if (formData.birthday) {
        payload.metadata = JSON.stringify({ birthday: formData.birthday });
      }

      const response = await apiClient.post("/customers", payload);
      const newId = response.data?.data?.id || response.data?.id;
      setSuccessMessage("تم إضافة العميل بنجاح");
      setTimeout(() => {
        if (newId) {
          navigate(`/customers/${newId}`);
        } else {
          navigate("/customers");
        }
      }, 1200);
    } catch (err: any) {
      console.error("Error creating customer:", err);
      setError(err.response?.data?.message || "فشل في إضافة العميل");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      {/* Header Chassis */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5 text-right">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              إضافة عميل جديد
            </h1>
            <p className="text-xs text-muted-foreground">
              تسجيل بيانات العميل، أرقام التواصل، العنوان، وحالة الحساب
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Card Chassis */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-6"
      >
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">المعلومات الشخصية الأساسية</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                الاسم الأول <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                autoFocus
                placeholder="مثال: محمد"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                اسم العائلة / اللقب
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="مثال: أحمد"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs text-muted-foreground">
                تاريخ الميلاد (لحملات ورسائل الولاء التلقائية)
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Phone className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-foreground">بيانات الاتصال والحساب</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">رقم الهاتف</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                dir="ltr"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs text-muted-foreground">
                كلمة المرور (اختياري لبوابة العميل)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 pl-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Address & Status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <MapPin className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-foreground">العنوان وحالة العميل</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs text-muted-foreground">العنوان التفصيلي</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="الشارع، رقم المبنى، الحي"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">المدينة / المحافظة</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="القاهرة"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">الدولة</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="مصر"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">حالة العميل</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LEAD">عميل محتمل (Lead)</option>
                <option value="ACTIVE">عميل نشط (Active)</option>
                <option value="INACTIVE">غير نشط (Inactive)</option>
                <option value="BLOCKED">محظور (Blocked)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">ملاحظات داخلية عن العميل</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="ملاحظات تفضيلات العميل، مواعيد الاستلام المناسبة..."
            className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
          <Link
            to="/customers"
            className="rounded-lg border border-border/70 bg-background px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>حفظ بيانات العميل</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerCreate;
