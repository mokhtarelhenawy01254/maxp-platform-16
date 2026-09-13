export const PRODUCT_WORKFLOW_STATUSES = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PUBLISHED: "PUBLISHED",
} as const;

export type ProductWorkflowStatus =
  (typeof PRODUCT_WORKFLOW_STATUSES)[keyof typeof PRODUCT_WORKFLOW_STATUSES];

export interface ProductWorkflow {
  status: ProductWorkflowStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  rejectionReason: string | null;
  lastActionAt: string | null;
  lastActionById: string | null;
  lastActionByName: string | null;
  lastActionByRole: string | null;
}

const DEFAULT_WORKFLOW: ProductWorkflow = {
  status: PRODUCT_WORKFLOW_STATUSES.DRAFT,
  submittedAt: null,
  approvedAt: null,
  rejectedAt: null,
  publishedAt: null,
  unpublishedAt: null,
  rejectionReason: null,
  lastActionAt: null,
  lastActionById: null,
  lastActionByName: null,
  lastActionByRole: null,
};

const WORKFLOW_STATUS_SET = new Set<ProductWorkflowStatus>(
  Object.values(PRODUCT_WORKFLOW_STATUSES),
);

const PRODUCT_WORKFLOW_MANAGER_ROLES = new Set([
  "OWNER",
  "COMPANY_ADMIN",
  "SUPER_ADMIN",
  "MANAGER",
]);

const PRODUCT_REVIEW_SUBMITTER_ROLES = new Set([
  "AGENT",
  "EMPLOYEE",
]);

const normalizeRole = (role: string | null | undefined): string =>
  String(role || "").trim().toUpperCase();

const normalizeWorkflowStatus = (
  value: unknown,
  isActive?: boolean,
): ProductWorkflowStatus => {
  const normalized = String(value || "").trim().toUpperCase() as ProductWorkflowStatus;
  if (WORKFLOW_STATUS_SET.has(normalized)) {
    return normalized;
  }

  return isActive ? PRODUCT_WORKFLOW_STATUSES.PUBLISHED : PRODUCT_WORKFLOW_STATUSES.DRAFT;
};

const normalizeNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

export const normalizeProductWorkflow = (
  rawWorkflow: unknown,
  isActive?: boolean,
): ProductWorkflow => {
  const workflow =
    rawWorkflow && typeof rawWorkflow === "object" && !Array.isArray(rawWorkflow)
      ? (rawWorkflow as Record<string, unknown>)
      : {};

  return {
    status: normalizeWorkflowStatus(workflow["status"], isActive),
    submittedAt: normalizeNullableString(workflow["submittedAt"]),
    approvedAt: normalizeNullableString(workflow["approvedAt"]),
    rejectedAt: normalizeNullableString(workflow["rejectedAt"]),
    publishedAt: normalizeNullableString(workflow["publishedAt"]),
    unpublishedAt: normalizeNullableString(workflow["unpublishedAt"]),
    rejectionReason: normalizeNullableString(workflow["rejectionReason"]),
    lastActionAt: normalizeNullableString(workflow["lastActionAt"]),
    lastActionById: normalizeNullableString(workflow["lastActionById"]),
    lastActionByName: normalizeNullableString(workflow["lastActionByName"]),
    lastActionByRole: normalizeNullableString(workflow["lastActionByRole"]),
  };
};

export const ensureProductWorkflow = (
  workflow: ProductWorkflow | null | undefined,
  isActive?: boolean,
): ProductWorkflow => normalizeProductWorkflow(workflow || DEFAULT_WORKFLOW, isActive);

export const isUnpublishedWorkflow = (
  workflow: ProductWorkflow | null | undefined,
): boolean => {
  const resolved = ensureProductWorkflow(workflow);
  return Boolean(resolved.unpublishedAt) && resolved.status !== PRODUCT_WORKFLOW_STATUSES.PUBLISHED;
};

export const getWorkflowStatusLabel = (
  status: ProductWorkflowStatus,
  workflow?: ProductWorkflow | null,
  isEn = false,
): string => {
  if (workflow && isUnpublishedWorkflow(workflow)) {
    return isEn ? "Unpublished" : "ملغي النشر";
  }

  switch (status) {
    case PRODUCT_WORKFLOW_STATUSES.DRAFT:
      return isEn ? "Draft" : "مسودة";
    case PRODUCT_WORKFLOW_STATUSES.IN_REVIEW:
      return isEn ? "In Review" : "قيد المراجعة";
    case PRODUCT_WORKFLOW_STATUSES.APPROVED:
      return isEn ? "Approved" : "معتمد";
    case PRODUCT_WORKFLOW_STATUSES.REJECTED:
      return isEn ? "Rejected" : "مرفوض";
    case PRODUCT_WORKFLOW_STATUSES.PUBLISHED:
      return isEn ? "Published" : "منشور";
    default:
      return isEn ? "Unknown" : "غير معروف";
  }
};

export const getWorkflowStatusColor = (
  status: ProductWorkflowStatus,
  workflow?: ProductWorkflow | null,
): string => {
  if (workflow && isUnpublishedWorkflow(workflow)) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }

  switch (status) {
    case PRODUCT_WORKFLOW_STATUSES.DRAFT:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case PRODUCT_WORKFLOW_STATUSES.IN_REVIEW:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case PRODUCT_WORKFLOW_STATUSES.APPROVED:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case PRODUCT_WORKFLOW_STATUSES.REJECTED:
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    case PRODUCT_WORKFLOW_STATUSES.PUBLISHED:
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
};

export const isPublishedWorkflow = (workflow: ProductWorkflow | null | undefined): boolean =>
  ensureProductWorkflow(workflow).status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED;

export const canSubmitReview = (workflow: ProductWorkflow | null | undefined): boolean => {
  const status = ensureProductWorkflow(workflow).status;
  return (
    status === PRODUCT_WORKFLOW_STATUSES.DRAFT ||
    status === PRODUCT_WORKFLOW_STATUSES.REJECTED
  );
};

export const canApprove = (workflow: ProductWorkflow | null | undefined): boolean =>
  ensureProductWorkflow(workflow).status === PRODUCT_WORKFLOW_STATUSES.IN_REVIEW;

export const canReject = canApprove;

export const canPublish = (workflow: ProductWorkflow | null | undefined): boolean =>
  ensureProductWorkflow(workflow).status === PRODUCT_WORKFLOW_STATUSES.APPROVED;

export const canUnpublish = (workflow: ProductWorkflow | null | undefined): boolean =>
  ensureProductWorkflow(workflow).status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED;

export const canManageProductWorkflowByRole = (
  role: string | null | undefined,
): boolean => PRODUCT_WORKFLOW_MANAGER_ROLES.has(normalizeRole(role));

export const canSubmitProductReviewByRole = (
  role: string | null | undefined,
): boolean => PRODUCT_REVIEW_SUBMITTER_ROLES.has(normalizeRole(role));

export const resolvePrimarySaveWorkflow = (
  workflow: ProductWorkflow | null | undefined,
  {
    isMerchant,
    now = new Date().toISOString(),
  }: {
    isMerchant: boolean;
    now?: string;
  },
): ProductWorkflow => {
  const resolvedWorkflow = ensureProductWorkflow(workflow);

  if (isMerchant) {
    return resolvedWorkflow;
  }

  return {
    ...resolvedWorkflow,
    status: PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
    publishedAt: resolvedWorkflow.publishedAt || now,
    unpublishedAt: null,
    rejectionReason: null,
    lastActionAt: now,
  };
};

export const matchesWorkflowFilter = (
  workflow: ProductWorkflow | null | undefined,
  filterValue: string,
): boolean => {
  if (filterValue === "all") {
    return true;
  }

  const resolved = ensureProductWorkflow(workflow);
  if (filterValue.toLowerCase() === "unpublished") {
    return (
      Boolean(resolved.unpublishedAt) ||
      (resolved.status === PRODUCT_WORKFLOW_STATUSES.APPROVED && !isPublishedWorkflow(workflow))
    );
  }

  return resolved.status.toLowerCase() === filterValue.toLowerCase();
};
