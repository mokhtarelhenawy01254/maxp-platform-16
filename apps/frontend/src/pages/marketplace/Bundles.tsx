import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { Package, Check, Star, TrendingUp, Zap, Gift, MessageSquare, Bot, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  discount: number;
  isActive: boolean;
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    monthlyPrice: number;
  }>;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-pulse">
      <div className="h-16 bg-gray-300 dark:bg-gray-700" />
      <div className="p-6 space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          ))}
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    </div>
  );
}

const bundleThemes: Record<string, { gradient: string; badge: string; icon: typeof MessageSquare; priceClass: string }> = {
  "ai-inbox-bundle": {
    gradient: "from-emerald-600 to-teal-600",
    badge: "bg-emerald-400 text-emerald-900",
    icon: Bot,
    priceClass: "text-emerald-600",
  },
  "messaging-bundle": {
    gradient: "from-violet-600 to-indigo-600",
    badge: "bg-violet-400 text-violet-900",
    icon: MessageSquare,
    priceClass: "text-violet-600",
  },
};

export default function Bundles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/marketplace/bundles");

      if (response.data.success) {
        setBundles(response.data.data.filter((b: Bundle) => b.isActive));
      }
    } catch (error: any) {
      console.error("Error fetching bundles:", error);
      if (error.response?.status === 401) {
        navigate("/auth/login");
      } else {
        setError(error.response?.data?.message || t("billing.bundles.fetchError"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBundles(); }, []);

  const calculateOriginalPrice = (bundle: Bundle) =>
    (bundle.apps || []).reduce((sum, app) => sum + parseFloat(app.monthlyPrice.toString()), 0);

  const calculateSavings = (bundle: Bundle) => {
    const original = calculateOriginalPrice(bundle);
    return original - parseFloat(bundle.monthlyPrice?.toString() || "0");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Gift size={48} className="text-amber-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{t("billing.bundles.title")}</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {t("billing.bundles.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <div className="bg-red-100 dark:bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={40} className="text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("billing.bundles.errorTitle")}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchBundles}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw size={18} />
              {t("billing.bundles.retry")}
            </button>
          </div>
        )}

        {!loading && !error && bundles.length === 0 && (
          <div className="text-center py-16">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("billing.bundles.emptyTitle")}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t("billing.bundles.emptySubtitle")}</p>
          </div>
        )}

        {!loading && !error && bundles.length > 0 && (
          <>
            {bundles.length >= 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{t("billing.bundles.avgSavings")}</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {Math.round(bundles.reduce((s, b) => s + parseFloat(b.discount.toString()), 0) / bundles.length)}%
                      </p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                      <TrendingUp className="text-green-600" size={28} />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{t("billing.bundles.bestDeal")}</p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {Math.max(...bundles.map((b) => parseFloat(b.discount.toString())))}%
                      </p>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                      <Star className="text-amber-600" size={28} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {bundles.map((bundle) => {
                const theme = bundleThemes[bundle.slug] || bundleThemes["messaging-bundle"];
                const BundleIcon = theme.icon;
                const originalPrice = calculateOriginalPrice(bundle);
                const savings = calculateSavings(bundle);
                const bundlePrice = parseFloat(bundle.monthlyPrice?.toString() || "0");

                return (
                  <div
                    key={bundle.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className={`bg-gradient-to-r ${theme.gradient} text-white px-6 py-5`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-lg">
                            <BundleIcon size={24} />
                          </div>
                          <span className="font-bold text-lg">{t("billing.bundles.bundleLabel")}</span>
                        </div>
                        {parseFloat(bundle.discount.toString()) > 0 && (
                          <div className={`${theme.badge} px-3 py-1 rounded-full text-sm font-bold`}>
                            {t("billing.bundles.savePercent", { percent: bundle.discount })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t("billing.bundles.name." + bundle.slug, { defaultValue: bundle.name })}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                        {t("billing.bundles.desc." + bundle.slug, { defaultValue: bundle.description })}
                      </p>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className={`text-4xl font-bold ${theme.priceClass}`}>{bundlePrice.toFixed(0)}</span>
                          <span className="text-gray-600 dark:text-gray-400">{t("billing.bundles.currencyPerMonth")}</span>
                        </div>
                        {savings > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 line-through">{originalPrice.toFixed(0)} {t("billing.bundles.currencySymbol")}</span>
                            <span className="text-green-600 font-semibold">{t("billing.bundles.saveAmount", { amount: savings.toFixed(0), pct: originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0 })}</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Zap size={18} className="text-amber-500" />
                          {t("billing.bundles.includedTools")}
                        </h4>
                        <div className="space-y-2">
                          {bundle.apps.map((app) => (
                            <div key={app.id} className="flex items-center gap-2 text-sm">
                              <Check size={16} className="text-green-600 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{t("billing.bundles.app." + app.slug, { defaultValue: app.name })}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate(`/marketplace/bundle/${bundle.slug}`)}
                          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 text-sm"
                        >
                          {t("billing.bundles.viewDetails")}
                        </button>
                        <button
                          onClick={() => navigate("/checkout/messaging")}
                          className={`flex-1 bg-gradient-to-r ${theme.gradient} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2`}
                        >
                          <Sparkles size={18} />
                          {t("billing.bundles.startSubscription")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-2xl p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t("billing.bundles.whyBundles")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp size={28} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t("billing.bundles.guaranteedSavings")}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t("billing.bundles.guaranteedSavingsDesc")}</p>
                </div>
                <div className="text-center">
                  <div className="bg-violet-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap size={28} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t("billing.bundles.instantActivation")}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t("billing.bundles.instantActivationDesc")}</p>
                </div>
                <div className="text-center">
                  <div className="bg-amber-600 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star size={28} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t("billing.bundles.fullIntegration")}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t("billing.bundles.fullIntegrationDesc")}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
