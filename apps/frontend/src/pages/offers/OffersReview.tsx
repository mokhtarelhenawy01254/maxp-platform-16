import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useCurrency } from '../../hooks/useCurrency';
import { apiClient } from '../../services/apiClient';
import {
  Ticket,
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Sparkles,
  Banknote,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { CouponTableCard, type Coupon, type StatusBadge } from './CouponTableCard';
import i18n from '../../i18n';

interface PromotionSettings {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
  flatShippingEnabled: boolean;
  flatShippingFee: number;
}

interface StorePromotion {
  isActive: boolean;
  title: string;
  tiers: string;
  disableOtherDiscounts: boolean;
  startDate: string | null;
  endDate: string | null;
}

interface Tier {
  type: string;
  minQty: number;
  maxQty: number;
  discountPercent: number;
  freeQty: number;
  label: string;
}

const OffersReview: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promoSettings, setPromoSettings] = useState<PromotionSettings | null>(null);
  const [storePromo, setStorePromo] = useState<StorePromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCouponStatus = (c: Coupon): StatusBadge => {
    const now = new Date();
    if (!c.isActive) return { label: t('offersReview.disabled'), color: 'bg-muted/40 text-muted-foreground border-border/60' };
    if (now < new Date(c.validFrom)) return { label: t('offersReview.comingSoon'), color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
    if (now > new Date(c.validTo)) return { label: t('offersReview.expired'), color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
    if (c.usageLimit && c.usageCount >= c.usageLimit) return { label: t('offersReview.depleted'), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    return { label: t('offersReview.active'), color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  };

  const getTypeText = (type: string) =>
    type === 'PERCENTAGE'
      ? t('offersReview.typePercentage')
      : type === 'FIXED_AMOUNT'
      ? t('offersReview.typeFixed')
      : type === 'FREE_SHIPPING'
      ? t('offersReview.typeFreeShipping')
      : type;

  const tierTypeLabels: Record<string, string> = {
    cheapest_percentage: t('offersReview.tierCheapestPercentage'),
    all_percentage: t('offersReview.tierAllPercentage'),
    cheapest_free: t('offersReview.tierCheapestFree'),
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponsRes, promoRes, storeRes] = await Promise.all([
        apiClient.get('/coupons?isActive=true'),
        apiClient.get('/promotion-settings'),
        apiClient.get('/store-promotions'),
      ]);
      if (couponsRes.data?.success) setCoupons(couponsRes.data.data || []);
      if (promoRes.data?.success) setPromoSettings(promoRes.data.data);
      if (storeRes.data?.success) setStorePromo(storeRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('offersReview.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [t]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <RotateCcw className="animate-spin size-8 text-primary mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">LOADING STORE OFFERS AUDIT...</p>
        </div>
      </div>
    );
  }

  const activeCoupons = coupons.filter((c) => getCouponStatus(c).label === t('offersReview.active'));
  const otherCoupons = coupons.filter((c) => getCouponStatus(c).label !== t('offersReview.active'));
  const parsedTiers: Tier[] = storePromo?.tiers ? tryParseTiers(storePromo.tiers) : [];
  const hasActiveStorePromo = storePromo?.isActive && parsedTiers.length > 0;
  const hasActiveFreeShipping = promoSettings?.freeShippingEnabled ?? false;
  const hasActiveFlatShipping = promoSettings?.flatShippingEnabled ?? false;
  const totalActiveOffers =
    activeCoupons.length + (hasActiveStorePromo ? 1 : 0) + (hasActiveFreeShipping ? 1 : 0) + (hasActiveFlatShipping ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('offersReview.pageTitle')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  ACTIVE INCENTIVES
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('offersReview.pageDescription')}
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="h-9 px-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
          >
            <RotateCcw size={13} />
            <span>تحديث العروض</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Telemetry Stats Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Ticket size={13} className="text-emerald-500" />
              <span>{t('offersReview.activeCoupons')}</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {activeCoupons.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">كوبونات خصم مفعلة بالمتجر</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>{t('offersReview.storePromotions')}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {hasActiveStorePromo ? (
                <span className="text-emerald-600 dark:text-emerald-400">{t('offersReview.active')}</span>
              ) : (
                <span className="text-muted-foreground text-sm font-normal">{t('offersReview.disabled')}</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">عروض الكميات والسلات</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={13} className="text-sky-500" />
              <span>{t('offersReview.freeShippingLabel')}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {hasActiveFreeShipping ? (
                <span className="text-emerald-600 dark:text-emerald-400">{t('offersReview.active')}</span>
              ) : (
                <span className="text-muted-foreground text-sm font-normal">{t('offersReview.disabled')}</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">الشحن المجاني فوق الحد الأدنى</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Banknote size={13} className="text-primary" />
              <span>{t('offersReview.totalOffers')}</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
              {totalActiveOffers}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">إجمالي المحفزات الترويجية الحية</div>
          </div>
        </div>

        {/* Active Coupons Section */}
        {activeCoupons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h2 className="text-sm font-bold text-foreground">
                {t('offersReview.activeCoupons')} ({activeCoupons.length})
              </h2>
            </div>
            <CouponTableCard
              coupons={activeCoupons}
              formatDate={formatDate}
              getCouponStatus={getCouponStatus}
              getTypeText={getTypeText}
              formatPrice={formatPrice}
              t={t}
            />
          </div>
        )}

        {/* Inactive Coupons Section */}
        {otherCoupons.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-bold text-muted-foreground">
                {t('offersReview.inactive')} ({otherCoupons.length})
              </h2>
            </div>
            <CouponTableCard
              coupons={otherCoupons}
              formatDate={formatDate}
              getCouponStatus={getCouponStatus}
              getTypeText={getTypeText}
              formatPrice={formatPrice}
              t={t}
            />
          </div>
        )}

        {/* Store Promotion Tiers */}
        {storePromo && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold text-foreground">{t('offersReview.storePromoTitle')}</h2>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                hasActiveStorePromo
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground border-border/60'
              }`}>
                {hasActiveStorePromo ? t('offersReview.active') : t('offersReview.disabled')}
              </span>
            </div>

            {hasActiveStorePromo ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  {storePromo.title || t('offersReview.storePromoDefaultName')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedTiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-muted/15 rounded-lg border border-border/50">
                      <ShoppingBag size={18} className="text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {tierTypeLabels[tier.type] || tier.type}
                          {tier.discountPercent > 0 && ` (${tier.discountPercent}%)`}
                          {tier.freeQty > 0 && ` + ${tier.freeQty} ${t('offersReview.tierFree')}`}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {t('offersReview.tierFrom', { minQty: tier.minQty })} {t('offersReview.tierTo', { maxQty: tier.maxQty || '∞' })} {t('offersReview.tierPieces')}
                          {tier.label && ` — ${tier.label}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">
                {t('offersReview.noStorePromo')}
              </p>
            )}
          </div>
        )}

        {/* Shipping Incentives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">{t('offersReview.freeShippingCardTitle')}</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                hasActiveFreeShipping
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground border-border/60'
              }`}>
                {hasActiveFreeShipping ? t('offersReview.active') : t('offersReview.disabled')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {hasActiveFreeShipping
                ? t('offersReview.freeShippingCardDetail', { amount: formatPrice(promoSettings!.freeShippingThreshold) })
                : t('offersReview.freeShippingInactive')}
            </p>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">{t('offersReview.flatShippingCardTitle')}</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                hasActiveFlatShipping
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground border-border/60'
              }`}>
                {hasActiveFlatShipping ? t('offersReview.active') : t('offersReview.disabled')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {hasActiveFlatShipping
                ? t('offersReview.flatShippingCardDetail', { amount: promoSettings!.flatShippingFee })
                : t('offersReview.flatShippingInactive')}
            </p>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t('offersReview.volumeDiscountsDesc')}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/settings/store-promotion"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
            >
              عروض المتجر الشاملة
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/70 hover:bg-muted/30 transition-colors"
            >
              عروض المنتجات
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

function tryParseTiers(raw: string): Tier[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default OffersReview;
