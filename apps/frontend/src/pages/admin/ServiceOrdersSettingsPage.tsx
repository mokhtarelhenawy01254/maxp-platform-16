import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Save,
  Users,
  MessageCircle,
  Receipt,
  Globe,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Wallet,
  Building2,
  Sparkles
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface WhatsAppSessionItem {
  id: string;
  name: string;
  phoneNumber: string;
  provider: string;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

export default function ServiceOrdersSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"team" | "whatsapp" | "invoicing" | "form">("team");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSessionItem[]>([]);

  const [settings, setSettings] = useState({
    workflowAssignments: {
      NEW: "",
      IN_PROGRESS: "",
      COMPLETED: ""
    },
    defaultWhatsAppSessionId: "",
    invoicePrefix: "SRV-INV-",
    paymentTerms: "الدفع عند الاتفاق والعربون شرط بدء التنفيذ",
    vodafoneCashNumber: "",
    instapayAddress: "",
    bankAccountDetails: "",
    autoNotifyOnStatusChange: true,
    showPricesOnPublicForm: true
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [settingsRes, teamRes, sessionsRes] = await Promise.all([
        fetch("/api/v1/service-orders/settings", { headers: authHeaders() as any }),
        fetch("/api/v1/service-orders/team-members", { headers: authHeaders() as any }),
        fetch("/api/v1/whatsapp/sessions", { headers: authHeaders() as any })
      ]);

      const [settingsData, teamData, sessionsData] = await Promise.all([
        settingsRes.json(),
        teamRes.json(),
        sessionsRes.json()
      ]);

      if (settingsData.success && settingsData.data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsData.data,
          workflowAssignments: {
            ...prev.workflowAssignments,
            ...(settingsData.data.workflowAssignments || {})
          }
        }));
      }

      if (teamData.success && Array.isArray(teamData.data)) {
        setTeamMembers(teamData.data);
      }

      if (sessionsData.success && Array.isArray(sessionsData.data)) {
        setSessions(sessionsData.data.filter((s: any) => s.status === "connected" || s.status === "CONNECTED"));
      }
    } catch (e) {
      console.error(e);
      toast.error("فشل تحميل إعدادات طلبات الخدمات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/service-orders/settings", {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ إعدادات طلبات الخدمات بنجاح!");
      } else {
        toast.error(data.error || "فشل حفظ الإعدادات");
      }
    } catch (e) {
      toast.error("خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm font-medium">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 rtl" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/service-orders"
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors shadow-xs"
            title="العودة لطلبات الخدمات"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              إعدادات طلبات الخدمات
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              توزيع مهام فريق العمل حسب الحالة، جلسات الواتساب، الفواتير، وطرق التحصيل.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>حفظ التغييرات</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === "team"
              ? "bg-primary-600 text-white shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>توزيع فريق العمل والمهام</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === "whatsapp"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>جلسات الواتساب والإشعارات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoicing")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === "invoicing"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>الفواتير والتحصيل المالي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === "form"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>نموذج طلب الخدمة للعملاء</span>
        </button>
      </div>

      {/* Tab 1: Team & Workflow Assignments */}
      {activeTab === "team" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              توزيع الأدوار والمسؤوليات حسب حالة الطلب
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              حدد الموظف المسؤول عن متابعة وتنفيذ كل مرحلة من مراحل الخدمة. عند تغير حالة الطلب سيتم تكليف الموظف المختار تلقائياً وتنبيهه.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage: NEW */}
            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  1. حالة "جديد"
                </span>
                <span className="text-[11px] text-gray-400">الاستقبال والمراجعة</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                المسؤول عن استلام الطلبات الجديدة، مراجعة متطلبات ومرفقات العميل، والاتفاق على السعر.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">الموظف الافتراضي:</label>
                <select
                  value={settings.workflowAssignments?.NEW || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workflowAssignments: { ...settings.workflowAssignments, NEW: e.target.value }
                    })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- بدون تكليف تلقائي --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage: IN_PROGRESS */}
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  2. حالة "قيد التنفيذ"
                </span>
                <span className="text-[11px] text-gray-400">الإنتاج والتنفيذ</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                المسؤول عن إنجاز العمل الفني (تصميم، مونتاج، هندسة صوتية) ورفع المسودات والملفات.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">الموظف الافتراضي:</label>
                <select
                  value={settings.workflowAssignments?.IN_PROGRESS || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workflowAssignments: { ...settings.workflowAssignments, IN_PROGRESS: e.target.value }
                    })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- بدون تكليف تلقائي --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage: COMPLETED */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  3. حالة "مكتمل"
                </span>
                <span className="text-[11px] text-gray-400">التسليم والفوترة</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                المسؤول عن مراجعة الجودة، تسليم الروابط النهائية، إصدار الفاتورة، وتحصيل المتبقي.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">الموظف الافتراضي:</label>
                <select
                  value={settings.workflowAssignments?.COMPLETED || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workflowAssignments: { ...settings.workflowAssignments, COMPLETED: e.target.value }
                    })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- بدون تكليف تلقائي --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp & Sessions */}
      {activeTab === "whatsapp" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              إعدادات جلسات الواتساب والتواصل الذكي
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              إدارة توجيه الرسائل عبر الجلسات المتصلة وإرسال التنبيهات الآلية للعملاء.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Default Session */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                جلسة الواتساب الافتراضية للخدمات:
              </label>
              <select
                value={settings.defaultWhatsAppSessionId || ""}
                onChange={(e) => setSettings({ ...settings, defaultWhatsAppSessionId: e.target.value })}
                className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- اختيار تلقائي (أحدث جلسة متصلة) --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || "واتساب"} ({s.phoneNumber}) - {s.provider || "Baileys"}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                💡 <strong>قاعدة الجلسة الذكية:</strong> إذا كان العميل قد تواصل معنا سابقاً، سيرسل النظام تلقائياً من <strong>نفس الجلسة</strong> التي تحدث منها العميل، وفي حال كان عميلاً جديداً سيتم استخدام هذه الجلسة الافتراضية.
              </p>
            </div>

            {/* Toggle Auto Notify */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  إرسال إشعارات واتساب تلقائية عند تغير الحالة
                </span>
                <span className="text-[11px] text-gray-400 block">
                  إرسال رسالة آلية للعميل فوراً عند بدء التنفيذ، اكتمال الطلب، أو إلغائه.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoNotifyOnStatusChange}
                  onChange={(e) => setSettings({ ...settings, autoNotifyOnStatusChange: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Invoicing & Payment Settings */}
      {activeTab === "invoicing" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              إعدادات الفواتير وطرق التحصيل المالي
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              تخصيص بيانات الفاتورة المطبوعة وحسابات تحصيل العربون والمبالغ المتبقية من العملاء.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            {/* Invoice Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                بادئة رقم الفاتورة (Invoice Prefix):
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                placeholder="مثال: SRV-INV-"
                className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200"
                dir="ltr"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                الشروط والأحكام الافتراضية للفاتورة:
              </label>
              <textarea
                rows={2}
                value={settings.paymentTerms}
                onChange={(e) => setSettings({ ...settings, paymentTerms: e.target.value })}
                placeholder="تظهر هذه الشروط في أسفل الفاتورة المطبوعة..."
                className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Vodafone Cash */}
            <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-rose-600" />
                رقم فودافون كاش / المحافظ للتحصيل:
              </label>
              <input
                type="text"
                value={settings.vodafoneCashNumber}
                onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                placeholder="مثال: 01012345678"
                className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                dir="ltr"
              />
            </div>

            {/* InstaPay */}
            <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-purple-600" />
                عنوان إنستاباي (InstaPay Address):
              </label>
              <input
                type="text"
                value={settings.instapayAddress}
                onChange={(e) => setSettings({ ...settings, instapayAddress: e.target.value })}
                placeholder="مثال: username@instapay"
                className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                dir="ltr"
              />
            </div>

            {/* Bank Details */}
            <div className="space-y-1.5 sm:col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                بيانات التحويل البنكي (اختياري):
              </label>
              <input
                type="text"
                value={settings.bankAccountDetails}
                onChange={(e) => setSettings({ ...settings, bankAccountDetails: e.target.value })}
                placeholder="اسم البنك، رقم الحساب أو الآيبان (IBAN)..."
                className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Public Form Settings */}
      {activeTab === "form" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              إعدادات نموذج طلب الخدمة العام للعملاء
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              التحكم في خيارات العرض المتاحة للزوار عند تقديم طلب الخدمة عبر رابط المتجر.
            </p>
          </div>

          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  إظهار أسعار الخدمات في نموذج الطلب العام
                </span>
                <span className="text-[11px] text-gray-400 block">
                  عند تفعيلها، يظهر سعر كل خدمة بجانب اسمها للعميل عند اختيار الخدمة.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPricesOnPublicForm}
                  onChange={(e) => setSettings({ ...settings, showPricesOnPublicForm: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
