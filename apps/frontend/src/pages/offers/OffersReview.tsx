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
} from "@heroicons/react/24/outline"

interface Coupon {
  id: string
  name: string
  code: string
  description: string
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING"
  value: number
  minOrderAmount: number
  maxDiscountAmount: number
  usageLimit: number
  usageCount: number
  validFrom: string
  validTo: string
  isActive: boolean
}

interface PromotionSettings {
  freeShippingEnabled: boolean
  freeShippingThreshold: number
  freeShippingMessage: string
  flatShippingEnabled: boolean
  flatShippingFee: number
}

type StatusBadge = { label: string; color: string }

const getCouponStatus = (coupon: Coupon): StatusBadge => {
  const now = new Date()
  const validFrom = new Date(coupon.validFrom)
  const validTo = new Date(coupon.validTo)

  if (!coupon.isActive) return { label: "موقف", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" }
  if (now < validFrom) return { label: "قادم", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
  if (now > validTo) return { label: "منتهي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    return { label: "مستنفذ", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" }
  return { label: "نشط", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
}

const getTypeText = (type: string) => {
  switch (type) {
    case "PERCENTAGE": return "نسبة"
    case "FIXED_AMOUNT": return "ثابت"
    case "FREE_SHIPPING": return "شحن مجاني"
    default: return type
  }
}

const OffersReview: React.FC = () => {
  const { formatDate } = useDateFormat()
  const { formatPrice } = useCurrency()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [promotionSettings, setPromotionSettings] = useState<PromotionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [couponsRes, promoRes] = await Promise.all([
          apiClient.get("/coupons?isActive=true"),
          apiClient.get("/promotion-settings"),
        ])
        if (couponsRes.data?.success) setCoupons(couponsRes.data.data || [])
        if (promoRes.data?.success) setPromotionSettings(promoRes.data.data)
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل تحميل بيانات العروض")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    )
  }

  const activeCoupons = coupons.filter(
    (c) => getCouponStatus(c).label === "نشط",
  )
  const otherCoupons = coupons.filter(
    (c) => getCouponStatus(c).label !== "نشط",
  )

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              مراجعة العروض
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              جميع العروض الترويجية النشطة في المتجر — للمراجعة قبل تفعيلها
              للأجنت
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          icon={TicketIcon}
          label="الكوبونات النشطة"
          value={activeCoupons.length}
          color="green"
        />
        <SummaryCard
          icon={TruckIcon}
          label="الشحن المجاني"
          value={promotionSettings?.freeShippingEnabled ? "مفعل" : "متوقف"}
          color={promotionSettings?.freeShippingEnabled ? "green" : "gray"}
        />
        <SummaryCard
          icon={GiftIcon}
          label="إجمالي العروض"
          value={coupons.length + (promotionSettings?.freeShippingEnabled ? 1 : 0)}
          color="indigo"
        />
      </div>

      {activeCoupons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            الكوبونات النشطة حالياً
            <span className="text-sm font-normal text-gray-500 mr-2">
              ({activeCoupons.length})
            </span>
          </h2>
          <CouponTable coupons={activeCoupons} formatDate={formatDate} getCouponStatus={getCouponStatus} getTypeText={getTypeText} formatPrice={formatPrice} />
        </section>
      )}

      {otherCoupons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <XCircleIcon className="h-6 w-6 text-gray-400" />
            كوبونات غير نشطة
            <span className="text-sm font-normal text-gray-500 mr-2">
              ({otherCoupons.length})
            </span>
          </h2>
          <CouponTable coupons={otherCoupons} formatDate={formatDate} getCouponStatus={getCouponStatus} getTypeText={getTypeText} formatPrice={formatPrice} />
        </section>
      )}

      {coupons.length === 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <TicketIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            لا توجد كوبونات
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            لم يتم إنشاء أي كوبونات خصم بعد
          </p>
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <GiftIcon className="h-6 w-6 text-purple-500" />
          إعدادات العروض الترويجية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PromotionCard
            title="الشحن المجاني"
            enabled={promotionSettings?.freeShippingEnabled ?? false}
            details={
              promotionSettings?.freeShippingEnabled
                ? `للطلبات من ${formatPrice(promotionSettings.freeShippingThreshold)} فأكثر`
                : "غير مفعل"
            }
          />
          <PromotionCard
            title="سعر شحن موحد"
            enabled={promotionSettings?.flatShippingEnabled ?? false}
            details={
              promotionSettings?.flatShippingEnabled
                ? `${promotionSettings.flatShippingFee} ج.م للطلب`
                : "غير مفعل"
            }
          />
        </div>
      </section>
    </div>
  )
}

const SummaryCard: React.FC<{
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string | number
  color: "green" | "gray" | "indigo"
}> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
    gray: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400",
  }
  return (
    <div className={`flex items-center gap-4 p-5 rounded-xl border ${colors[color]}`}>
      <Icon className="h-8 w-8 shrink-0" />
      <div>
        <div className="text-sm font-medium opacity-80">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}

const CouponTable: React.FC<{
  coupons: Coupon[]
  formatDate: (d: string) => string
  getCouponStatus: (c: Coupon) => StatusBadge
  getTypeText: (t: string) => string
  formatPrice: (n: number) => string
}> = ({ coupons, formatDate, getCouponStatus, getTypeText, formatPrice }) => (
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
                  <span className="text-sm font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {coupon.code}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{coupon.name}</div>
                  {coupon.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{coupon.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{getTypeText(coupon.type)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                  {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : coupon.type === "FIXED_AMOUNT" ? formatPrice(coupon.value) : "—"}
                  {coupon.maxDiscountAmount > 0 && coupon.type === "PERCENTAGE" && (
                    <span className="text-xs text-gray-500 mr-1">(حد {formatPrice(coupon.maxDiscountAmount)})</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                    </span>
                    {coupon.usageLimit > 0 && (
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                  <div>{formatDate(coupon.validFrom)}</div>
                  <div>→ {formatDate(coupon.validTo)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)

const PromotionCard: React.FC<{
  title: string
  enabled: boolean
  details: string
}> = ({ title, enabled, details }) => (
  <div className={`p-5 rounded-xl border ${
    enabled
      ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        enabled
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}>
        {enabled ? "مفعل" : "متوقف"}
      </span>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400">{details}</p>
  </div>
)

export default OffersReview
