export type RewardUiStatus =
  | "PENDING"
  | "APPROVED"
  | "APPLIED"
  | "REJECTED"
  | "VOIDED";

export interface RewardRecordState {
  status?: string | null;
  voidedAt?: string | null;
  isLocked?: boolean | null;
  isIncludedInPayroll?: boolean | null;
}

const APPROVE_REWARD_ROLES = new Set([
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "OWNER",
  "MANAGER",
]);

const EDIT_REWARD_ROLES = new Set([
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "OWNER",
  "MANAGER",
  "HR_MANAGER",
  "HR",
]);

const DELETE_REWARD_ROLES = new Set([
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "OWNER",
  "MANAGER",
  "HR_MANAGER",
]);

export const normalizeRewardStatus = (
  record: Pick<RewardRecordState, "status" | "voidedAt">,
): RewardUiStatus => {
  const rawStatus = record.status?.toUpperCase();

  switch (rawStatus) {
    case "APPROVED":
      return "APPROVED";
    case "APPLIED":
    case "GIVEN":
      return "APPLIED";
    case "REJECTED":
      return "REJECTED";
    case "VOIDED":
      return "VOIDED";
    case "CANCELLED":
      return record.voidedAt ? "VOIDED" : "REJECTED";
    case "PENDING":
    default:
      return "PENDING";
  }
};

export const mapRewardStatusFilterToApi = (status?: string): string => {
  switch (status) {
    case "APPLIED":
      return "GIVEN";
    case "REJECTED":
    case "VOIDED":
      return "CANCELLED";
    default:
      return status || "";
  }
};

export const getRewardDeleteBlockReason = (
  record: RewardRecordState,
): string | null => {
  if (record.isIncludedInPayroll) {
    return "لا يمكن حذف مكافأة مدرجة في كشف الرواتب";
  }

  if (record.isLocked) {
    return "لا يمكن حذف مكافأة مقفلة";
  }

  return null;
};

export const isRewardDeleteAvailable = (
  record: RewardRecordState,
): boolean => getRewardDeleteBlockReason(record) === null;

export const canUserApproveReward = (role?: string | null): boolean =>
  APPROVE_REWARD_ROLES.has(role || "");

export const canUserEditReward = (role?: string | null): boolean =>
  EDIT_REWARD_ROLES.has(role || "");

export const canUserDeleteReward = (role?: string | null): boolean =>
  DELETE_REWARD_ROLES.has(role || "");
