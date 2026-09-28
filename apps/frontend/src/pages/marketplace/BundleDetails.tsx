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
  { icon: MessageSquare, title: "ردود تلقائية", desc: "الرد على العملاء تلقائياً عبر الذكاء الاصطناعي" },
  { icon: Mail, title: "صندوق وارد موحد", desc: "جميع المحادثات من كل المنصات في مكان واحد" },
  { icon: Bot, title: "AI Agent", desc: "ذكاء اصطناعي ينشئ الطلبات والحجوزات تلقائياً" },
  { icon: Users, title: "إدارة العملاء", desc: "سجل متكامل لجميع تفاعلات العملاء ومحادثاتهم" },
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
      fetchBundleDetails();
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
    if (slug.includes("ai-inbox") || slug.includes("messaging")) {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white"></div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 pt-24 pb-16">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 text-center md:text-right">
              {hasSavings && (
                <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Gift className="w-4 h-4" />
                  <span>عرض حصري لفترة محدودة</span>
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                {bundle.name}
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl leading-relaxed">
                {bundle.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                <div className="flex items-baseline gap-3">
                  {hasSavings && (
                    <span className="text-gray-300 dark:text-gray-600 line-through text-xl">
                      {originalPrice.toFixed(0)} ج.م
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {bundlePrice.toFixed(0)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">/ شهرياً</span>
                </div>
                {hasSavings && (
                  <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg text-sm font-medium">
                    <TrendingUp size={16} />
                    وفرت {savings.toFixed(0)} ج.م ({savingsPct}%)
                  </span>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-8 rounded-3xl border border-purple-100 dark:border-purple-800/30">
                <Package size={100} className="text-purple-400 dark:text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                ماذا تتضمن الباقة؟
              </h2>
              <div className="space-y-3">
                {bundle.apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-xl shrink-0">
                      <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {app.name}
                        </h3>
                        <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                          {app.monthlyPrice} ج.م
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {app.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                الميزات الأساسية
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-2.5 rounded-xl shrink-0">
                      <feat.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  سعر الباقة
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {bundlePrice.toFixed(0)}
                  </span>
                  <span className="text-gray-400">ج.م</span>
                  <span className="text-sm text-gray-400">/ شهرياً</span>
                </div>
                {hasSavings && (
                  <span className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                    وفرت {savings.toFixed(0)} ج.م ({savingsPct}%)
                  </span>
                )}
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                      جرّب مجاناً لمدة {bundle.trialDays ?? 7} أيام
                    </p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                      الباقة كاملة بدون دفع. بعد انتهاء الفترة، اشترك لاستمرار الخدمة بــ ٩٩٩ ج.م/شهر.
                    </p>
                  </div>
                </div>
              </div>

              {bundle.isInstalled ? (
                <div className="w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                  <Package size={18} />
                  الباقة مفعلة — استمتع بالخدمة
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSubscribe}
                    disabled={activating}
                    className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {activating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-gray-900 border-t-transparent"></div>
                        جاري التفعيل...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        ابدأ الفترة التجريبية
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSubscribe}
                    disabled={activating}
                    className="w-full mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <CreditCard size={16} />
                    اشترك وادفع الآن — ٩٩٩ ج.م/شهر
                  </button>
                </>
              )}

              <button className="w-full mt-2 bg-transparent border-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 font-medium py-2 rounded-xl transition-all duration-200 text-xs">
                طلب عرض توضيحي
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                الفترة التجريبية بدون دفع. يمكنك الإلغاء في أي وقت.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
