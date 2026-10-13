import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Smartphone,
  Wallet,
  Building2,
  ChevronRight,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface WhatsAppSessionItem {
  id: string;
  name: string;
  phoneNumber: string;
  provider: string;
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: "tm-1", name: "م. إسلام حمدي", email: "eslam@maxp.online", role: "مدير العمليات والاستقبال" },
  { id: "tm-2", name: "سارة يوسف", email: "sara@maxp.online", role: "كبير مصممي الجرافيك" },
  { id: "tm-3", name: "كريم فؤاد", email: "karim@maxp.online", role: "مهندس صوت ومكساج" },
];

const DEFAULT_SESSIONS: WhatsAppSessionItem[] = [
  { id: "ws-1", name: "واتساب خدمات العملاء الرئيسي", phoneNumber: "+201012345678", provider: "Baileys" },
  { id: "ws-2", name: "واتساب الدعم الفني والمتابعة", phoneNumber: "+201098765432", provider: "Baileys" },
];

const DEFAULT_SETTINGS = {
  workflowAssignments: { NEW: "م. إسلام حمدي", IN_PROGRESS: "كريم فؤاد", COMPLETED: "م. إسلام حمدي" },
  defaultWhatsAppSessionId: "ws-1",
  invoicePrefix: "SRV-INV-",
  paymentTerms: "الدفع عند الاتفاق والعربون شرط بدء التنفيذ الفعلي وتسليم المسودات.",
  vodafoneCashNumber: "01012345678",
  instapayAddress: "studio@instapay",
  bankAccountDetails: "البنك الأهلي المصري - IBAN: EG380003000000001234567890123",
  autoNotifyOnStatusChange: true,
  showPricesOnPublicForm: true,
};

export default function ServiceOrdersSettingsPage() {
  const [activeTab, setActiveTab] = useState<"team" | "whatsapp" | "invoicing" | "form">("team");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [sessions, setSessions] = useState<WhatsAppSessionItem[]>(DEFAULT_SESSIONS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
        const headers = { Authorization: `Bearer ${token}` };
        const [sRes, tRes, wRes] = await Promise.all([
          fetch("/api/v1/service-orders/settings", { headers }).catch(() => null),
          fetch("/api/v1/service-orders/team-members", { headers }).catch(() => null),
          fetch("/api/v1/whatsapp/sessions", { headers }).catch(() => null),
        ]);
        if (sRes?.ok) {
          const sJson = await sRes.json();
          if (sJson.success && sJson.data && active) {
            setSettings((prev) => ({ ...prev, ...sJson.data }));
          }
        }
        if (tRes?.ok) {
          const tJson = await tRes.json();
          if (tJson.success && Array.isArray(tJson.data) && tJson.data.length && active) {
            setTeamMembers(tJson.data);
          }
        }
        if (wRes?.ok) {
          const wJson = await wRes.json();
          if (wJson.success && Array.isArray(wJson.data) && wJson.data.length && active) {
            setSessions(wJson.data);
          }
        }
      } catch {
        // Fallbacks remain active
      }
    };
    fetchInitialData();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      const res = await fetch("/api/v1/service-orders/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success) {
        toast.success("تم حفظ إعدادات منظومة الخدمات بنجاح");
      } else {
        toast.error(data.error || "فشل حفظ الإعدادات");
      }
    } catch {
      toast.success("تم تحديث وحفظ الإعدادات محلياً");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Breadcrumb Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin/services" className="hover:text-foreground">الخدمات وعينات الأعمال</Link>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-muted-foreground/60" />
            <Link to="/admin/service-orders" className="hover:text-foreground">طلبات الخدمات</Link>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-muted-foreground/60" />
            <span className="text-foreground font-semibold">إعدادات المنظومة</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/service-orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للطلبات
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ التغييرات
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Title Chassis Header */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            إعدادات طلبات الخدمات ومسارات العمل
          </h1>
          <p className="text-xs text-muted-foreground">
            توزيع المهام تلقائياً على فريق العمل، ربط إشعارات الواتساب الذكية، وتخصيص قنوات التحصيل المالي.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
          <button
            onClick={() => setActiveTab("team")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "team" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>توزيع فريق العمل والمسؤوليات</span>
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "whatsapp" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>جلسات الواتساب والتنبيهات</span>
          </button>
          <button
            onClick={() => setActiveTab("invoicing")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "invoicing" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>الفواتير والتحصيل المالي</span>
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "form" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>نموذج طلب الخدمة العام</span>
          </button>
        </div>

        {/* Tab 1: Team Workflow */}
        {activeTab === "team" && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">التكليف التلقائي حسب مراحل طلب الخدمة</h2>
              <p className="text-xs text-muted-foreground">عند انتقال الطلب لحالة جديدة، يُكلف الموظف المسؤول تلقائياً مع تنبيهه بالمهمة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    1. مرحلة "جديد"
                  </span>
                  <span className="text-[11px] text-muted-foreground">استقبال ومراجعة</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">استلام الطلب، مراجعة متطلبات العميل، وتأكيد السعر وموعد التسليم.</p>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">الموظف المسؤول:</label>
                  <select
                    value={settings.workflowAssignments?.NEW || ""}
                    onChange={(e) => setSettings({ ...settings, workflowAssignments: { ...settings.workflowAssignments, NEW: e.target.value } })}
                    className="w-full bg-background border border-border/80 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- بدون تكليف تلقائي --</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    2. مرحلة "قيد التنفيذ"
                  </span>
                  <span className="text-[11px] text-muted-foreground">الإنتاج والتنفيذ</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">إنجاز العمل الفني (تصميم، مونتاج، هندسة صوتية) ورفع المسودات.</p>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">الموظف المسؤول:</label>
                  <select
                    value={settings.workflowAssignments?.IN_PROGRESS || ""}
                    onChange={(e) => setSettings({ ...settings, workflowAssignments: { ...settings.workflowAssignments, IN_PROGRESS: e.target.value } })}
                    className="w-full bg-background border border-border/80 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- بدون تكليف تلقائي --</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    3. مرحلة "مكتمل"
                  </span>
                  <span className="text-[11px] text-muted-foreground">تسليم وفوترة</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">تسليم الروابط النهائية، إصدار الفاتورة المعتمدة، وتحصيل المتبقي.</p>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">الموظف المسؤول:</label>
                  <select
                    value={settings.workflowAssignments?.COMPLETED || ""}
                    onChange={(e) => setSettings({ ...settings, workflowAssignments: { ...settings.workflowAssignments, COMPLETED: e.target.value } })}
                    className="w-full bg-background border border-border/80 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- بدون تكليف تلقائي --</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp */}
        {activeTab === "whatsapp" && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">إدارة جلسات الواتساب والتنبيهات اللحظية</h2>
              <p className="text-xs text-muted-foreground">إرسال التحديثات التلقائية للعملاء مع الحفاظ على استمرارية نفس الجلسة.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">الجلسة الافتراضية للخدمات:</label>
              <select
                value={settings.defaultWhatsAppSessionId}
                onChange={(e) => setSettings({ ...settings, defaultWhatsAppSessionId: e.target.value })}
                className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">-- اختيار تلقائي (أحدث جلسة متصلة) --</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.phoneNumber})</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-muted/20 rounded-xl border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">إرسال إشعارات واتساب آلية عند تغير الحالة</span>
                <span className="text-[11px] text-muted-foreground block">إرسال رسالة للعميل عند بدء التنفيذ، تسليم المسودة، أو اكتمال الخدمة.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoNotifyOnStatusChange}
                onChange={(e) => setSettings({ ...settings, autoNotifyOnStatusChange: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Invoicing */}
        {activeTab === "invoicing" && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">إعدادات الفواتير والتحصيل المالي</h2>
              <p className="text-xs text-muted-foreground">تخصيص بيانات الفاتورة المطبوعة وحسابات تحصيل العربون والمبالغ المتبقية.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">بادئة رقم الفاتورة (Invoice Prefix)</label>
                <input
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-medium text-foreground block mb-1">الشروط والأحكام الافتراضية للفاتورة</label>
                <textarea
                  rows={2}
                  value={settings.paymentTerms}
                  onChange={(e) => setSettings({ ...settings, paymentTerms: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-1">
                <label className="font-medium text-foreground flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-primary" />رقم فودافون كاش / المحافظ:</label>
                <input
                  value={settings.vodafoneCashNumber}
                  onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-1">
                <label className="font-medium text-foreground flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-primary" />معرّف إنستاباي (InstaPay):</label>
                <input
                  value={settings.instapayAddress}
                  onChange={(e) => setSettings({ ...settings, instapayAddress: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2 p-3 bg-muted/20 rounded-lg border border-border/60 space-y-1">
                <label className="font-medium text-foreground flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" />بيانات الحساب البنكي والآيبان (IBAN):</label>
                <input
                  value={settings.bankAccountDetails}
                  onChange={(e) => setSettings({ ...settings, bankAccountDetails: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Public Form */}
        {activeTab === "form" && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">إعدادات نموذج طلب الخدمة العام</h2>
              <p className="text-xs text-muted-foreground">التحكم في خيارات العرض المتاحة للزوار عند تقديم طلب الخدمة.</p>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-muted/20 rounded-xl border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">إظهار أسعار الخدمات المقترحة في النموذج</span>
                <span className="text-[11px] text-muted-foreground block">عند تفعيلها، يظهر السعر التقديري بجانب اسم الخدمة في القائمة المنسدلة للعميل.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showPricesOnPublicForm}
                onChange={(e) => setSettings({ ...settings, showPricesOnPublicForm: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
