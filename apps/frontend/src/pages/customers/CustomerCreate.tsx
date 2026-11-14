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
  FileText,
  MessageCircle,
  MessageSquare,
  Briefcase,
  HelpCircle,
  Clock,
  Calendar,
  Sparkles,
  Copy,
  ExternalLink,
  X,
  Target,
  Flame,
  Zap,
  Snowflake,
  DollarSign
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { DateInput } from "../../components/ui/DateInput";

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2: string;
  whatsappPhone: string;
  address: string;
  city: string;
  country: string;
  status: string;
  leadStage: string;
  leadPriority: string;
  leadSource: string;
  dealValue: string;
  expectedCloseDate: string;
  customerJob: string;
  customerInterests: string;
  inquiryDetails: string;
  expectedBudget: string;
  preferredContactMethod: string;
  nextFollowUpDate: string;
  initialFollowUpNote: string;
  notes: string;
  birthday: string;
  password: string;
}

const INTEREST_SUGGESTIONS = [
  "استفسار عن الأسعار والخدمات",
  "حملات تسويقية وإعلانات",
  "برمجة ومواقع وتطبيقات",
  "شراء منتجات وتجارة",
  "طلب عينة وتجربة",
  "استشارة ومتابعة عمل",
  "حجز أو اشتراك",
  "توريد وشراء بالجملة"
];

const CustomerCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phone2: "",
    whatsappPhone: "",
    address: "",
    city: "",
    country: "",
    status: "LEAD",
    leadStage: "NEW_LEAD",
    leadPriority: "WARM",
    leadSource: "WHATSAPP",
    dealValue: "",
    expectedCloseDate: "",
    customerJob: "",
    customerInterests: "",
    inquiryDetails: "",
    expectedBudget: "",
    preferredContactMethod: "WHATSAPP",
    nextFollowUpDate: "",
    initialFollowUpNote: "",
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

  const copyPhoneToWhatsApp = () => {
    if (!formData.phone) return;
    setFormData((prev) => ({ ...prev, whatsappPhone: prev.phone }));
  };

  const handleAddInterestSuggestion = (item: string) => {
    setFormData((prev) => {
      const current = prev.customerInterests ? prev.customerInterests.split("،").map((s) => s.trim()).filter(Boolean) : [];
      if (!current.includes(item)) {
        current.push(item);
      }
      return { ...prev, customerInterests: current.join("، ") };
    });
  };

  const clearEmail = () => {
    setFormData((prev) => ({ ...prev, email: "" }));
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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        phone2: formData.phone2.trim() || undefined,
        whatsappPhone: formData.whatsappPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        status: formData.status,
        leadStage: formData.leadStage,
        leadPriority: formData.leadPriority,
        leadSource: formData.leadSource,
        dealValue: formData.dealValue.trim() || undefined,
        expectedCloseDate: formData.expectedCloseDate.trim() || undefined,
        customerJob: formData.customerJob.trim() || undefined,
        customerInterests: formData.customerInterests.trim() || undefined,
        inquiryDetails: formData.inquiryDetails.trim() || undefined,
        expectedBudget: formData.expectedBudget.trim() || undefined,
        preferredContactMethod: formData.preferredContactMethod,
        nextFollowUpDate: formData.nextFollowUpDate.trim() || undefined,
        initialFollowUpNote: formData.initialFollowUpNote.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        password: (enablePassword && formData.password.trim()) ? formData.password.trim() : undefined,
      };

      if (formData.birthday && formData.birthday.trim()) {
        payload.birthday = formData.birthday.trim();
      }

      payload.metadata = JSON.stringify({
        birthday: payload.birthday || undefined,
        whatsappPhone: payload.whatsappPhone,
        leadStage: payload.leadStage,
        leadPriority: payload.leadPriority,
        leadSource: payload.leadSource,
        customerJob: payload.customerJob,
        customerInterests: payload.customerInterests,
        inquiryDetails: payload.inquiryDetails,
        expectedBudget: payload.expectedBudget,
        preferredContactMethod: payload.preferredContactMethod,
        nextFollowUpDate: payload.nextFollowUpDate,
      });

      const response = await apiClient.post("/customers", payload);
      const newId = response.data?.data?.id || response.data?.id;
      setSuccessMessage("تم إضافة العميل وتسجيل اهتماماته وسجل المتابعة بنجاح");
      setTimeout(() => {
        if (newId) {
          navigate(`/customers/${newId}`);
        } else {
          navigate("/customers");
        }
      }, 1000);
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
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              <span>إضافة عميل جديد</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              تسجيل بيانات العميل، أرقام الواتساب والهاتف، اهتمامات واستفسارات الشغل، وسجل التواصل والمتابعة
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
        autoComplete="off"
        className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-6"
      >
        {/* Hidden inputs to trick browser password managers and prevent auto-filling admin credentials */}
        <input type="text" name="prevent_autofill_user" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
        <input type="password" name="prevent_autofill_pwd" style={{ display: "none" }} tabIndex={-1} autoComplete="new-password" />

        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">البيانات الشخصية والأساسية</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                الاسم الأول <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                autoFocus
                placeholder="مثال: أحمد"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                اسم العائلة / اللقب
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="مثال: محمود"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span>طبيعة عمل العميل / الشركة أو المجال</span>
              </label>
              <input
                type="text"
                name="customerJob"
                value={formData.customerJob}
                onChange={handleChange}
                placeholder="مثال: صاحب متجر ملابس / مهندس ديكور / شركة مقاولات"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>تاريخ الميلاد (لحملات التهنئة والولاء التلقائية)</span>
              </label>
              <DateInput
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information & WhatsApp */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-semibold text-foreground">بيانات الاتصال وأرقام الواتساب والهاتف</h3>
            </div>
            {formData.phone && !formData.whatsappPhone && (
              <button
                type="button"
                onClick={copyPhoneToWhatsApp}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-500 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-md transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>نسخ رقم الهاتف إلى الواتساب</span>
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Primary Phone */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>رقم الهاتف الأساسي</span>
                <span className="text-[10px] text-muted-foreground">للاتصال والرسائل</span>
              </label>
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

            {/* WhatsApp Phone */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <MessageCircle className="h-3.5 w-3.5" />
                  رقم الواتساب (WhatsApp)
                </span>
                {formData.whatsappPhone && (
                  <a
                    href={`https://wa.me/${formData.whatsappPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>تجربة واتساب</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="whatsappPhone"
                  value={formData.whatsappPhone}
                  onChange={handleChange}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="w-full rounded-lg border border-emerald-500/40 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                />
              </div>
            </div>

            {/* Secondary Phone */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                رقم هاتف بديل / إضافي (اختياري)
              </label>
              <input
                type="tel"
                name="phone2"
                value={formData.phone2}
                onChange={handleChange}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
              />
            </div>

            {/* Email with Clear Button to prevent Autofill */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>البريد الإلكتروني (اختياري)</span>
                {formData.email && (
                  <button
                    type="button"
                    onClick={clearEmail}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors"
                    title="مسح البريد لتفادي الملء التلقائي"
                  >
                    <X className="h-3 w-3" />
                    <span>مسح البريد</span>
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder="customer@example.com (اتركه فارغاً إن لم يتوفر)"
                  dir="ltr"
                  className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
                />
              </div>
            </div>

            {/* Optional Customer Portal Password toggle */}
            <div className="sm:col-span-2 pt-1 border-t border-border/40">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  إنشاء حساب دخول وكلمة مرور لبوابة العميل (اختياري)
                </span>
              </label>

              {enablePassword && (
                <div className="mt-3 relative max-w-md">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    minLength={6}
                    placeholder="أدخل كلمة مرور العميل (6 أحرف على الأقل)"
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
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Customer Status, Stage & Pipeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Target className="h-4 w-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-foreground">حالة العميل، مرحلة المتابعة والمسار البيعي</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {/* Base Status */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">حالة الحساب الأساسية</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LEAD">عميل محتمل (Lead)</option>
                <option value="ACTIVE">عميل نشط (Active)</option>
                <option value="INACTIVE">غير نشط (Inactive)</option>
                <option value="BLOCKED">محظور (Blocked)</option>
              </select>
            </div>

            {/* Lead Pipeline Stage */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">مرحلة ومسار المتابعة</label>
              <select
                name="leadStage"
                value={formData.leadStage}
                onChange={handleChange}
                className="w-full rounded-lg border border-purple-500/40 bg-background px-3 py-2 text-xs text-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
              >
                <option value="NEW_LEAD">عميل محتمل جديد (New Lead)</option>
                <option value="CONTACTED">تم التواصل المبدئي (Contacted)</option>
                <option value="INTERESTED">مهتم واستفسر عن الخدمات (Interested)</option>
                <option value="FOLLOW_UP_SCHEDULED">محدد موعد متابعة (Follow-up)</option>
                <option value="PROPOSAL_SENT">تم إرسال عرض سعر وتفاصيل (Proposal)</option>
                <option value="NEGOTIATION">جاري التفاوض والمناقشة (Negotiating)</option>
                <option value="CONVERTED">تم الاتفاق / تحول لعميل نشط (Won)</option>
                <option value="NOT_INTERESTED">غير مهتم حالياً (Not Interested)</option>
                <option value="LOST">ملغي / لا يرد (Lost)</option>
              </select>
            </div>

            {/* Lead Priority / Temperature */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                درجة حرارة واهتمام العميل
              </label>
              <select
                name="leadPriority"
                value={formData.leadPriority}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="HOT">🔥 مهتم جداً / ساخن (Hot)</option>
                <option value="WARM">⚡ مهتم / متوسط (Warm)</option>
                <option value="COLD">❄️ بارد / استفسار عام (Cold)</option>
              </select>
            </div>

            {/* Lead Source */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">مصدر وصول العميل</label>
              <select
                name="leadSource"
                value={formData.leadSource}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="WHATSAPP">واتساب (WhatsApp)</option>
                <option value="FACEBOOK">فيسبوك ومسنجر (Facebook)</option>
                <option value="INSTAGRAM">إنستغرام (Instagram)</option>
                <option value="TIKTOK">تيك توك (TikTok)</option>
                <option value="CALL">اتصال هاتفي (Phone Call)</option>
                <option value="WEBSITE">المتجر أو الموقع (Website)</option>
                <option value="REFERRAL">ترشيح وتوصية (Referral)</option>
                <option value="WALK_IN">زيارة مباشرة للمقر (Walk-in)</option>
                <option value="OTHER">أخرى (Other)</option>
              </select>
            </div>

            {/* Deal Value */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">قيمة الصفقة المتوقعة (ج.م)</label>
              <input
                type="number"
                name="dealValue"
                value={formData.dealValue}
                onChange={handleChange}
                min="0"
                step="any"
                placeholder="مثال: 12500"
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium tabular-nums"
              />
            </div>

            {/* Expected Close Date */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">تاريخ الإغلاق المتوقع</label>
              <input
                type="date"
                name="expectedCloseDate"
                value={formData.expectedCloseDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Customer Inquiries, Interests & Work Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-foreground">
              اهتمامات العميل وكل ما سأل عنه بخصوص الشغل والخدمات
            </h3>
          </div>

          <div className="space-y-3">
            {/* Quick interest badges */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                الخدمات أو المنتجات التي سأل عنها العميل
              </label>
              <input
                type="text"
                name="customerInterests"
                value={formData.customerInterests}
                onChange={handleChange}
                placeholder="اكتب الخدمات أو اختر من المقترحات السريعة بالأسفل..."
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  اقتراحات سريعة:
                </span>
                {INTEREST_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddInterestSuggestion(item)}
                    className="text-[10px] rounded-md border border-border/70 bg-background px-2 py-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  الميزانية التقريبية المتوقعة أو حجم الطلب
                </label>
                <input
                  type="text"
                  name="expectedBudget"
                  value={formData.expectedBudget}
                  onChange={handleChange}
                  placeholder="مثال: 5000 ج.م / طلب كمية 50 قطعة"
                  className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                  طريقة التواصل والمتابعة المفضلة للعميل
                </label>
                <select
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="WHATSAPP">مراسلة واتساب (WhatsApp)</option>
                  <option value="CALL">مكالمة هاتفية (Phone Call)</option>
                  <option value="EMAIL">بريد إلكتروني (Email)</option>
                </select>
              </div>
            </div>

            {/* In-depth Inquiry Details */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                تفاصيل استفسار العميل ومتطلبات العمل كاملة
              </label>
              <textarea
                name="inquiryDetails"
                value={formData.inquiryDetails}
                onChange={handleChange}
                rows={3}
                placeholder="سجل هنا تفاصيل كل ما سأل عنه العميل، استفساراته عن الأسعار، الشروط، المواعيد المطلوبة، وأي أسئلة طرحها..."
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Follow-Up & Next Action */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Clock className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-foreground">سجل التواصل وموعد المتابعة القادمة</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                تاريخ ووقت المتابعة القادمة المجدولة
              </label>
              <input
                type="datetime-local"
                name="nextFollowUpDate"
                value={formData.nextFollowUpDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-blue-500/40 bg-background px-3.5 py-2 text-xs text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground font-medium">
                ملخص أول تواصل أو ملاحظة متابعة فورية
              </label>
              <input
                type="text"
                name="initialFollowUpNote"
                value={formData.initialFollowUpNote}
                onChange={handleChange}
                placeholder="مثال: تم التواصل عبر واتساب وشرح باقات الأسعار، المتابعة يوم الأحد"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Address & General Notes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <MapPin className="h-4 w-4 text-zinc-500" />
            <h3 className="text-xs font-semibold text-foreground">العنوان والملاحظات العامة</h3>
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

            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات داخلية إضافية</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="أي ملاحظات داخلية لفريق العمل..."
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
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
                <span>حفظ بيانات واهتمامات العميل</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerCreate;
