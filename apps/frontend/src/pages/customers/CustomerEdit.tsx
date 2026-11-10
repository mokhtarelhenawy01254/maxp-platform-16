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
  MessageCircle,
  Briefcase,
  HelpCircle,
  Clock,
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
import LoadingSpinner from "../../components/LoadingSpinner";
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
  customerJob: string;
  customerInterests: string;
  inquiryDetails: string;
  expectedBudget: string;
  preferredContactMethod: string;
  nextFollowUpDate: string;
  notes: string;
  birthday: string;
  password?: string;
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

const CustomerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // New follow-up quick entry during edit
  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [newFollowUpType, setNewFollowUpType] = useState("CALL");
  const [newFollowUpOutcome, setNewFollowUpOutcome] = useState("ANSWERED");

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
    customerJob: "",
    customerInterests: "",
    inquiryDetails: "",
    expectedBudget: "",
    preferredContactMethod: "WHATSAPP",
    nextFollowUpDate: "",
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
        
        let m: any = {};
        try {
          if (c?.metadata) {
            m = typeof c.metadata === "string" ? JSON.parse(c.metadata) : c.metadata;
          }
        } catch (e) {
          console.error("Failed to parse metadata in CustomerEdit:", e);
        }

        // استخراج تاريخ الميلاد بأمان مع تحويله لصيغة YYYY-MM-DD القياسية
        let birthdayVal = c?.birthday || m?.birthday || m?.birthDate || m?.dateOfBirth || "";
        if (birthdayVal && typeof birthdayVal === "string") {
          const matchIso = birthdayVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (matchIso) {
            birthdayVal = `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
          } else {
            const matchDMY = birthdayVal.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
            if (matchDMY) {
              birthdayVal = `${matchDMY[3]}-${matchDMY[2].padStart(2, "0")}-${matchDMY[1].padStart(2, "0")}`;
            }
          }
        }

        setFormData({
          firstName: c?.firstName || "",
          lastName: c?.lastName || "",
          email: c?.email || "",
          phone: c?.phone || "",
          phone2: c?.phone2 || m?.phone2 || "",
          whatsappPhone: c?.whatsappPhone || m?.whatsappPhone || c?.whatsappId || "",
          address: c?.address || m?.address || "",
          city: c?.city || m?.city || "",
          country: c?.country || m?.country || "",
          status: c?.status || "LEAD",
          leadStage: c?.leadStage || m?.leadStage || "NEW_LEAD",
          leadPriority: c?.leadPriority || m?.leadPriority || "WARM",
          leadSource: c?.leadSource || m?.leadSource || "WHATSAPP",
          customerJob: c?.customerJob || m?.customerJob || "",
          customerInterests: c?.customerInterests || m?.customerInterests || "",
          inquiryDetails: c?.inquiryDetails || m?.inquiryDetails || "",
          expectedBudget: c?.expectedBudget || m?.expectedBudget || "",
          preferredContactMethod: c?.preferredContactMethod || m?.preferredContactMethod || "WHATSAPP",
          nextFollowUpDate: c?.nextFollowUpDate || m?.nextFollowUpDate || "",
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

  const copyPhoneToWhatsApp = () => {
    if (!formData.phone) return;
    setFormData((prev) => ({ ...prev, whatsappPhone: prev.phone }));
  };

  const clearEmail = () => {
    setFormData((prev) => ({ ...prev, email: "" }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email ? formData.email.trim() : "", // إرسال نص فارغ ليمسح الإيميل في الباك إند
        phone: formData.phone.trim() || "",
        phone2: formData.phone2.trim() || "",
        whatsappPhone: formData.whatsappPhone.trim() || "",
        address: formData.address.trim() || "",
        city: formData.city.trim() || "",
        country: formData.country.trim() || "",
        status: formData.status,
        leadStage: formData.leadStage,
        leadPriority: formData.leadPriority,
        leadSource: formData.leadSource,
        customerJob: formData.customerJob.trim() || "",
        customerInterests: formData.customerInterests.trim() || "",
        inquiryDetails: formData.inquiryDetails.trim() || "",
        expectedBudget: formData.expectedBudget.trim() || "",
        preferredContactMethod: formData.preferredContactMethod,
        nextFollowUpDate: formData.nextFollowUpDate.trim() || "",
        notes: formData.notes.trim() || "",
        birthday: formData.birthday.trim() || "",
      };

      // إذا تم إدخال كلمة مرور جديدة
      if (formData.password && formData.password.trim().length > 0) {
        payload.password = formData.password.trim();
      }

      // إذا تمت إضافة ملاحظة تواصل جديدة أثناء التعديل
      if (newFollowUpNote.trim()) {
        payload.newFollowUpEntry = {
          type: newFollowUpType,
          outcome: newFollowUpOutcome,
          details: newFollowUpNote.trim(),
          nextFollowUpDate: formData.nextFollowUpDate.trim() || null,
        };
      }

      await apiClient.put(`/customers/${id}`, payload);
      setSuccessMessage("تم حفظ جميع تعديلات واهتمامات العميل بنجاح");
      setTimeout(() => navigate(`/customers/${id}`), 1000);
    } catch (err: any) {
      console.error("Error updating customer:", err);
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
          <h1 className="text-base font-bold tracking-tight text-foreground">
            تعديل ملف العميل واهتماماته
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {formData.firstName || formData.lastName
              ? `${formData.firstName} ${formData.lastName}`.trim()
              : "تحديث البيانات، أرقام الواتساب والهاتف، استفسارات الشغل، وسجل المتابعة"}
          </p>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
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

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="rounded-xl border border-border/70 bg-card p-5 space-y-5 shadow-xs"
      >
        {/* Hidden inputs to trick browser password managers */}
        <input type="text" name="prevent_autofill_user" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
        <input type="password" name="prevent_autofill_pass" style={{ display: "none" }} tabIndex={-1} autoComplete="new-password" />

        {/* Section 1: Personal info & Work Field */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>البيانات الشخصية وطبيعة العمل</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">الاسم الأول *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">اسم العائلة / اللقب</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                طبيعة عمل العميل / الشركة أو المجال
              </label>
              <input
                type="text"
                name="customerJob"
                value={formData.customerJob}
                onChange={handleChange}
                placeholder="مثال: صاحب متجر ملابس / مصنع / شركة"
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                تاريخ الميلاد (لحملات التهنئة والولاء التلقائية)
              </label>
              <DateInput
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Contact info & WhatsApp */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              <span>الاتصال وأرقام الواتساب</span>
            </div>
            {formData.phone && !formData.whatsappPhone && (
              <button
                type="button"
                onClick={copyPhoneToWhatsApp}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded transition-colors"
              >
                <Copy className="h-2.5 w-2.5" />
                <span>نسخ الهاتف للواتساب</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">رقم الهاتف الأساسي</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                dir="ltr"
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <MessageCircle className="h-3 w-3" />
                  رقم الواتساب (WhatsApp)
                </span>
                {formData.whatsappPhone && (
                  <a
                    href={`https://wa.me/${formData.whatsappPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>فتح محادثة واتساب</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </label>
              <input
                type="tel"
                name="whatsappPhone"
                value={formData.whatsappPhone}
                onChange={handleChange}
                dir="ltr"
                className="w-full px-3 py-1.5 rounded-md border border-emerald-500/40 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-right"
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">رقم هاتف بديل / إضافي (اختياري)</label>
              <input
                type="tel"
                name="phone2"
                value={formData.phone2}
                onChange={handleChange}
                dir="ltr"
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center justify-between">
                <span>البريد الإلكتروني</span>
                {formData.email && (
                  <button
                    type="button"
                    onClick={clearEmail}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors"
                    title="مسح البريد الإلكتروني"
                  >
                    <X className="h-3 w-3" />
                    <span>مسح البريد</span>
                  </button>
                )}
              </label>
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
                dir="ltr"
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                placeholder="اتركه فارغاً إذا كنت لا ترغب في تسجيل بريد"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                كلمة المرور الجديدة لبوابة العميل (اختياري)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password || ""}
                  onChange={handleChange}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  minLength={6}
                  dir="ltr"
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder="اتركها فارغة للإبقاء على كلمة المرور الحالية بدون تغيير"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Status, Stage & Priority */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <Target className="h-3.5 w-3.5 text-purple-500" />
            <span>حالة العميل، مرحلة المتابعة والمسار البيعي</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">حالة العميل</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LEAD">عميل محتمل (Lead)</option>
                <option value="ACTIVE">نشط (Active)</option>
                <option value="INACTIVE">غير نشط (Inactive)</option>
                <option value="BLOCKED">محظور (Blocked)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">مرحلة المتابعة</label>
              <select
                name="leadStage"
                value={formData.leadStage}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-purple-500/40 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
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
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500" />
                درجة حرارة واهتمام العميل
              </label>
              <select
                name="leadPriority"
                value={formData.leadPriority}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="HOT">🔥 مهتم جداً / ساخن (Hot)</option>
                <option value="WARM">⚡ مهتم / متوسط (Warm)</option>
                <option value="COLD">❄️ بارد / استفسار عام (Cold)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">مصدر العميل</label>
              <select
                name="leadSource"
                value={formData.leadSource}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
          </div>
        </section>

        {/* Section 4: Inquiries & Interests regarding work */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>اهتمامات العميل وكل ما سأل عنه بخصوص الشغل</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block mb-1 font-medium text-foreground">الخدمات أو المنتجات التي سأل عنها</label>
              <input
                type="text"
                name="customerInterests"
                value={formData.customerInterests}
                onChange={handleChange}
                placeholder="اكتب الخدمات أو اختر من المقترحات السريعة بالأسفل..."
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  اقتراحات سريعة:
                </span>
                {INTEREST_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddInterestSuggestion(item)}
                    className="text-[10px] rounded border border-border/70 bg-background px-1.5 py-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-500" />
                  الميزانية التقريبية المتوقعة أو حجم الطلب
                </label>
                <input
                  type="text"
                  name="expectedBudget"
                  value={formData.expectedBudget}
                  onChange={handleChange}
                  placeholder="مثال: 5000 ج.م / طلب كمية 50 قطعة"
                  className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-foreground">طريقة التواصل المفضلة</label>
                <select
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="WHATSAPP">مراسلة واتساب (WhatsApp)</option>
                  <option value="CALL">مكالمة هاتفية (Phone Call)</option>
                  <option value="EMAIL">بريد إلكتروني (Email)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium text-foreground">
                تفاصيل استفسار العميل ومتطلبات العمل كاملة
              </label>
              <textarea
                name="inquiryDetails"
                value={formData.inquiryDetails}
                onChange={handleChange}
                rows={3}
                placeholder="سجل هنا تفاصيل كل ما سأل عنه العميل، استفساراته عن الأسعار، الشروط، المواعيد المطلوبة..."
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Section 5: Follow-Up & Quick Interaction Logging */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>سجل التواصل والمتابعة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                تاريخ ووقت المتابعة القادمة المجدولة
              </label>
              <input
                type="datetime-local"
                name="nextFollowUpDate"
                value={formData.nextFollowUpDate}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-blue-500/40 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="flex items-end">
              <span className="text-[11px] text-muted-foreground pb-2">
                (يمكنك أيضاً استعراض السجل الكامل للتواصل وإضافة متابعات تفصيلية من تبويب "سجل التواصل والمتابعة" في صفحة تفاصيل العميل)
              </span>
            </div>
          </div>

          {/* Quick interaction box */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
            <span className="font-semibold text-foreground text-[11px] block">
              + تسجيل عملية تواصل / متابعة فورية مع العميل الآن (اختياري):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 text-[10px] text-muted-foreground">نوع التواصل</label>
                <select
                  value={newFollowUpType}
                  onChange={(e) => setNewFollowUpType(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-border/70 bg-background text-foreground"
                >
                  <option value="CALL">اتصال هاتفي</option>
                  <option value="WHATSAPP">محادثة واتساب</option>
                  <option value="VISIT">اجتماع / زيارة</option>
                  <option value="OFFER">تقديم عرض سعر</option>
                  <option value="EMAIL">بريد إلكتروني</option>
                  <option value="NOTE">ملاحظة متابعة</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[10px] text-muted-foreground">نتيجة التواصل</label>
                <select
                  value={newFollowUpOutcome}
                  onChange={(e) => setNewFollowUpOutcome(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-border/70 bg-background text-foreground"
                >
                  <option value="ANSWERED">تم الرد والاتفاق</option>
                  <option value="FOLLOW_UP">طلب مهلة / متابعة لاحقة</option>
                  <option value="NO_ANSWER">لم يرد</option>
                  <option value="BUSY">الرقم مشغول</option>
                  <option value="NOT_INTERESTED">غير مهتم حالياً</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block mb-1 text-[10px] text-muted-foreground">ملخص ما دار في المكالمة أو التواصل</label>
                <input
                  type="text"
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                  placeholder="اكتب ملخص التواصل..."
                  className="w-full px-2 py-1 rounded border border-border/70 bg-background text-foreground"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Address & General Notes */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            <span>العنوان والملاحظات العامة</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block mb-1 font-medium text-foreground">العنوان التفصيلي</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="الشارع، المنطقة، رقم المبنى..."
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">المدينة / المحافظة</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-foreground">الدولة</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block font-medium text-foreground flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
              ملاحظات داخلية
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="ملاحظات وتفضيلات إضافية..."
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <Link
            to={`/customers/${id}`}
            className="rounded-md border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>حفظ التعديلات والاهتمامات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerEdit;
