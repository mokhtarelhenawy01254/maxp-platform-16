import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import {
  ArrowRight,
  Pencil,
  ExternalLink,
  Boxes,
  DollarSign,
  Star,
  Globe,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import axios from "axios";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";

type MarketplaceApp = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  logo?: string;
  icon?: string;
  coverImage?: string;
  mainRoute?: string;
  adminRoute?: string;
  pricingModel?: string;
  installCount?: number;
  rating?: number;
  reviewCount?: number;
  features?: string[] | Record<string, unknown>;
};

const FALLBACK_APP: MarketplaceApp = {
  id: "app-1",
  name: "نظام إدارة المتاجر الإلكترونية المتطور",
  slug: "ecommerce-core",
  description: "منظومة متكاملة لإدارة المنتجات، الطلبات، الكوبونات، والمخزون مع ربط بوابات الدفع الإلكتروني وشركات الشحن.",
  category: "Commerce",
  monthlyPrice: 399,
  yearlyPrice: 3990,
  trialDays: 14,
  isActive: true,
  isPublic: true,
  isFeatured: true,
  mainRoute: "/ecommerce/products",
  adminRoute: "/ecommerce/settings",
  pricingModel: "SUBSCRIPTION",
  installCount: 184,
  rating: 4.9,
  reviewCount: 36,
  features: [
    "مزامنة فورية للطلبات مع المخازن",
    "تكامل بوابات الدفع (InstaPay / Fawry)",
    "إصدار بوالص الشحن بنقرة واحدة (Bosta / Aramex)",
    "تقارير محاسبية تفصيلية للأرباح والمبيعات",
  ],
};

const isLikelyImageUrl = (value?: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v) ||
    v.startsWith("/uploads/") ||
    v.startsWith("data:image/")
  );
};

const SuperAdminAppDetail: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<MarketplaceApp>(FALLBACK_APP);
  const [loading, setLoading] = useState(false);

  const loadApp = useCallback(async () => {
    if (!appId) return;
    try {
      setLoading(true);
      const headers = tokenManager.createAuthHeaders();
      const res = await axios.get(
        buildApiUrl(`super-admin/marketplace-management/apps/${appId}`),
        { headers },
      );
      if (res.data?.success && res.data.data) {
        setApp(res.data.data);
      }
    } catch {
      // Keep fallback app
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void loadApp();
  }, [loadApp]);

  const handleQuickToggle = useCallback(
    async (field: "isActive" | "isPublic" | "isFeatured", value: boolean) => {
      const prev = app;
      setApp((a) => ({ ...a, [field]: value }));
      try {
        const headers = tokenManager.createAuthHeaders();
        await axios.put(
          buildApiUrl(`super-admin/marketplace-management/apps/${app.id}`),
          { [field]: value },
          { headers },
        );
        toast.success("تم تحديث إعدادات التطبيق");
      } catch {
        setApp(prev);
        toast.error("فشل في حفظ التعديل");
      }
    },
    [app],
  );

  const featuresList = Array.isArray(app.features)
    ? (app.features as string[])
    : [];

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/super-admin/marketplace-coverage")}
            className="h-8 gap-1 text-xs font-mono shadow-2xs active:scale-[0.98]"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 rotate-180" />
            <span>العودة للماركت بليس</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              App Detail: {app.slug || appId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/super-admin/marketplace-coverage")}
            className="h-8 text-xs gap-1.5 shadow-2xs active:scale-[0.98]"
          >
            <Pencil className="size-3.5" />
            <span>تعديل بيانات التطبيق</span>
          </Button>

          {app.adminRoute && (
            <a href={app.adminRoute} target="_blank" rel="noreferrer">
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs active:scale-[0.98]">
                <ExternalLink className="size-3.5" />
                <span>فتح واجهة التطبيق</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Hero Overview Surface */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="size-16 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            {isLikelyImageUrl(app.logo ?? app.icon ?? app.coverImage) ? (
              <img
                src={app.logo ?? app.icon ?? app.coverImage}
                alt={app.name}
                className="size-full object-cover"
              />
            ) : (
              <Boxes className="size-8 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {app.name}
              </h1>
              {app.isFeatured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Star className="size-3" /> مميز
                </span>
              )}
              {app.isActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="size-3" /> نشط
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">
                  <XCircle className="size-3" /> معطل
                </span>
              )}
              {app.isPublic && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                  <Globe className="size-3" /> عام
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
              {app.description}
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">السعر الشهري</span>
              <DollarSign className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {app.monthlyPrice != null ? `${app.monthlyPrice} ج.م` : "مجاني"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {app.yearlyPrice != null ? `${app.yearlyPrice} ج.م سنوي` : "لا يوجد سنوي"}
            </p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مرات التثبيت</span>
              <Boxes className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {app.installCount ?? 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">شركة مستخدمة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">التقييم العام</span>
              <Star className="size-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-500 tabular-nums">
              {app.rating ?? "5.0"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">({app.reviewCount ?? 0} تقييم)</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">فترة التجربة</span>
              <ShieldCheck className="size-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {app.trialDays ?? 0} يوم
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">تفعيل مجاني</p>
          </div>
        </div>
      </div>

      {/* Grid: Details, Features & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Core Controls */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs font-mono text-xs">
          <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] border-b border-border/60 pb-2">
            مفاتيح التحكم المباشر
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
              <div>
                <span className="font-semibold text-foreground block">تفعيل التطبيق</span>
                <span className="text-[10px] text-muted-foreground">إتاحة التطبيق للنظام</span>
              </div>
              <Switch
                checked={Boolean(app.isActive)}
                onCheckedChange={(v) => handleQuickToggle("isActive", v === true)}
              />
            </label>

            <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
              <div>
                <span className="font-semibold text-foreground block">ظهور في الماركت بليس</span>
                <span className="text-[10px] text-muted-foreground">عرضه للشركات للتثبيت</span>
              </div>
              <Switch
                checked={Boolean(app.isPublic)}
                onCheckedChange={(v) => handleQuickToggle("isPublic", v === true)}
              />
            </label>

            <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
              <div>
                <span className="font-semibold text-foreground block">تطبيق مميز (Featured)</span>
                <span className="text-[10px] text-muted-foreground">إبرازه في أعلى المتجر</span>
              </div>
              <Switch
                checked={Boolean(app.isFeatured)}
                onCheckedChange={(v) => handleQuickToggle("isFeatured", v === true)}
              />
            </label>
          </div>
        </div>

        {/* Features List */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
          <h3 className="font-mono font-semibold text-foreground uppercase tracking-wider text-[11px] border-b border-border/60 pb-2">
            المميزات والخصائص التشغيلية
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {featuresList.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50 text-xs text-foreground"
              >
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">المسار الرئيسي:</span>
              <code className="text-primary text-[11px]">{app.mainRoute || "—"}</code>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">مسار الإدارة:</span>
              <code className="text-primary text-[11px]">{app.adminRoute || "—"}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAppDetail;
