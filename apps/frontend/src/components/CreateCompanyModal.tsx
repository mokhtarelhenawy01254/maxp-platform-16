import React, { useState } from "react";
import {
  X,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Coins,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import i18n from "../i18n";
import { tToast } from "../utils/i18n-toast";
import { apiClient } from "../services/apiClient";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  currency: string;
  timezone: string;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    currency: "EGP",
    timezone: "Africa/Cairo",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const currencies = [
    { value: "EGP", label: "جنيه مصري - EGP", symbol: "ج.م" },
    { value: "USD", label: "دولار أمريكي - USD", symbol: "$" },
    { value: "SAR", label: "ريال سعودي - SAR", symbol: "ر.س" },
    { value: "AED", label: "درهم إماراتي - AED", symbol: "د.إ" },
    { value: "EUR", label: "يورو - EUR", symbol: "€" },
  ];

  const timezones = [
    { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
    { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
    { value: "Asia/Dubai", label: "دبي (GMT+4)" },
    { value: "Europe/London", label: "لندن (GMT+0)" },
    { value: "America/New_York", label: "نيويورك (GMT-5)" },
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "اسم الشركة مطلوب";
    }

    if (!formData.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "البريد الإلكتروني غير صحيح";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/owner/companies", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        address: formData.address.trim() || undefined,
        currency: formData.currency,
        timezone: formData.timezone,
      });

      if (response.data.success) {
        tToast.success("CreateCompanyModal.success_create_60f4");
        onSuccess();
        handleClose();
      } else {
        toast.error(response.data.message || i18n.t("CreateCompanyModal.failed_create_0bca"));
      }
    } catch (error: any) {
      console.error("Error creating company:", error);
      const errorMessage =
        error.response?.data?.message || "حدث خطأ أثناء إنشاء الشركة";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      currency: "EGP",
      timezone: "Africa/Cairo",
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                إضافة شركة جديدة
              </h2>
              <p className="text-xs text-muted-foreground">
                أدخل البيانات الأساسية للشركة لتسجيلها في النظام
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              اسم الشركة <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`block w-full pr-9 pl-3 py-2 text-xs rounded-xl border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition ${
                  errors.name
                    ? "border-rose-500"
                    : "border-border/70"
                }`}
                placeholder="مثال: شركة المتجر المتميز"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-[11px] text-rose-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              البريد الإلكتروني للشركة <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`block w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition ${
                  errors.email
                    ? "border-rose-500"
                    : "border-border/70"
                }`}
                placeholder="company@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] text-rose-500">{errors.email}</p>
            )}
          </div>

          {/* Phone & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                رقم الهاتف للتواصل
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="block w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-border/70 bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="+20 123 456 7890"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                الموقع الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="block w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-border/70 bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              عنوان المقر الرئيسي
            </label>
            <div className="relative">
              <div className="absolute top-2.5 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                rows={2}
                className="block w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-border/70 bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                placeholder="العنوان الكامل ومقر النشاط"
              />
            </div>
          </div>

          {/* Currency & Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                العملة الافتراضية
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Coins className="w-4 h-4" />
                </div>
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className="block w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                >
                  {currencies.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                المنطقة الزمنية
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  <Clock className="w-4 h-4" />
                </div>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  className="block w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground rounded-xl transition-all duration-150 active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-2xs transition-all duration-150 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>إنشاء الشركة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyModal;
