import i18n from "../../../i18n";
import {
  DEFAULT_PROBLEM_HOLD_DETAILS,
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  PREPARATION_STATUS_METADATA_KEY,
  PROBLEM_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_REASON_OPTIONS,
  TERMINAL_NON_PREPARATION_STATUSES,
} from "./constants";
import type {
  JsonObject,
  ProblemHoldDetails,
  ShortageFollowUpState,
  ShortageFollowUpVisual,
  ShortageHoldDetails,
  ShortageReason,
  StageKey,
} from "./types";

export const toUpper = (value: string | undefined | null) =>
  String(value || "").trim().toUpperCase();

export const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseMaybeJsonObject = (value: unknown): JsonObject => {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch (_error) {
      return {};
    }
  }

  return {};
};

export const mergePlainObjects = (
  currentValue: JsonObject,
  patchValue: JsonObject,
): JsonObject => {
  const nextValue = { ...currentValue };

  Object.entries(patchValue).forEach(([key, value]) => {
    if (value === null) {
      delete nextValue[key];
      return;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      nextValue[key] &&
      typeof nextValue[key] === "object" &&
      !Array.isArray(nextValue[key])
    ) {
      nextValue[key] = mergePlainObjects(
        parseMaybeJsonObject(nextValue[key]),
        value as JsonObject,
      );
      return;
    }

    nextValue[key] = value;
  });

  return nextValue;
};

export const normalizeDateInputValue = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "";

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildShortageHoldDetails = (
  metadata: unknown,
): ShortageHoldDetails => {
  const metadataObject = parseMaybeJsonObject(metadata);
  const rawDetails = parseMaybeJsonObject(
    metadataObject[SHORTAGE_HOLD_METADATA_KEY],
  );

  const reason = SHORTAGE_REASON_OPTIONS.some(
    (option) => option.value === rawDetails["reason"],
  )
    ? (rawDetails["reason"] as ShortageReason)
    : DEFAULT_SHORTAGE_HOLD_DETAILS.reason;

  return {
    ...DEFAULT_SHORTAGE_HOLD_DETAILS,
    reason,
    owner:
      typeof rawDetails["owner"] === "string"
        ? rawDetails["owner"]
        : DEFAULT_SHORTAGE_HOLD_DETAILS.owner,
    followUpDate: normalizeDateInputValue(rawDetails["followUpDate"]),
    customerNotified: Boolean(rawDetails["customerNotified"]),
    note:
      typeof rawDetails["note"] === "string"
        ? rawDetails["note"]
        : DEFAULT_SHORTAGE_HOLD_DETAILS.note,
    heldAt:
      typeof rawDetails["heldAt"] === "string"
        ? rawDetails["heldAt"]
        : DEFAULT_SHORTAGE_HOLD_DETAILS.heldAt,
    releasedAt:
      typeof rawDetails["releasedAt"] === "string"
        ? rawDetails["releasedAt"]
        : DEFAULT_SHORTAGE_HOLD_DETAILS.releasedAt,
    state: rawDetails["state"] === "released" ? "released" : "held",
  };
};

export const PREPARATION_HOLD_STAGES = new Set(["STOCK_SHORTAGE", "ON_HOLD_PREP"]);

export const isProblemHoldStage = (stage: StageKey | null): boolean =>
  Boolean(stage && PREPARATION_HOLD_STAGES.has(stage));

export const buildProblemHoldDetails = (metadata: unknown): ProblemHoldDetails => {
  const metadataObject = parseMaybeJsonObject(metadata);
  const rawDetails = parseMaybeJsonObject(metadataObject[PROBLEM_HOLD_METADATA_KEY]);

  return {
    ...DEFAULT_PROBLEM_HOLD_DETAILS,
    reason:
      typeof rawDetails["reason"] === "string"
        ? rawDetails["reason"]
        : DEFAULT_PROBLEM_HOLD_DETAILS.reason,
    heldAt:
      typeof rawDetails["heldAt"] === "string"
        ? rawDetails["heldAt"]
        : DEFAULT_PROBLEM_HOLD_DETAILS.heldAt,
    releasedAt:
      typeof rawDetails["releasedAt"] === "string"
        ? rawDetails["releasedAt"]
        : DEFAULT_PROBLEM_HOLD_DETAILS.releasedAt,
    heldBy:
      typeof rawDetails["heldBy"] === "string"
        ? rawDetails["heldBy"]
        : DEFAULT_PROBLEM_HOLD_DETAILS.heldBy,
    releasedBy:
      typeof rawDetails["releasedBy"] === "string"
        ? rawDetails["releasedBy"]
        : DEFAULT_PROBLEM_HOLD_DETAILS.releasedBy,
    state: rawDetails["state"] === "released" ? "released" : "held",
  };
};

export const getActiveHoldDetails = (
  order: { stage: StageKey | null; metadata: unknown },
): ShortageHoldDetails | ProblemHoldDetails => {
  if (order.stage === "ON_HOLD_PREP") {
    return buildProblemHoldDetails(order.metadata);
  }
  return buildShortageHoldDetails(order.metadata);
};

export const getEffectivePreparationStatus = (
  status: string,
  metadata: unknown,
): string => {
  const normalizedStatus = toUpper(status);
  if (TERMINAL_NON_PREPARATION_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  const metadataObject = parseMaybeJsonObject(metadata);
  const metadataStatus = toUpper(
    String(metadataObject[PREPARATION_STATUS_METADATA_KEY] || ""),
  );

  return metadataStatus || normalizedStatus;
};

export const getShortageReasonLabel = (reason: ShortageReason) => {
  const option = SHORTAGE_REASON_OPTIONS.find((o) => o.value === reason);
  return option ? i18n.t(option.labelKey) : i18n.t("preparation.shortageReasons.stock_shortage");
};

export const getDateInputValueWithOffset = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isShortageFollowUpToday = (
  followUpDate: string,
  stage: StageKey | null,
) => {
  if (!isProblemHoldStage(stage) || !followUpDate) return false;

  return normalizeDateInputValue(followUpDate) === getDateInputValueWithOffset(0);
};

export const isShortageFollowUpOverdue = (
  followUpDate: string,
  stage: StageKey | null,
) => {
  if (!isProblemHoldStage(stage) || !followUpDate) return false;

  const parsedDate = new Date(
    followUpDate.length <= 10 ? `${followUpDate}T00:00:00` : followUpDate,
  );
  if (Number.isNaN(parsedDate.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return parsedDate.getTime() < startOfToday.getTime();
};

export const getShortageFollowUpState = (
  followUpDate: string,
  stage: StageKey | null,
): ShortageFollowUpState => {
  if (!isProblemHoldStage(stage)) return "none";
  if (!followUpDate) return "without_date";
  if (isShortageFollowUpOverdue(followUpDate, stage)) return "overdue";
  if (isShortageFollowUpToday(followUpDate, stage)) return "today";
  return "scheduled";
};

export const SHORTAGE_FOLLOW_UP_PRIORITY: Record<
  ShortageFollowUpState,
  number
> = {
  overdue: 0,
  today: 1,
  without_date: 2,
  scheduled: 3,
  none: 4,
};

export const getShortageFollowUpVisual = (
  state: ShortageFollowUpState,
): ShortageFollowUpVisual | null => {
  switch (state) {
    case "overdue":
      return {
        label: i18n.t("preparation.shortageFollowUp.overdueLabel"),
        badgeClass:
          "rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800",
        cardClass: "border-orange-300 shadow-orange-100",
        alertClass:
          "rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900",
        alertText: i18n.t("preparation.shortageFollowUp.overdueText"),
      };
    case "today":
      return {
        label: i18n.t("preparation.shortageFollowUp.todayLabel"),
        badgeClass:
          "rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800",
        cardClass: "border-sky-300 shadow-sky-100",
        alertClass:
          "rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900",
        alertText: i18n.t("preparation.shortageFollowUp.todayText"),
      };
    case "without_date":
      return {
        label: i18n.t("preparation.shortageFollowUp.withoutDateLabel"),
        badgeClass:
          "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700",
        cardClass: "border-slate-300 shadow-slate-100",
        alertClass:
          "rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800",
        alertText: i18n.t("preparation.shortageFollowUp.withoutDateText"),
      };
    default:
      return null;
  }
};

const STAGE_BY_STATUS: Record<string, string> = {
  PENDING: "WAITING",
  CONFIRMED: "WAITING",
  PENDING_PREPARATION: "WAITING",
  PROCESSING: "PREPARING",
  PREPARING: "PREPARING",
  QUALITY_CHECK: "QUALITY_CHECK",
  PACKAGED: "PACKAGED",
  PACKED: "PACKAGED",
  STOCK_SHORTAGE: "STOCK_SHORTAGE",
  PENDING_STOCK: "STOCK_SHORTAGE",
  ON_HOLD_STOCK: "STOCK_SHORTAGE",
  READY: "READY_TO_SHIP",
  READY_TO_SHIP: "READY_TO_SHIP",
  PENDING_CANCELLATION: "PENDING_CANCELLATION",
  ON_HOLD_PREP: "ON_HOLD_PREP",
};

export const normalizeStatusToStage = (status: string): string | null => {
  return STAGE_BY_STATUS[toUpper(status)] || null;
};

export const getNextStatus = (
  stage: StageKey | null,
  handoffStatus = "READY_TO_SHIP",
  startingStatus = "PENDING_PREPARATION",
): string | null => {
  switch (stage) {
    case "WAITING":
      return "PREPARING";
    case "PREPARING":
      return "QUALITY_CHECK";
    case "QUALITY_CHECK":
      return "PACKAGED";
    case "PACKAGED":
      return handoffStatus;
    case "STOCK_SHORTAGE":
      return startingStatus;
    default:
      return null;
  }
};

export const getQuickActionLabel = (stage: StageKey | null) => {
  switch (stage) {
    case "WAITING":
      return i18n.t("preparation.quickAction.WAITING");
    case "PREPARING":
      return i18n.t("preparation.quickAction.PREPARING");
    case "QUALITY_CHECK":
      return i18n.t("preparation.quickAction.QUALITY_CHECK");
    case "PACKAGED":
      return i18n.t("preparation.quickAction.PACKAGED");
    case "STOCK_SHORTAGE":
      return i18n.t("preparation.quickAction.STOCK_SHORTAGE");
    case "ON_HOLD_PREP":
      return i18n.t("preparation.quickAction.ON_HOLD_PREP");
    default:
      return i18n.t("preparation.quickAction.default");
  }
};

export const getAgeLabel = (dateValue: string) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return i18n.t("preparation.age.unknown");

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return i18n.t("preparation.age.days", { count: diffDays });
  if (diffHours > 0) return i18n.t("preparation.age.hours", { count: diffHours });

  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return i18n.t("preparation.age.minutes", { count: diffMinutes });
};

export const getApiErrorMessage = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message || null;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message?: string }).message || null;
  }

  return null;
};
