import { useTranslation } from "react-i18next";
import { PackageSearch, CheckCircle2, AlertCircle, Truck, Clock, Timer } from 'lucide-react';

interface PreparationStatsProps {
  searchedOrdersCount: number;
  readyCount: number;
  shortageCount: number;
  readyToShipCount: number;
  shortageHoldCount: number;
  overdueShortageFollowUpCount: number;
}

const PreparationStats = ({
  searchedOrdersCount,
  readyCount,
  shortageCount,
  readyToShipCount,
  shortageHoldCount,
  overdueShortageFollowUpCount,
}: PreparationStatsProps) => {
  const { t } = useTranslation();

  const items = [
    {
      title: t("preparation.stats.inPreparation"),
      count: searchedOrdersCount,
      icon: PackageSearch,
      iconColor: 'text-indigo-500 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      countColor: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      title: t("preparation.stats.fullyReady"),
      count: readyCount,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      countColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      title: t("preparation.stats.hasShortage"),
      count: shortageCount,
      icon: AlertCircle,
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      countColor: 'text-rose-700 dark:text-rose-300',
    },
    {
      title: t("preparation.stats.readyToShip"),
      count: readyToShipCount,
      icon: Truck,
      iconColor: 'text-sky-500 dark:text-sky-400',
      iconBg: 'bg-sky-50 dark:bg-sky-900/20',
      countColor: 'text-sky-700 dark:text-sky-300',
    },
    {
      title: t("preparation.stats.onHoldByShortage"),
      count: shortageHoldCount,
      icon: Clock,
      iconColor: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      countColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      title: t("preparation.stats.overdueFollowUps"),
      count: overdueShortageFollowUpCount,
      icon: Timer,
      iconColor: 'text-orange-500 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-900/20',
      countColor: 'text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2 transition-colors hover:border-border"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${stat.iconBg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${stat.iconColor}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{stat.title}</p>
              <p className={`mt-0.5 font-mono text-base font-semibold tabular-nums leading-none ${stat.countColor}`}>
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
