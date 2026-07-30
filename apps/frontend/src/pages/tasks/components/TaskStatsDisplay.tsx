import { Check as CheckIcon, Circle as ClipboardDocumentListIcon, Clock as ClockIcon, AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';
import React from "react";
;

import { BusinessMetricsStrip } from "../../../components/business/BusinessMetrics";

export interface TaskStatsDisplayProps {
  taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

const ProgressIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

export const TaskStatsDisplay: React.FC<TaskStatsDisplayProps> = ({
  taskStats,
}) => {
  return (
    <BusinessMetricsStrip
      items={[
        {
          title: "إجمالي المهام",
          value: taskStats.total,
          subtitle: "كل العناصر المتاحة في النطاق الحالي.",
          tone: "primary",
          icon: ClipboardDocumentListIcon,
        },
        {
          title: "في الانتظار",
          value: taskStats.pending,
          subtitle: "مهام تحتاج بدء أو توزيع أو متابعة أولية.",
          tone: "warning",
          icon: ClockIcon,
        },
        {
          title: "قيد التنفيذ",
          value: taskStats.inProgress,
          subtitle: "العمل المفتوح الجاري الآن داخل الفريق.",
          tone: "secondary",
          icon: ProgressIcon,
        },
        {
          title: "مكتملة",
          value: taskStats.completed,
          subtitle: "العناصر المنجزة التي يمكن إخفاؤها عند الحاجة.",
          tone: "success",
          icon: CheckIcon,
        },
        {
          title: "متأخرة",
          value: taskStats.overdue,
          subtitle: "مهام تجاوزت تاريخ الاستحقاق وتحتاج تدخل سريع.",
          tone: "warning",
          icon: ExclamationTriangleIcon,
        },
      ]}
    />
  );
};
