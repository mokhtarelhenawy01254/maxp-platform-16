import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Save, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Percent, 
  HelpCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface CashbackSettings {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  rules: {
    cashbackPercent: number;
    base: "total" | "subtotal";
    trigger: string;
    maxPerOrder?: number;
  };
}

const CashbackSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<{
    cashbackPercent: number;
    base: "total" | "subtotal";
    status: CashbackSettings["status"];
    maxPerOrder: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const settingsRes = await apiClient.get("/hr/customer-loyalty/cashback/settings");

      const cs: CashbackSettings | null = settingsRes?.data?.data || null;
      if (cs) {
        setSettings({
          cashbackPercent: cs.rules.cashbackPercent,
          base: cs.rules.base,
          status: cs.status,
          maxPerOrder: cs.rules.maxPerOrder || 0,
        });
      } else {
        setSettings({
          cashbackPercent: 0,
          base: "subtotal",
          status: "INACTIVE",
          maxPerOrder: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching cashback data:", error);
      tToast.error("CashbackSettings.error_error_6d32");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    if (settings.cashbackPercent < 0 || settings.cashbackPercent > 100) {
      tToast.error("CashbackSettings.msg_faa7");
      return;
    }

    if (settings.maxPerOrder < 0) {
      tToast.error("CashbackSettings.msg_3170");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put("/hr/customer-loyalty/cashback/settings", settings);
      tToast.success("CashbackSettings.success_save_fe44");
    } catch (error: any) {
      console.error("Error saving cashback settings:", error);
      toast.error(error?.response?.data?.error || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل إعدادات برنامج الكاش باك...</span>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/customers/loyalty-programs"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">إعدادات الكاش باك</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تكوين نظام المكافآت المالية المباشرة وتحديد نسب استرداد الأموال للعملاء
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? "جارِ الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sliders className="w-4 h-4 text-primary" />
            <span>معايير احتساب الكاش باك الأساسية</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            settings.status === "ACTIVE" 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
              : "bg-muted/50 text-muted-foreground border border-border/70"
          }`}>
            {settings.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{settings.status === "ACTIVE" ? "النظام نشط ومفعل" : "النظام معطل مؤقتاً"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              حالة النظام العامة
            </label>
            <div className="relative">
              <select
                value={settings.status}
                onChange={(e) =>
                  setSettings({ ...settings, status: e.target.value as any })
                }
                className="w-full pl-8 pr-3 py-2 bg-background border border-border/70 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ACTIVE">نشط (Active) — احتساب الكاش باك لجميع الطلبات المؤهلة</option>
                <option value="INACTIVE">متوقف (Inactive) — إيقاف مؤقت دون حذف الإعدادات</option>
                <option value="DRAFT">مسودة (Draft) — قيد المراجعة والإعداد</option>
              </select>
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {settings.status === "ACTIVE" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Calculation Base */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              طريقة وقاعدة الحساب
            </label>
            <select
              value={settings.base}
              onChange={(e) =>
                setSettings({ ...settings, base: e.target.value as any })
              }
              className="w-full px-3 py-2 bg-background border border-border/70 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="subtotal">
                المجموع الفرعي (Subtotal) — صافي ثمن المنتجات قبل الشحن والضرائب
              </option>
              <option value="total">الإجمالي الكلي للطلب (Grand Total)</option>
            </select>
          </div>

          {/* Percentage */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              نسبة الكاش باك المستردة (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.cashbackPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cashbackPercent: Number(e.target.value),
                  })
                }
                className="w-full pl-8 pr-3 py-2 bg-background border border-border/70 rounded-lg text-xs font-mono font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Percent className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              النسبة المئوية الافتراضية المضافة إلى محفظة العميل عند اكتمال الطلب.
            </p>
          </div>

          {/* Max Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              الحد الأقصى للكاش باك للطلب الواحد
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.maxPerOrder}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxPerOrder: Number(e.target.value),
                  })
                }
                className="w-full pl-14 pr-3 py-2 bg-background border border-border/70 rounded-lg text-xs font-mono font-bold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-mono pointer-events-none">
                عملة المتجر
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              حدد 0 إذا كنت لا ترغب في فرض حد أقصى لمبلغ الكاش باك لكل طلب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashbackSettingsPage;
