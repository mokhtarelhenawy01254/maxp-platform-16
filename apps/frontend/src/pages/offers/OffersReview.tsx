import React, { useEffect, useState } from "react"
import { useDateFormat } from "../../hooks/useDateFormat"
import { useCurrency } from "../../hooks/useCurrency"
import { apiClient } from "../../services/apiClient"
import {
  GiftIcon,
  TicketIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  BanknotesIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline"

interface Coupon {
  id: string; name: string; code: string; description: string
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING"
  value: number; minOrderAmount: number; maxDiscountAmount: number
  usageLimit: number; usageCount: number
  validFrom: string; validTo: string; isActive: boolean
}

interface PromotionSettings {
  freeShippingEnabled: boolean; freeShippingThreshold: number
  freeShippingMessage: string; flatShippingEnabled: boolean; flatShippingFee: number
}

interface StorePromotion {
  isActive: boolean; title: string; tiers: string
  disableOtherDiscounts: boolean; startDate: string | null; endDate: string | null
}

interface Tier {
  type: string; minQty: number; maxQty: number; discountPercent: number
  freeQty: number; label: string
}

type StatusBadge = { label: string; color: string }

const getCouponStatus = (c: Coupon): StatusBadge => {
  const now = new Date()
  if (!c.isActive) return { label: "موقف", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" }
  if (now < new Date(c.validFrom)) return { label: "قادم", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
  if (now > new Date(c.validTo)) return { label: "منتهي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
  if (c.usageLimit && c.usageCount >= c.usageLimit) return { label: "مستنفذ", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" }
  return { label: "نشط", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
}

const getTypeText = (t: string) => t === "PERCENTAGE" ? "نسبة" : t === "FIXED_AMOUNT" ? "ثابت" : t === "FREE_SHIPPING" ? "شحن مجاني" : t

const tierTypeLabels: Record<string, string> = {
  cheapest_percentage: "اشتر X وخد الأرخص بنسبة",
  all_percentage: "خصم على الكل بنسبة",
  cheapest_free: "اشتر X وخد الأرخص مجاناً",
}

const OffersReview: React.FC = () => {
  const { formatDate } = useDateFormat()
  const { formatPrice } = useCurrency()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [promoSettings, setPromoSettings] = useState<PromotionSettings | null>(null)
  const [storePromo, setStorePromo] = useState<StorePromotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [couponsRes, promoRes, storeRes] = await Promise.all([
          apiClient.get("/coupons?isActive=true"),
          apiClient.get("/promotion-settings"),
          apiClient.get("/store-promotions"),
        ])
        if (couponsRes.data?.success) setCoupons(couponsRes.data.data || [])
        if (promoRes.data?.success) setPromoSettings(promoRes.data.data)
        if (storeRes.data?.success) setStorePromo(storeRes.data.data)
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل تحميل بيانات العروض")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
    </div>
  )

  const activeCoupons = coupons.filter((c) => getCouponStatus(c).label === "نشط")
  const otherCoupons = coupons.filter((c) => getCouponStatus(c).label !== "نشط")
  const parsedTiers: Tier[] = storePromo?.tiers ? tryParseTiers(storePromo.tiers) : []
  const hasActiveStorePromo = storePromo?.isActive && parsedTiers.length > 0
  const hasActiveFreeShipping = promoSettings?.freeShippingEnabled ?? false
  const hasActiveFlatShipping = promoSettings?.flatShippingEnabled ?? false
  const totalActiveOffers = activeCoupons.length + (hasActiveStorePromo ? 1 : 0) + (hasActiveFreeShipping ? 1 : 0) + (hasActiveFlatShipping ? 1 : 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مراجعة العروض</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">كل العروض الترويجية في المتجر — للمراجعة قبل تفعيلها للأجنت</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={TicketIcon} label="كوبونات نشطة" value={activeCoupons.length} color="green" />
        <SummaryCard icon={SparklesIcon} label="عروض المتجر" value={hasActiveStorePromo ? "مفعل" : "متوقف"} color={hasActiveStorePromo ? "green" : "gray"} />
        <SummaryCard icon={TruckIcon} label="شحن مجاني" value={hasActiveFreeShipping ? "مفعل" : "متوقف"} color={hasActiveFreeShipping ? "green" : "gray"} />
        <SummaryCard icon={BanknotesIcon} label="إجمالي العروض" value={totalActiveOffers} color="indigo" />
      </div>

      {activeCoupons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            الكوبونات النشطة ({activeCoupons.length})
          </h2>
          <CouponTable coupons={activeCoupons} formatDate={formatDate} getCouponStatus={getCouponStatus} getTypeText={getTypeText} formatPrice={formatPrice} />
        </section>
      )}

      {otherCoupons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <XCircleIcon className="h-6 w-6 text-gray-400" />
            كوبونات غير نشطة ({otherCoupons.length})
          </h2>
          <CouponTable coupons={otherCoupons} formatDate={formatDate} getCouponStatus={getCouponStatus} getTypeText={getTypeText} formatPrice={formatPrice} />
        </section>
      )}

      {coupons.length === 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <TicketIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">لا توجد كوبونات</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم إنشاء كوبونات خصم بعد</p>
        </div>
      )}

      {storePromo && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-amber-500" />
            عروض المتجر الشاملة
            <span className={`mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hasActiveStorePromo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {hasActiveStorePromo ? "فعال" : "متوقف"}
            </span>
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {hasActiveStorePromo ? (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{storePromo.title || "عرض المتجر"}</p>
                <div className="space-y-2">
                  {parsedTiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                      <ShoppingBagIcon className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {tierTypeLabels[tier.type] || tier.type}
                          {tier.discountPercent > 0 && ` ${tier.discountPercent}%`}
                          {tier.freeQty > 0 && ` + ${tier.freeQty} مجاناً`}
                        </p>
                        <p className="text-xs text-gray-500">من {tier.minQty} إلى {tier.maxQty || '∞'} قطعة{tier.label && ` — ${tier.label}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {storePromo.disableOtherDiscounts && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-lg">ملاحظة: هذا العرض يلغي الخصومات الأخرى</p>
                )}
                {(storePromo.startDate || storePromo.endDate) && (
                  <p className="text-xs text-gray-500">
                    {storePromo.startDate && `من ${formatDate(storePromo.startDate)}`}
                    {storePromo.endDate && ` إلى ${formatDate(storePromo.endDate)}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد عروض متجر شاملة مفعلة حالياً</p>
            )}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TruckIcon className="h-6 w-6 text-purple-500" />
          إعدادات الشحن
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PromoCard title="الشحن المجاني" enabled={hasActiveFreeShipping}
            details={hasActiveFreeShipping ? `للطلبات من ${formatPrice(promoSettings!.freeShippingThreshold)} فأكثر` : "غير مفعل"} />
          <PromoCard title="سعر شحن موحد" enabled={hasActiveFlatShipping}
            details={hasActiveFlatShipping ? `${promoSettings!.flatShippingFee} ج.م للطلب` : "غير مفعل"} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BanknotesIcon className="h-6 w-6 text-sky-500" />
          خصومات الكميات
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            خصومات الكميات مضبوطة لكل منتج على حدة — مش متاح عرض تجميعي شامل. تقدر تراجع الخصومات من صفحة تعديل كل منتج.
          </p>
        </div>
      </section>
    </div>
  )
}

function tryParseTiers(raw: string): Tier[] {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const SummaryCard: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string | number; color: "green" | "gray" | "indigo" }> = ({ icon: Icon, label, value, color }) => {
  const colors = { green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400", gray: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400", indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400" }
  return (<div className={`flex items-center gap-4 p-5 rounded-xl border ${colors[color]}`}><Icon className="h-8 w-8 shrink-0" /><div><div className="text-sm font-medium opacity-80">{label}</div><div className="text-2xl font-bold">{value}</div></div></div>)
}

const CouponTable: React.FC<{ coupons: Coupon[]; formatDate: (d: string) => string; getCouponStatus: (c: Coupon) => StatusBadge; getTypeText: (t: string) => string; formatPrice: (n: number) => string }> = ({ coupons, formatDate, getCouponStatus, getTypeText, formatPrice }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الكود</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الاسم</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">النوع</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">القيمة</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الاستخدام</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الفترة</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon)
            return (
              <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{coupon.code}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{coupon.name}</div>
                  {coupon.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{coupon.description}</div>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap"><span className="text-sm text-gray-700 dark:text-gray-300">{getTypeText(coupon.type)}</span></td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                  {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : coupon.type === "FIXED_AMOUNT" ? formatPrice(coupon.value) : "—"}
                  {coupon.maxDiscountAmount > 0 && coupon.type === "PERCENTAGE" && <span className="text-xs text-gray-500 mr-1">(حد {formatPrice(coupon.maxDiscountAmount)})</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-white">{coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</span>
                    {coupon.usageLimit > 0 && <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }} /></div>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                  <div>{formatDate(coupon.validFrom)}</div>
                  <div>→ {formatDate(coupon.validTo)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)

const PromoCard: React.FC<{ title: string; enabled: boolean; details: string }> = ({ title, enabled, details }) => (
  <div className={`p-5 rounded-xl border ${enabled ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{enabled ? "مفعل" : "متوقف"}</span>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400">{details}</p>
  </div>
)

export default OffersReview
