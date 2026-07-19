import { describe, expect, it } from "vitest";

import {
  canManageProductWorkflowByRole,
  canSubmitProductReviewByRole,
  PRODUCT_WORKFLOW_STATUSES,
  resolvePrimarySaveWorkflow,
} from "../workflow";

describe("product workflow role permissions", () => {
  it("keeps submit-review available only for employee-style roles", () => {
    expect(canSubmitProductReviewByRole("AGENT")).toBe(true);
    expect(canSubmitProductReviewByRole("EMPLOYEE")).toBe(true);
    expect(canSubmitProductReviewByRole("COMPANY_ADMIN")).toBe(false);
    expect(canSubmitProductReviewByRole("SUPER_ADMIN")).toBe(false);
    expect(canSubmitProductReviewByRole("OWNER")).toBe(false);
    expect(canSubmitProductReviewByRole("MANAGER")).toBe(false);
  });

  it("keeps approval and publishing actions on workflow manager roles", () => {
    expect(canManageProductWorkflowByRole("OWNER")).toBe(true);
    expect(canManageProductWorkflowByRole("COMPANY_ADMIN")).toBe(true);
    expect(canManageProductWorkflowByRole("SUPER_ADMIN")).toBe(true);
    expect(canManageProductWorkflowByRole("MANAGER")).toBe(true);
    expect(canManageProductWorkflowByRole("AGENT")).toBe(false);
    expect(canManageProductWorkflowByRole("EMPLOYEE")).toBe(false);
  });

  it("publishes new products on the primary save action for non-merchants", () => {
    const workflow = resolvePrimarySaveWorkflow(undefined, {
      isMerchant: false,
      now: "2026-05-14T08:00:00.000Z",
    });

    expect(workflow.status).toBe(PRODUCT_WORKFLOW_STATUSES.PUBLISHED);
    expect(workflow.publishedAt).toBe("2026-05-14T08:00:00.000Z");
    expect(workflow.lastActionAt).toBe("2026-05-14T08:00:00.000Z");
  });

  it("publishes existing draft products on the primary save action", () => {
    const workflow = resolvePrimarySaveWorkflow({
      status: PRODUCT_WORKFLOW_STATUSES.DRAFT,
      publishedAt: null,
      unpublishedAt: null,
      rejectionReason: null,
      lastActionAt: null,
    }, {
      isMerchant: false,
      now: "2026-05-14T08:05:00.000Z",
    });

    expect(workflow.status).toBe(PRODUCT_WORKFLOW_STATUSES.PUBLISHED);
    expect(workflow.publishedAt).toBe("2026-05-14T08:05:00.000Z");
  });

  it("keeps merchant primary saves on their current workflow", () => {
    const merchantWorkflow = resolvePrimarySaveWorkflow(undefined, {
      isMerchant: true,
    });

    expect(merchantWorkflow.status).toBe(PRODUCT_WORKFLOW_STATUSES.DRAFT);
  });
});
