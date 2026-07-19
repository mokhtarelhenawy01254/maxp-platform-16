import type { ComponentType, SVGProps } from "react";
import type { DashboardData } from "../../../pages/dashboard/types";

export type WidgetSize = "large" | "mini";

export type WidgetMetric = {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
};

export type WidgetData = {
  metrics: WidgetMetric[];
  status?: "active" | "warning" | "error" | "inactive";
  statusLabel?: string;
};

export type WidgetDefinition = {
  appSlug: string;
  id: string;
  titleKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  priority: number;
  href: string;
  colSpan?: number;
  fetchData: (dashboard: DashboardData | undefined, appData?: Record<string, unknown>) => WidgetData | null;
};
