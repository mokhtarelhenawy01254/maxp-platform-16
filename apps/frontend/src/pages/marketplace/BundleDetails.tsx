import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { handleInsufficientWalletBalance } from "../../utils/marketplaceWalletHelper";
import {
  Package,
  TrendingUp,
  Gift,
  ArrowRight,
  MessageSquare,
  Bot,
  Mail,
  Users,
  Sparkles,
  CreditCard,
  RotateCw,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount: number;
  isActive: boolean;
  isInstalled?: boolean;
  monthlyPrice: number;
  yearlyPrice?: number;
  trialDays?: number;
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    monthlyPrice: number;
    logo?: string;
  }>;
}

const features = [
  { icon: MessageSquare, title: "ردود آلية ذكية", desc: "أتمتة المحادثات مع العملاء باستخدام نماذج الذكاء الاصطناعي" },
  { icon: Mail, title: "صندوق محادثات موحد", desc: "ربط ومزامنة الرسائل عبر مختلف المنصات وقنوات البيع" },
  { icon: Bot, title: "وكيل ذكي مخصص", desc: "إنشاء الطلبيات وتأكيد الشحنات والمواعيد آلياً بدون تدخل بشري" },
  { icon: Users, title: "إدارة علاقات العملاء", desc: "سجل كامل وتاريخ شرائي وتتبعي لكل عميل ومتجر" },
];

export default function BundleDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (slug) {
      void fetchBundleDetails();
    }
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("recharged") === "true") {
      toast.info("تم شحن المحفظة بنجاح! يمكنك الآن تفعيل الباقة مباشرة.", {
        duration: 5000,
      });
    }
  }, [location.search]);

  const fetchBundleDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/marketplace/bundles/${slug}`);

      if (response.data.success) {
        setBundle(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching bundle:", error);
      tToast.error("BundleDetails.msg_3844");
      navigate("/marketplace/bundles");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (slug?.includes("ai-inbox") || slug?.includes("messaging")) {
      navigate("/checkout/messaging");
      return;
    }
    try {
      setActivating(true);
      const response = await apiClient.post(
        `/marketplace/bundles/${slug}/subscribe`,
        {},
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setTimeout(() => {
          window.location.href = "/marketplace";
        }, 1500);
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      if (
        handleInsufficientWalletBalance(error, navigate, {
          returnUrl: location.pathname + location.search,
          appName: bundle?.name,
          itemType: "bundle",
        })
      ) {
        return;
      }

      if (error.response?.status === 401) {
        navigate("/auth/login", {
          state: { from: `/marketplace/bundle/${slug}` },
        });
        return;
      }

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        tToast.error("BundleDetails.error_error_02ae");
      }
    } finally {
      setActivating(false);
    }
  };

  const calculateOriginalPrice = (b: Bundle) => {
    return b.apps.reduce(
      (sum, app) => sum + parseFloat(app.monthlyPrice.toString()),
      0,
    );
  };

  const calculateSavingsPercentage = (b: Bundle) => {
    const original = calculateOriginalPrice(b);
    const bundlePrice =
      parseFloat(b.monthlyPrice.toString()) || parseFloat(b.price.toString());
    return Math.round((1 - bundlePrice / original) * 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-mono">جاري تحميل تفاصيل الباقة...</p>
        </div>
      </div>
    );
  }

  if (!bundle) return null;

  const originalPrice = calculateOriginalPrice(bundle);
  const bundlePrice = parseFloat(
    bundle.monthlyPrice?.toString() || bundle.price?.toString() || "0",
  );
  const savings = originalPrice - bundlePrice;
  const savingsPct = calculateSavingsPercentage(bundle);
  const hasSavings = savings > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Banner Chassis */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-right">
            <button
              onClick={() => navigate("/marketplace/bundles")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>العودة لمتجر الباقات والتطبيقات</span>
            </button>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hasSavings && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                  <Gift className="h-3.5 w-3.5" />
                  <span>توفير استثنائي للباقة</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {bundle.name}
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {bundle.description}
            </p>
          </div>

          <div className="flex flex-col items-start rounded-lg border border-border/60 bg-muted/30 p-5 text-right sm:items-end">
            <span className="text-xs text-muted-foreground">التكلفة الشهرية للباقة</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              {hasSavings && (
                <span className="text-xs text-muted-foreground line-through">
                  {originalPrice.toFixed(0)} ج.م
                </span>
              )}
              <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {bundlePrice.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">ج.م / شهرياً</span>
            </div>
            {hasSavings && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-500">
                <TrendingUp className="h-3 w-3" />
                <span>وفرت {savings.toFixed(0)} ج.م ({savingsPct}%)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Included Apps & Features */}
        <div className="space-y-6 lg:col-span-8">
          {/* Included Apps */}
          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              التطبيقات والأدوات المضمنة في الباقة
            </h2>
            <div className="space-y-3">
              {bundle.apps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-start gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground">{app.name}</h3>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {app.monthlyPrice} ج.م / شهر
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {app.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              القدرات والميزات التشغيلية للباقة
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                    <feat.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-foreground">{feat.title}</h3>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Subscription Action Box */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:sticky lg:top-6">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-right">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                <span>فترة تجريبية مجانية لمدة {bundle.trialDays ?? 7} أيام</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                استمتع بكافة أدوات الباقة بدون قيود. يمكنك الإلغاء أو التجديد في أي وقت من لوحة التحكم.
              </p>
            </div>

            <div className="mt-5 space-y-2.5">
              {bundle.isInstalled ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>الباقة مفعلة حالياً في متجرك</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSubscribe}
                    disabled={activating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {activating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري التفعيل...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>تفعيل الفترة التجريبية الآن</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSubscribe}
                    disabled={activating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/70 bg-background py-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98] disabled:opacity-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>الاشتراك والدفع المباشر</span>
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>فترة تجريبية مجانية بدون التزام مسبق</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
