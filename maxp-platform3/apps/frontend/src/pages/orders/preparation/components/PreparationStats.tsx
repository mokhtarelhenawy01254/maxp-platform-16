import { PackageSearch, CheckCircle2, AlertCircle, Truck, Clock, Timer } from 'lucide-react';

interface PreparationStatsProps {
  searchedOrdersCount: number;
  readyCount: number;
  shortageCount: number;
  readyToShipCount: number;
  shortageHoldCount: number;
  overdueShortageFollowUpCount: number;
}

const stats = (
  searchedOrdersCount: number,
  readyCount: number,
  shortageCount: number,
  readyToShipCount: number,
  shortageHoldCount: number,
  overdueShortageFollowUpCount: number,
) => [
  {
    title: 'في مسار التجهيز',
    count: searchedOrdersCount,
    icon: PackageSearch,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    countColor: 'text-indigo-700',
  },
  {
    title: 'جاهزة بالكامل',
    count: readyCount,
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    countColor: 'text-emerald-700',
  },
  {
    title: 'بها نواقص',
    count: shortageCount,
    icon: AlertCircle,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
    countColor: 'text-rose-700',
  },
  {
    title: 'جاهزة للشحن',
    count: readyToShipCount,
    icon: Truck,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-50',
    countColor: 'text-sky-700',
  },
  {
    title: 'مؤجلة بالعجز',
    count: shortageHoldCount,
    icon: Clock,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    countColor: 'text-amber-700',
  },
  {
    title: 'متابعات متأخرة',
    count: overdueShortageFollowUpCount,
    icon: Timer,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    countColor: 'text-orange-700',
  },
];

const PreparationStats = ({
  searchedOrdersCount,
  readyCount,
  shortageCount,
  readyToShipCount,
  shortageHoldCount,
  overdueShortageFollowUpCount,
}: PreparationStatsProps) => {
  const items = stats(
    searchedOrdersCount,
    readyCount,
    shortageCount,
    readyToShipCount,
    shortageHoldCount,
    overdueShortageFollowUpCount,
  );

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm transition hover:border-gray-200"
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}
            >
              <Icon className={`h-4 w-4 ${stat.iconColor}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-gray-500">{stat.title}</p>
              <p className={`text-lg font-bold leading-none ${stat.countColor}`}>
                {stat.count.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default PreparationStats;
