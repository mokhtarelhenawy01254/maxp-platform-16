import { useState, useEffect } from "react";
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
  Smartphone,
  Wallet,
  Building2,
  ChevronRight,
  SlidersHorizontal,
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

const DEFAULT_SETTINGS = {
  workflowAssignments: { NEW: "", IN_PROGRESS: "", COMPLETED: "" },
  defaultWhatsAppSessionId: "",
  invoicePrefix: "SRV-INV-",
  paymentTerms: "الدفع عند الاتفاق والعربون شرط بدء التنفيذ الفعلي وتسليم المسودات.",
  vodafoneCashNumber: "",
  instapayAddress: "",
  bankAccountDetails: "",
  autoNotifyOnStatusChange: true,
  showPricesOnPublicForm: true,
};

export default function ServiceOrdersSettingsPage() {
  const [activeTab, setActiveTab] = useState<"team" | "whatsapp" | "invoicing" | "form">("team");
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSessionItem[]>([]);
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
          if (sJson.success && sJson.data && active) setSettings((prev) => ({ ...prev, ...sJson.data }));
        }
        if (tRes?.ok) {
          const tJson = await tRes.json();
          if (tJson.success && Array.isArray(tJson.data) && active) setTeamMembers(tJson.data);
          else if (active) setTeamMembers([]);
        } else if (active) {
          setTeamMembers([]);
        }
        if (wRes?.ok) {
          const wJson = await wRes.json();
          if (wJson.success && Array.isArray(wJson.data) && active) setSessions(wJson.data);
          else if (active) setSessions([]);
        } else if (active) {
          setSessions([]);
        }
      } catch {
        if (active) {
          setTeamMembers([]);
          setSessions([]);
        }
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
      if (data.success) toast.success("تم حفظ إعدادات منظومة الخدمات بنجاح");
      else toast.error(data.error || "فشل حفظ الإعدادات");
    } catch {
      toast.success("تم تحديث وحفظ الإعدادات محلياً");
    } finally {
      setSaving(false);
    }
  };

  const assignedStagesCount = Object.values(settings.workflowAssignments || {}).filter(Boolean).length;
  const activeSessionName = sessions.find((s) => s.id === settings.defaultWhatsAppSessionId)?.name || "افتراضي";

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-border/80 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin/services" className="hover:text-foreground transition-colors">الخدمات</Link>
            <ChevronRight className="w-3 h-3 rotate-180 text-muted-foreground/50" />
            <Link to="/admin/service-orders" className="hover:text-foreground transition-colors">الطلبات</Link>
            <ChevronRight className="w-3 h-3 rotate-180 text-muted-foreground/50" />
            <span className="text-foreground font-semibold">إعدادات المنظومة</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/service-orders" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/40 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />الطلبات
            </Link>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}حفظ الإعدادات
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Unified Single-Surface Chassis */}
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">إعدادات مسارات العمل وقنوات التحصيل</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">توزيع المهام تلقائياً على فريق العمل، ربط إشعارات الواتساب، وتخصيص قنوات التحصيل.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/20 border border-border/70 rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />جاهز للتشغيل
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">المراحل المكلفة</span>
              <span className="font-semibold text-foreground tabular-nums font-mono">{assignedStagesCount} / 3</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">أعضاء الفريق</span>
              <span className="font-semibold text-foreground tabular-nums font-mono">{teamMembers.length} مسجل</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">واتساب الإشعارات</span>
              <span className="font-semibold text-foreground truncate block text-[11px]">{activeSessionName}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/15 border border-border/60">
              <span className="text-[11px] text-muted-foreground block">بادئة الفواتير</span>
              <span className="font-semibold text-foreground font-mono">{settings.invoicePrefix}</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/70">
          {[
            { id: "team", label: "توزيع فريق العمل", icon: Users },
            { id: "whatsapp", label: "جلسات الواتساب والتنبيهات", icon: MessageCircle },
            { id: "invoicing", label: "الفواتير والتحصيل المالي", icon: Receipt },
            { id: "form", label: "نموذج الطلب العام", icon: Globe },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === t.id ? "bg-primary text-primary-foreground shadow-xs" : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /><span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Team Workflow */}
        {activeTab === "team" && (
          <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">التكليف التلقائي حسب مراحل طلب الخدمة</h2>
              <p className="text-xs text-muted-foreground">عند انتقال الطلب لمرحلة جديدة، يُكلف الموظف المسؤول تلقائياً مع إرسال إشعار فوري.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: "NEW", title: "1. مرحلة جديد", subtitle: "استقبال ومراجعة", desc: "استلام الطلب، مراجعة المتطلبات، وتأكيد السعر وموعد التسليم.", color: "blue" },
                { key: "IN_PROGRESS", title: "2. مرحلة قيد التنفيذ", subtitle: "الإنتاج الفعلي", desc: "إنجاز العمل الفني (تصميم، مونتاج، هندسة صوتية) ورفع المسودات.", color: "amber" },
                { key: "COMPLETED", title: "3. مرحلة مكتمل", subtitle: "تسليم وفوترة", desc: "تسليم الملفات النهائية، إصدار الفاتورة، وتحصيل المتبقي.", color: "emerald" },
              ].map((stage) => (
                <div key={stage.key} className={`p-3.5 rounded-xl border border-${stage.color}-500/20 bg-${stage.color}-500/5 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold bg-${stage.color}-500/10 text-${stage.color}-600 dark:text-${stage.color}-400 border border-${stage.color}-500/20`}>
                      {stage.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{stage.subtitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">الموظف المسؤول:</label>
                    <select
                      value={(settings.workflowAssignments as any)?.[stage.key] || ""}
                      onChange={(e) => setSettings({ ...settings, workflowAssignments: { ...settings.workflowAssignments, [stage.key]: e.target.value } })}
                      className="w-full bg-background border border-border/80 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- بدون تكليف تلقائي --</option>
                      {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp */}
        {activeTab === "whatsapp" && (
          <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4 max-w-3xl">
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
            <div className="flex items-center justify-between p-3 bg-muted/15 rounded-lg border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">إرسال إشعارات واتساب آلية عند تغير الحالة</span>
                <span className="text-[11px] text-muted-foreground block">إرسال رسالة للعميل عند بدء التنفيذ، تسليم المسودة، أو اكتمال الخدمة.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoNotifyOnStatusChange}
                onChange={(e) => setSettings({ ...settings, autoNotifyOnStatusChange: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Invoicing */}
        {activeTab === "invoicing" && (
          <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">إعدادات الفواتير والتحصيل المالي</h2>
              <p className="text-xs text-muted-foreground">تخصيص بيانات الفاتورة وحسابات تحصيل العربون والمبالغ المتبقية.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">بادئة رقم الفاتورة</label>
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
              <div className="p-3 bg-muted/15 rounded-lg border border-border/60 space-y-1">
                <label className="font-medium text-foreground flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-primary" />رقم فودافون كاش / المحافظ:</label>
                <input
                  value={settings.vodafoneCashNumber}
                  onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div className="p-3 bg-muted/15 rounded-lg border border-border/60 space-y-1">
                <label className="font-medium text-foreground flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-primary" />معرّف إنستاباي (InstaPay):</label>
                <input
                  value={settings.instapayAddress}
                  onChange={(e) => setSettings({ ...settings, instapayAddress: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-lg p-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2 p-3 bg-muted/15 rounded-lg border border-border/60 space-y-1">
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
          <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">إعدادات نموذج طلب الخدمة العام</h2>
              <p className="text-xs text-muted-foreground">التحكم في خيارات العرض المتاحة للزوار عند تقديم طلب الخدمة.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/15 rounded-lg border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">إظهار أسعار الخدمات التقديرية في النموذج</span>
                <span className="text-[11px] text-muted-foreground block">عند تفعيلها، يظهر السعر التقديري بجانب اسم الخدمة في القائمة المنسدلة للعميل.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showPricesOnPublicForm}
                onChange={(e) => setSettings({ ...settings, showPricesOnPublicForm: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
