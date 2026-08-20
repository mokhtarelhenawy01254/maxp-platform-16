import { useState } from "react";
import { Link } from "react-router-dom";
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
  if (!value) return "ΓÇö";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ΓÇö";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const fullName = (data: { customer: { firstName: string; lastName: string } }) =>
  `${data.customer.firstName} ${data.customer.lastName}`.trim() || "╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓";

export const CustomerLoadingState = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center text-gray-500">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      <p className="mt-4">╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬...</p>
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
    benefitRows.push({ label: "╪┤╪¡┘å ┘à╪¼╪º┘å┘è", active: true });
  }
  const discountPercent = toNumber(benefits.discountPercent);
  if (discountPercent > 0) {
    benefitRows.push({ label: `╪«╪╡┘à ${discountPercent}%`, active: true });
  }
  if (rewards?.freeShipping) {
    benefitRows.push({ label: "╪┤╪¡┘å ┘à╪¼╪º┘å┘è", active: true });
  }
  if (toNumber(rewards?.discountPercent) > 0) {
    benefitRows.push({
      label: `╪«╪╡┘à ${toNumber(rewards.discountPercent)}%`,
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
              ╪º┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪¡╪º┘ä┘è
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {tier?.nameAr || tier?.name || "╪¿╪»┘ê┘å ┘à╪│╪¬┘ê┘ë"}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            ╪▒╪╡┘è╪» ╪º┘ä┘à╪│╪¬┘ê┘ë
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
              ┘ü╪º╪╢┘ä {nextTier.remainingMetric.toLocaleString("ar-EG")}{" "}
              {metricLabel} ┘ä┘ä┘ê╪╡┘ê┘ä ╪Ñ┘ä┘ë {nextTier.nameAr || nextTier.name}
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
          ╪ú┘å╪¬ ┘ü┘è ╪ú╪╣┘ä┘ë ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐ ≡ƒÄë
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

const MembershipCard = ({ data }: { data: CustomerLoyaltySummary }) => {
  const card = data.card;
  const tier = data.loyalty.tier;
  const tierColor = tier?.color || "#6366f1";
  const [imageFailed, setImageFailed] = useState(false);

  const cardUrl = card?.url;
  if (!cardUrl || imageFailed) return null;

  const download = () => {
    const link = document.createElement("a");
    link.href = cardUrl;
    link.download = "membership-card.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: tierColor }}
          >
            <Award size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              ╪¿╪╖╪º┘é╪⌐ ╪º┘ä╪╣╪╢┘ê┘è╪⌐
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {tier?.nameAr || tier?.name || "┘â╪º╪▒╪¬ ╪º┘ä┘à╪│╪¬┘ê┘ë"}
            </div>
          </div>
        </div>
        {card.membershipNumber ? (
          <div className="text-left">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ╪▒┘é┘à ╪º┘ä╪╣╪╢┘ê┘è╪⌐
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-white" dir="ltr">
              {card.membershipNumber}
            </div>
          </div>
        ) : null}
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
        >
          ╪¬╪¡┘à┘è┘ä ╪º┘ä┘â╪º╪▒╪¬
        </button>
      </div>

      <div className="mt-4">
        <img
          src={cardUrl}
          alt="┘â╪º╪▒╪¬ ╪º┘ä╪╣╪╢┘ê┘è╪⌐"
          onError={() => setImageFailed(true)}
          className="w-full rounded-2xl border border-gray-200 shadow-lg dark:border-gray-700"
        />
      </div>
    </div>
  );
};

const AutoDiscountCard = ({ data }: { data: CustomerLoyaltySummary }) => {
  const autoDiscount = data.autoDiscount;
  const voucher = autoDiscount?.activeVoucher || null;
  const discountPercent = voucher
    ? toNumber(voucher.percent)
    : toNumber(autoDiscount?.discountPercent || 0);

  // ╪º┘ä┘â╪º╪▒╪¬ ┘à┘è╪╕┘ç╪▒╪┤ ╪║┘è╪▒ ┘ä┘à╪º ╪º┘ä╪╣┘à┘è┘ä ┘è┘â┘ê┘å ╪╣┘å╪»┘ç ╪«╪╡┘à ┘ü╪╣┘ä┘è (┘â┘ê╪¿┘ê┘å/┘ü╪º╪¬┘ê╪▒╪⌐ ╪¼╪º┘ç╪▓╪⌐).
  // ┘ä┘ê ┘à┘ü┘è╪┤ ╪«╪╡┘à ΓåÆ ┘à╪«┘ü┘è ╪¬┘à╪º┘à╪º┘ï ╪¿╪»┘ä ┘à╪º ┘è┘â╪¬╪¿ "╪║┘è╪▒ ┘à┘ü╪╣┘æ┘ä".
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
              ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {discountPercent > 0 ? `╪«╪╡┘à ${discountPercent}%` : "╪║┘è╪▒ ┘à┘ü╪╣┘æ┘ä"}
            </div>
          </div>
        </div>
      </div>

      {voucher ? (
        <div className="mt-6 rounded-2xl border border-violet-200 bg-white/70 p-4 dark:border-violet-900 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Ticket size={16} className="text-violet-600" />
            ╪╣┘å╪»┘â ╪«╪╡┘à {voucher.percent}% ╪¼╪º┘ç╪▓ ╪╣┘ä┘ë ╪╖┘ä╪¿┘â ╪º┘ä┘é╪º╪»┘à
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Clock3 size={14} />
            ╪╡╪º┘ä╪¡ ╪¡╪¬┘ë {formatDate(voucher.expiresAt)}
          </div>
          {voucher.sourceOrderNumber ? (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ┘à┘å ╪º┘ä╪╖┘ä╪¿ {voucher.sourceOrderNumber}
            </div>
          ) : null}
        </div>
      ) : autoDiscount?.status === "PRE_ACTIVATION" ? (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-white/60 px-4 py-4 text-sm text-gray-600 dark:border-violet-800 dark:bg-gray-900/40 dark:text-gray-300">
          ┘ç╪░╪º ╪º┘ä╪╣┘à┘è┘ä ╪╖┘ä╪¿ ┘é╪¿┘ä ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í╪î ┘ü╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à╪┤ ╪¿┘è╪╖╪¿┘é ╪╣┘ä┘è┘ç.
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-white/60 px-4 py-4 text-sm text-gray-600 dark:border-violet-800 dark:bg-gray-900/40 dark:text-gray-300">
          ╪º┘ä╪«╪╡┘à ╪¿┘è╪¬┘ü╪╣┘æ┘ä ╪¬┘ä┘é╪º╪ª┘è┘ï╪º ╪¿╪╣╪» ╪¬╪│┘ä┘è┘à ╪╖┘ä╪¿┘â. ┘â┘ä ╪ú┘ê╪▒╪»╪▒ ┘à╪ñ┘ç┘ä ╪¿┘è╪»┘è┘â ┘â┘ê╪¿┘ê┘å
          ╪«╪╡┘à {autoDiscount?.validityDays || 3} ╪ú┘è╪º┘à╪î ┘ê┘ä┘ê ╪«┘ä╪╡╪¬ ┘à╪»╪¬┘ç ╪¿┘è╪¬╪¡┘ê┘ä ┘ä┘â╪º╪┤
          ╪¿╪º┘â ┘ü┘è ┘à╪¡┘ü╪╕╪¬┘â.
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
        <CustomerErrorState message={error || "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬"} />
      </div>
    );
  }

  const currency = data.wallet?.currency || data.company?.currency || "EGP";

  return (
    <div className="mx-auto max-w-6xl">
      {isAdminView ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldCheck size={16} />
          ╪ú┘å╪¬ ╪¬╪┤╪º┘ç╪» ╪╡┘ü╪¡╪⌐ ╪º┘ä╪╣┘à┘è┘ä ┘â┘à╪│╪ñ┘ê┘ä ΓÇö ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘ä┘è ╪º┘ä╪╣┘à┘è┘ä ┘å┘ü╪│┘ç ╪┤╪º┘è┘ü┘ç╪º.
        </div>
      ) : null}

      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ShieldCheck size={14} />
              {isAdminView ? "╪╡┘ü╪¡╪⌐ ╪º┘ä╪╣┘à┘è┘ä" : "╪¡╪│╪º╪¿ ╪º┘ä╪╣┘à┘è┘ä"}
            </div>
            <h1 className="mt-4 text-3xl font-black">╪ú┘ç┘ä╪º┘ï {fullName(data)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">
              {data.company?.nameAr || data.company?.name
                ? `┘ü┘è ┘à╪¬╪¼╪▒ ${data.company.nameAr || data.company.name}. `
                : ""}
              ┘ç┘å╪º ┘â┘ä ┘à╪º ┘è╪«╪╡ ╪º┘ä╪╣┘à┘è┘ä: ╪º┘ä┘å┘é╪º╪╖╪î ╪º┘ä╪«╪╡┘ê┘à╪º╪¬╪î ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â╪î ┘ê╪¿┘è╪º┘å╪º╪¬┘ç ╪º┘ä╪┤╪«╪╡┘è╪⌐.
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 px-6 py-5 text-right backdrop-blur-sm">
            <div className="text-sm text-white/80">╪º┘ä╪▒╪╡┘è╪» ╪º┘ä┘à╪¬╪º╪¡</div>
            <div className="mt-2 text-4xl font-black">
              {formatMoney(toNumber(data.wallet?.balance), currency)}
            </div>
            <div className="mt-2 text-xs text-white/75">
              ┘è┘à┘â┘å ╪º╪│╪¬╪«╪»╪º┘à┘ç ┘ü┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪¬┘è ╪¬╪»╪╣┘à ╪º┘ä╪»┘ü╪╣ ┘à┘å ╪º┘ä┘à╪¡┘ü╪╕╪⌐
            </div>
          </div>
        </div>
      </div>

      {error ? <CustomerErrorState message={error} /> : null}

      <MembershipCard data={data} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TierCard data={data} />
        {data.autoDiscount ? <AutoDiscountCard data={data} /> : null}

        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm dark:border-amber-900 dark:from-amber-950/40 dark:to-orange-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <Gift size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-600">
                ┘å┘é╪º╪╖ ╪º┘ä┘ê┘ä╪º╪í
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {data.loyalty.points.current.toLocaleString("ar-EG")} ┘å┘é╪╖╪⌐
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-emerald-600">
                {data.loyalty.points.totalEarned.toLocaleString("ar-EG")}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ┘â╪│╪¿╪¬┘ç
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-red-500">
                {data.loyalty.points.totalRedeemed.toLocaleString("ar-EG")}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ┘à╪º ╪º╪│╪¬╪¿╪»┘ä┘ç
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
                ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ┘ê╪º┘ä┘à╪¡┘ü╪╕╪⌐
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
                ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-gray-900/50">
              <div className="text-lg font-black text-gray-900 dark:text-white">
                {formatMoney(toNumber(data.wallet?.totalEarned), currency)}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ┘â╪│╪¿┘ç
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
                ╪¿┘è╪º┘å╪º╪¬┘ç ╪º┘ä╪┤╪«╪╡┘è╪⌐
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
                <span>╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">
                {data.customer.phone || "ΓÇö"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Mail size={15} />
                <span>╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">
                {data.customer.email || "ΓÇö"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Sparkles size={15} />
                <span>╪╣┘à┘è┘ä ┘à┘å╪░</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatDate(data.customer.joinedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ╪╣╪▒┘ê╪╢ ╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä╪¬╪▒┘ê┘è╪¼┘è╪⌐ ΓÇö ┘à╪¡┘ü╪▓ ┘ä┘ä╪╖┘ä╪¿ */}
      {data.storePromotion ? (
        <div className="mt-6 rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm dark:border-orange-900 dark:from-orange-950/40 dark:to-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
              <BadgePercent size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-orange-600">╪╣╪▒┘ê╪╢ ╪º┘ä┘à╪¬╪¼╪▒</div>
              <div className="text-lg font-black text-gray-900 dark:text-white">
                {data.storePromotion.title || "╪╣╪▒╪╢ ┘ä┘ü╪¬╪▒╪⌐ ┘à╪¡╪»┘ê╪»╪⌐"}
              </div>
            </div>
          </div>
          {data.storePromotion.tiers && data.storePromotion.tiers.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.storePromotion.tiers.map((tier, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-200"
                >
                  <Sparkles size={15} className="text-orange-500" />
                  {tier.label ||
                    `╪º╪┤╪¬╪▒┘É ${tier.items || tier.minQuantity || 2} ┘é╪╖╪╣ ┘ê╪º╪│╪¬┘ü╪» ┘à┘å ╪º┘ä╪╣╪▒╪╢`}
                </div>
              ))}
            </div>
          ) : null}
          {data.storePromotion.endDate ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock3 size={14} />
              ╪º┘ä╪╣╪▒╪╢ ╪╡╪º┘ä╪¡ ╪¡╪¬┘ë {formatDate(data.storePromotion.endDate)}
            </div>
          ) : null}
          <div className="mt-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
            >
              ╪º╪╖┘ä╪¿ ╪º┘ä╪ó┘å ┘ê╪º╪│╪¬┘ü╪» ┘à┘å ╪º┘ä╪╣╪▒╪╢
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
