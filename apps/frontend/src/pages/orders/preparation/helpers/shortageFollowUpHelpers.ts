import i18n from "../../../../i18n";
import { SHORTAGE_REASON_OPTIONS } from "../constants";
import type {
  ShortageFollowUpState,
  ShortageFollowUpVisual,
  ShortageReason,
  StageKey,
} from "../types";
import { isProblemHoldStage, normalizeDateInputValue } from "../helpers";

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

export const SHORTAGE_FOLLOW_UP_PRIORITY: Record<ShortageFollowUpState, number> = {
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
