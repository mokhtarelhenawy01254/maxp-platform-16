import React from "react";

interface MetricCardItem {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

interface ReorderMetricsGridProps {
  cards: MetricCardItem[];
  loading: boolean;
}

export const ReorderMetricsGrid: React.FC<ReorderMetricsGridProps> = ({
  cards,
  loading,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xs overflow-hidden relative"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-3">
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums font-mono">
                {loading ? "..." : card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
