/**
 * 📊 Attribution Settings
 *
 * إعدادات إحالة التحويلات لحملات فيسبوك
 * Linear Single-Surface Chassis - Zero Emoji - MaxP Platform Standards
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Settings,
  ArrowRight,
  Clock,
  MousePointer,
  Eye,
  Loader2,
  CheckCircle2,
  Info,
  Sliders,
  Sparkles,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { facebookAdsService } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";

const AttributionSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    adSetId: "",
    clickWindow: "7d" as "1d" | "7d" | "28d",
    viewWindow: "1d" as "1d" | "7d",
    useAccountDefault: false,
  });

  const clickWindowOptions = [
    {
      value: "1d",
      label: "يوم واحد (1d)",
      badge: "دقة فورية",
      description: "احتساب التحويلات المباشرة خلال 24 ساعة من النقر",
    },
    {
      value: "7d",
      label: "7 أيام (7d)",
      badge: "الموصى به",
      description: "المعيار القياسي لاحتساب التحويلات خلال أسبوع من النقر",
    },
    {
      value: "28d",
      label: "28 يوماً (28d)",
      badge: "دورة مبيعات طويلة",
      description: "تتبع استراتيجي للقرارات الشرائية المعقدة خلال شهر",
    },
  ];

  const viewWindowOptions = [
    {
      value: "1d",
      label: "يوم واحد (1d)",
      badge: "الافتراضي الموصى به",
      description: "احتساب الشراء خلال 24 ساعة من مشاهدة الإعلان فقط",
    },
    {
      value: "7d",
      label: "7 أيام (7d)",
      badge: "تأثير متراكم",
      description: "احتساب التحويل حتى 7 أيام بعد مشاهدة الإعلان بدون نقر",
    },
  ];

  const handleSave = async () => {
    if (!settings.adSetId.trim()) {
      tToast.error("AttributionSettings.msg_c7b7");
      return;
    }

    try {
      setLoading(true);
      const attributionPayload: any = {
        clickWindow: settings.clickWindow,
        viewWindow: settings.viewWindow,
        useAccountDefault: settings.useAccountDefault,
      };
      await facebookAdsService.updateAttributionSettings(
        settings.adSetId,
        attributionPayload,
      );
      tToast.success("AttributionSettings.success_save_97ba");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error?.response?.data?.error || "فشل في حفظ إعدادات الإحالة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      <FacebookAdsModuleNav />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/advertising/facebook-ads")}
            className="p-2 border border-border/70 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
            title="رجوع لإعلانات فيسبوك"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Settings className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                إعدادات الإحالة (Attribution Engine)
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تحديد النوافذ الزمنية المعيارية لقياس واحتساب مبيعات الحملات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/advertising/facebook-ads")}
            className="px-3.5 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !settings.adSetId.trim()}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                حفظ نافذة الإحالة
              </>
            )}
          </button>
        </div>
      </div>

      {/* Single Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        {/* Telemetry Status Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/70 bg-muted/20 divide-x divide-x-reverse divide-border/60">
          <div className="p-3.5 px-4">
            <span className="text-[11px] font-medium text-muted-foreground block">
              مجموعة الإعلانات (Ad Set)
            </span>
            <span className="text-sm font-bold font-mono text-foreground mt-0.5 block truncate">
              {settings.adSetId.trim() ? settings.adSetId : "لم يتم التحديد"}
            </span>
          </div>
          <div className="p-3.5 px-4">
            <span className="text-[11px] font-medium text-muted-foreground block">
              نافذة النقر (Click Window)
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-primary">
                {settings.clickWindow}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({clickWindowOptions.find((o) => o.value === settings.clickWindow)?.label})
              </span>
            </div>
          </div>
          <div className="p-3.5 px-4">
            <span className="text-[11px] font-medium text-muted-foreground block">
              نافذة المشاهدة (View Window)
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-foreground">
                {settings.viewWindow}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({viewWindowOptions.find((o) => o.value === settings.viewWindow)?.label})
              </span>
            </div>
          </div>
          <div className="p-3.5 px-4">
            <span className="text-[11px] font-medium text-muted-foreground block">
              نمط الإسناد
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold mt-0.5 ${
                settings.useAccountDefault ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {settings.useAccountDefault ? "افتراضي الحساب" : "مخصص للمجموعة"}
            </span>
          </div>
        </div>

        {/* AdSet ID Input Section */}
        <div className="p-5 border-b border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              معرف مجموعة الإعلانات المستهدفة (Ad Set ID)
              <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              مطلوب لحفظ قواعد الإسناد في Meta Graph API
            </span>
          </div>
          <input
            type="text"
            value={settings.adSetId}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, adSetId: e.target.value }))
            }
            placeholder="مثال: 2384958291029384"
            className="w-full px-3.5 py-2 text-sm bg-background border border-border/70 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* Click Attribution Window */}
        <div className="p-5 border-b border-border/70 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <MousePointer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                نافذة إحالة النقر (Click-Through Attribution)
              </h2>
              <p className="text-xs text-muted-foreground">
                الفترة الزمنية المعتمدة بعد نقر العميل على الإعلان لحساب الطلب كتحويل إعلاني
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {clickWindowOptions.map((option) => {
              const isSelected = settings.clickWindow === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      clickWindow: option.value as any,
                    }))
                  }
                  className={`p-3.5 rounded-lg border text-right transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                      : "border-border/70 bg-card hover:bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {option.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Attribution Window */}
        <div className="p-5 border-b border-border/70 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                نافذة إحالة المشاهدة (View-Through Attribution)
              </h2>
              <p className="text-xs text-muted-foreground">
                احتساب التحويلات الناتجة عن ظهور الإعلان للمستخدم بدون نقر مباشر
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {viewWindowOptions.map((option) => {
              const isSelected = settings.viewWindow === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      viewWindow: option.value as any,
                    }))
                  }
                  className={`p-3.5 rounded-lg border text-right transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/5 text-foreground ring-1 ring-purple-500"
                      : "border-border/70 bg-card hover:bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {option.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Default Fallback Toggle */}
        <div className="p-4 bg-muted/10 border-b border-border/70">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useAccountDefault}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  useAccountDefault: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 rounded border-border/70 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-bold text-foreground block">
                تفعيل الإعدادات الافتراضية لحساب الإعلانات (Account Default)
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                تجاهل النوافذ المخصصة أعلاه والاعتماد مباشرة على الضبط العام في Business Manager
              </p>
            </div>
          </label>
        </div>

        {/* Explanatory Technical Note */}
        <div className="p-4 bg-muted/20 flex items-start gap-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            يتم تطبيق هذه الإعدادات مباشرة على مستوى Ad Set في Meta API، وتؤثر على خوارزميات
            التحسين (Optimization for Ad Delivery) وتقارير العائد على الإنفاق الإعلاني (ROAS).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttributionSettings;
