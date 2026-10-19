import { useMemo } from "react";
import { toUpper } from "./helpers";
import { SHORTAGE_HOLD_STATUS, PROBLEM_HOLD_STATUS } from "./constants";
import type { PreparationStatusOption, QcCheckKey } from "./types";

export interface UsePreparationStatusOptionsParams {
  statusConfigs: Array<{ code: string; name: string }>;
  preparationStatuses: Array<{ code: string; name: string }>;
  preparationSettings: {
    handoffStatus?: string;
    startingStatus?: string;
    qcChecks: Record<string, boolean>;
  };
  t: (key: string) => string;
}

export function usePreparationStatusOptions({
  statusConfigs,
  preparationStatuses,
  preparationSettings,
  t,
}: UsePreparationStatusOptionsParams) {
  const statusLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    statusConfigs.forEach((status) => {
      map.set(toUpper(status.code), status.name);
    });

    return map;
  }, [statusConfigs]);

  const statusOptions = useMemo<PreparationStatusOption[]>(() => {
    const seen = new Set<string>();
    const dynamicOptions: PreparationStatusOption[] = [];

    const addOption = (code: string, fallbackName: string) => {
      const upper = toUpper(code);
      if (!upper || seen.has(upper)) return;
      seen.add(upper);
      dynamicOptions.push({ code: upper, fallbackName });
    };

    preparationStatuses.forEach((status) => {
      addOption(status.code, status.name);
    });

    addOption("PREPARING", t("preparation.page.stages.PREPARING"));
    addOption("QUALITY_CHECK", t("preparation.page.stages.QUALITY_CHECK"));
    addOption("PACKAGED", t("preparation.page.stages.PACKAGED"));
    addOption(SHORTAGE_HOLD_STATUS, t("preparation.page.stages.STOCK_SHORTAGE"));
    addOption(
      preparationSettings.handoffStatus || "READY_TO_SHIP",
      t("preparation.page.stages.READY_TO_SHIP"),
    );

    if (preparationSettings.startingStatus) {
      addOption(preparationSettings.startingStatus, t("preparation.page.stages.WAITING"));
    }

    const problemHoldCode = toUpper(PROBLEM_HOLD_STATUS);
    addOption(
      problemHoldCode,
      statusLabelMap.get(problemHoldCode) || t("orders.onHoldPrep") || "تجهيز معلق",
    );

    return dynamicOptions;
  }, [
    preparationStatuses,
    preparationSettings.handoffStatus,
    preparationSettings.startingStatus,
    statusLabelMap,
    t,
  ]);

  const filterTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs: { statusCode: string; name: string }[] = [];

    preparationStatuses.forEach((status) => {
      const code = toUpper(status.code);
      if (!seen.has(code)) {
        seen.add(code);
        tabs.push({ statusCode: code, name: status.name });
      }
    });

    const forcedStatuses: { code: string; name: string }[] = [
      { code: "CONFIRMED", name: t("orders.confirmed") },
    ];

    forcedStatuses.forEach((s) => {
      const code = toUpper(s.code);
      if (!seen.has(code) && !seen.has("PENDING_PREPARATION")) {
        seen.add(code);
        tabs.push({ statusCode: code, name: s.name });
      }
    });

    const shortageCode = toUpper(SHORTAGE_HOLD_STATUS);
    if (!seen.has(shortageCode)) {
      seen.add(shortageCode);
      tabs.push({
        statusCode: shortageCode,
        name: statusLabelMap.get(shortageCode) || t("preparation.k_9"),
      });
    }

    const problemHoldCode = toUpper(PROBLEM_HOLD_STATUS);
    if (!seen.has(problemHoldCode)) {
      seen.add(problemHoldCode);
      tabs.push({
        statusCode: problemHoldCode,
        name: statusLabelMap.get(problemHoldCode) || t("orders.onHoldPrep") || "تجهيز معلق",
      });
    }

    return tabs;
  }, [preparationStatuses, statusLabelMap, t]);

  const enabledQcChecks = useMemo(
    () =>
      (Object.keys(preparationSettings.qcChecks || {}) as QcCheckKey[]).filter(
        (key) => preparationSettings.qcChecks[key],
      ),
    [preparationSettings.qcChecks],
  );

  return {
    statusLabelMap,
    statusOptions,
    filterTabs,
    enabledQcChecks,
  };
}
