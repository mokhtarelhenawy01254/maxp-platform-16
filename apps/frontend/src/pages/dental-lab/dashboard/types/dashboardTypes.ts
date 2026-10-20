import { type ReactNode } from "react";

export interface DashboardKpiCardItem {
  id: string;
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
  bg: string;
  tooltip: string;
  onClick: () => void;
}
