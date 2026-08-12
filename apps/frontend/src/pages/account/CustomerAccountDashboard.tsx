import {
  AlertCircle,
  Award,
  BadgePercent,
  Clock3,
  Gift,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  Wallet as WalletIcon,
} from "lucide-react";

import type { CustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = "EGP") =>
  `${value.toFixed(2)} ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const fullName = (data: { customer: { firstName: string; lastName: string } }) =>
  `${data.customer.firstName} ${data.customer.lastName}`.trim() || "عميلنا العزيز";

export const CustomerLoadingState = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center text-gray-500">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      <p className="mt-4">جاري تحميل البيانات...</p>
    </div>
  </div>
);

export const CustomerErrorState = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
    <AlertCircle size={18} />
    <span>{message}</span>
  </div>
);

const TierCard = ({ data }: { data: CustomerLoyaltySummary }) => {
  const { tier, nextTier, currentMetric, metricLabel, rewards } = data.loyalty;
  const tierColor = tier?.color || "#6366f1";

  const benefits = (tier?.benefits || {}) as Record<string, unknown>;
  const benefitRows: Array<{ label: string; active: boolean }> = [];
  if (benefits.freeShipping === true || benefits.freeShipping === "true") {
    benefitRows.push({ label: "شحن مجاني", active: true });
  }
  const discountPercent = toNumber(benefits.discountPercent);
  if (discountPercent > 0) {
    benefitRows.push({ label: `خصم ${discountPercent}%`, active: true });
  }
  if (rewards?.freeShipping) {
    benefitRows.push({ label: "شحن مجاني", active: true });
  }
  if (toNumber(rewards?.discountPercent) > 0) {
    benefitRows.push({
      label: `خصم ${toNumber(rewards.discountPercent)}%`,
      active: true,
    });
  }

  const progressToNext =
    nextTier && nextTier.targetMetric > 0
      ? Math.min(100, Math.round((currentMetric / nextTier.targetMetric) * 100))
      : 100;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: tierColor }}
          >
            <Award size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              المستوى الحالي
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {tier?.nameAr || tier?.name || "بدون مستوى"}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            رصيد المستوى
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {currentMetric.toLocaleString("ar-EG")} {metricLabel}
          </div>
        </div>
      </div>

      {nextTier ? (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              فاضل {nextTier.remainingMetric.toLocaleString("ar-EG")}{" "}
              {metricLabel} للوصول إلى {nextTier.nameAr || nextTier.name}
            </span>
            <span>{progressToNext}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressToNext}%`,
                backgroundColor: tierColor,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          أنت في أعلى المستويات المتاحة 🎉
        </div>
      )}

      {benefitRows.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {benefitRows.map((row, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              <Truck size={13} />
              {row.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const AutoDiscountCard = ({ data }: { data: CustomerLoyaltySummary }) => {
  const autoDiscount = data.autoDiscount;
  const voucher = autoDiscount?.activeVoucher || null;
  const discountPercent = voucher
    ? toNumber(voucher.percent)
    : toNumber(autoDiscount?.discountPercent || 0);

  // الكارت ميظهرش غير لما العميل يكون عنده خصم فعلي (كوبون/فاتورة جاهزة).
  // لو مفيش خصم → مخفي تماماً بدل ما يكتب "غير مفعّل".
  if (!voucher) return null;

  return (
    <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 shadow-sm dark:border-violet-900 dark:from-violet-950/40 dark:to-fuchsia-950/40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <BadgePercent size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-violet-500">
              الخصم التلقائي
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {discountPercent > 0 ? `خصم ${discountPercent}%` : "غير مفعّل"}
            </div>
          </div>
        </div>
      </div>

      {voucher ? (
        <div className="mt-6 rounded-2xl border border-violet-200 bg-white/70 p-4 dark:border-violet-900 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Ticket size={16} className="text-violet-600" />
            عندك خصم {voucher.percent}% جاهز على طلبك القادم
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Clock3 size={14} />
            صالح حتى {formatDate(voucher.expiresAt)}
          </div>
          {voucher.sourceOrderNumber ? (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              من الطلب {voucher.sourceOrderNumber}
            </div>
          ) : null}
        </div>
      ) : autoDiscount?.status === "PRE_ACTIVATION" ? (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-white/60 px-4 py-4 text-sm text-gray-600 dark:border-violet-800 dark:bg-gray-900/40 dark:text-gray-300">
          هذا العميل طلب قبل تفعيل نظام الولاء، فالخصم التلقائي مش بيطبق عليه.
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-white/60 px-4 py-4 text-sm text-gray-600 dark:border-violet-800 dark:bg-gray-900/40 dark:text-gray-300">
          الخصم بيتفعّل تلقائيًا بعد تسليم طلبك. كل أوردر مؤهل بيديك كوبون
          خصم {autoDiscount?.validityDays || 3} أيام، ولو خلصت مدته بيتحول لكاش
          باك في محفظتك.
        </div>
      )}
    </div>
  );
};

interface CustomerAccountDashboardProps {
  data: CustomerLoyaltySummary | null;
  loading: boolean;
  error: string | null;
  isAdminView?: boolean;
}

export default function CustomerAccountDashboard({
  data,
  loading,
  error,
  isAdminView = false,
}: CustomerAccountDashboardProps) {
  if (loading) return <CustomerLoadingState />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl">
        <CustomerErrorState message={error || "تعذر تحميل البيانات"} />
      </div>
    );
  }

  const currency = data.wallet?.currency || data.company?.currency || "EGP";
  const isAutoDiscount = data.loyaltySystem === "AUTO_DISCOUNT";

  return (
    <div className="mx-auto max-w-6xl">
      {isAdminView ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldCheck size={16} />
          أنت تشاهد صفحة العميل كمسؤول — البيانات اللي العميل نفسه شايفها.
        </div>
      ) : null}

      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ShieldCheck size={14} />
              {isAdminView ? "صفحة العميل" : "حساب العميل"}
            </div>
            <h1 className="mt-4 text-3xl font-black">أهلاً {fullName(data)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">
              {data.company?.nameAr || data.company?.name
                ? `في متجر ${data.company.nameAr || data.company.name}. `
                : ""}
              هنا كل ما يخص العميل: النقاط، الخصومات، الكاش باك، وبياناته الشخصية.
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 px-6 py-5 text-right backdrop-blur-sm">
            <div className="text-sm text-white/80">الرصيد المتاح</div>
            <div className="mt-2 text-4xl font-black">
              {formatMoney(toNumber(data.wallet?.balance), currency)}
            </div>
            <div className="mt-2 text-xs text-white/75">
              يمكن استخدامه في الطلبات التي تدعم الدفع من المحفظة
            </div>
          </div>
        </div>
      </div>

      {error ? <CustomerErrorState message={error} /> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isAutoDiscount ? <AutoDiscountCard data={data} /> : <TierCard data={data} />}

        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm dark:border-amber-900 dark:from-amber-950/40 dark:to-orange-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <Gift size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-600">
                نقاط الولاء
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {data.loyalty.points.current.toLocaleString("ar-EG")} نقطة
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-emerald-600">
                {data.loyalty.points.totalEarned.toLocaleString("ar-EG")}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                إجمالي ما كسبته
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-red-500">
                {data.loyalty.points.totalRedeemed.toLocaleString("ar-EG")}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ما استبدله
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-6 shadow-sm dark:border-pink-900 dark:from-pink-950/40 dark:to-rose-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-white">
              <WalletIcon size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-pink-600">
                الكاش باك والمحفظة
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {formatMoney(toNumber(data.wallet?.balance), currency)}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-pink-600">
                {formatMoney(toNumber(data.wallet?.totalCashback), currency)}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                إجمالي الكاش باك
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-gray-900 dark:text-white">
                {formatMoney(toNumber(data.wallet?.totalEarned), currency)}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                إجمالي ما كسبه
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white">
              <Award size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                بياناته الشخصية
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {fullName(data)}
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Phone size={15} />
                <span>رقم الهاتف</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">
                {data.customer.phone || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Mail size={15} />
                <span>البريد الإلكتروني</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">
                {data.customer.email || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Sparkles size={15} />
                <span>عميل منذ</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatDate(data.customer.joinedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
