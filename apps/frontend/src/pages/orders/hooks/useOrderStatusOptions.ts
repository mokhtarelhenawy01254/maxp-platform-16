import { useMemo } from "react";
import type { OrderDetailsType } from "../types";

export interface StatusConfig {
  code: string;
  name: string;
  color?: string;
}

export interface WorkflowStatusDef {
  code: string;
  name: string;
  requiresOverride?: boolean;
}

export interface UseOrderStatusOptionsParams {
  order: OrderDetailsType | null;
  orderStatuses: StatusConfig[];
  allowedTransitions: string[];
  workflowStatusDefs: WorkflowStatusDef[];
  isOverride: boolean;
}

export interface UseOrderStatusOptionsReturn {
  effectiveStatus: string;
  currentStatusConfig: StatusConfig;
  hasWorkflowRestrictions: boolean;
  filteredStatusOptions: StatusConfig[];
  statusNameMap: Record<string, string>;
}

export function useOrderStatusOptions({
  order,
  orderStatuses,
  allowedTransitions,
  workflowStatusDefs,
  isOverride,
}: UseOrderStatusOptionsParams): UseOrderStatusOptionsReturn {
  const statusNameMap = useMemo(
    () =>
      Object.fromEntries(
        (orderStatuses || []).map((s) => [
          String(s.code || "").trim().toUpperCase(),
          s.name,
        ]),
      ),
    [orderStatuses],
  );

  const effectiveStatus =
    (order as any)?.effectiveStatus || order?.status || "PENDING";

  const currentStatusConfig = useMemo(() => {
    const match = (orderStatuses || []).find(
      (s) =>
        (s.code || "").toUpperCase() === String(effectiveStatus || "").toUpperCase(),
    );
    if (match) return match;
    return {
      code: effectiveStatus,
      name: effectiveStatus.replace(/_/g, " "),
      color: "#6B7280",
    };
  }, [effectiveStatus, orderStatuses]);

  const hasWorkflowRestrictions = (allowedTransitions || []).length > 0;

  const filteredStatusOptions = useMemo(() => {
    if (!hasWorkflowRestrictions) {
      return orderStatuses || [];
    }

    return (orderStatuses || []).filter((s) => {
      if (s.code === order?.status) return true;
      if (!allowedTransitions.includes(s.code)) return false;
      const wfStatus = (workflowStatusDefs || []).find((ws) => ws.code === s.code);
      if (wfStatus?.requiresOverride && !isOverride) return false;
      return true;
    });
  }, [
    allowedTransitions,
    hasWorkflowRestrictions,
    isOverride,
    order?.status,
    orderStatuses,
    workflowStatusDefs,
  ]);

  return {
    effectiveStatus,
    currentStatusConfig,
    hasWorkflowRestrictions,
    filteredStatusOptions,
    statusNameMap,
  };
}
