const PRODUCT_WORKFLOW_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
});

const VALID_WORKFLOW_STATUSES = new Set(Object.values(PRODUCT_WORKFLOW_STATUSES));

const { isRecord, parseProductMetadata } = require('./productMetadataUtils');

const normalizeWorkflowStatus = (value, fallback = PRODUCT_WORKFLOW_STATUSES.DRAFT) => {
  const normalized = String(value || '').trim().toUpperCase();
  return VALID_WORKFLOW_STATUSES.has(normalized) ? normalized : fallback;
};

const createActorMetadata = (actor = {}) => {
  const name =
    actor.name ||
    actor.fullName ||
    actor.email ||
    actor.username ||
    null;

  return {
    lastActionById: actor.id || null,
    lastActionByName: name,
    lastActionByRole: actor.role || null,
  };
};

const resolveProductWorkflow = (productLike = {}) => {
  const metadata = parseProductMetadata(productLike.metadata);
  const rawWorkflow = isRecord(metadata.workflow) ? metadata.workflow : {};
  const fallbackStatus = productLike.isActive
    ? PRODUCT_WORKFLOW_STATUSES.PUBLISHED
    : PRODUCT_WORKFLOW_STATUSES.DRAFT;
  const status = normalizeWorkflowStatus(rawWorkflow.status, fallbackStatus);

  return {
    status,
    submittedAt:
      typeof rawWorkflow.submittedAt === 'string' ? rawWorkflow.submittedAt : null,
    approvedAt:
      typeof rawWorkflow.approvedAt === 'string' ? rawWorkflow.approvedAt : null,
    rejectedAt:
      typeof rawWorkflow.rejectedAt === 'string' ? rawWorkflow.rejectedAt : null,
    publishedAt:
      typeof rawWorkflow.publishedAt === 'string' ? rawWorkflow.publishedAt : null,
    unpublishedAt:
      typeof rawWorkflow.unpublishedAt === 'string' ? rawWorkflow.unpublishedAt : null,
    rejectionReason:
      typeof rawWorkflow.rejectionReason === 'string'
        ? rawWorkflow.rejectionReason
        : null,
    lastActionAt:
      typeof rawWorkflow.lastActionAt === 'string' ? rawWorkflow.lastActionAt : null,
    lastActionById:
      typeof rawWorkflow.lastActionById === 'string' ? rawWorkflow.lastActionById : null,
    lastActionByName:
      typeof rawWorkflow.lastActionByName === 'string'
        ? rawWorkflow.lastActionByName
        : null,
    lastActionByRole:
      typeof rawWorkflow.lastActionByRole === 'string'
        ? rawWorkflow.lastActionByRole
        : null,
  };
};

const buildWorkflowTransition = (currentWorkflow, action, actor = {}, options = {}) => {
  const baseWorkflow = resolveProductWorkflow({
    metadata: { workflow: currentWorkflow || {} },
    isActive: currentWorkflow?.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
  });
  const now = new Date().toISOString();
  const actorMetadata = createActorMetadata(actor);

  switch (action) {
    case 'save_draft':
      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.DRAFT,
        rejectionReason: null,
        unpublishedAt:
          baseWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED
            ? now
            : baseWorkflow.unpublishedAt,
        lastActionAt: now,
        ...actorMetadata,
      };
    case 'submit_review':
      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.IN_REVIEW,
        submittedAt: now,
        rejectionReason: null,
        lastActionAt: now,
        ...actorMetadata,
      };
    case 'approve':
      if (baseWorkflow.status !== PRODUCT_WORKFLOW_STATUSES.IN_REVIEW) {
        throw new Error('لا يمكن اعتماد منتج ليس قيد المراجعة');
      }

      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.APPROVED,
        approvedAt: now,
        rejectionReason: null,
        lastActionAt: now,
        ...actorMetadata,
      };
    case 'reject':
      if (baseWorkflow.status !== PRODUCT_WORKFLOW_STATUSES.IN_REVIEW) {
        throw new Error('لا يمكن رفض منتج ليس قيد المراجعة');
      }

      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.REJECTED,
        rejectedAt: now,
        rejectionReason:
          typeof options.rejectionReason === 'string' && options.rejectionReason.trim()
            ? options.rejectionReason.trim()
            : null,
        lastActionAt: now,
        ...actorMetadata,
      };
    case 'publish':
      if (
        baseWorkflow.status !== PRODUCT_WORKFLOW_STATUSES.APPROVED &&
        baseWorkflow.status !== PRODUCT_WORKFLOW_STATUSES.PUBLISHED
      ) {
        throw new Error('يجب اعتماد المنتج أولاً قبل نشره');
      }

      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
        publishedAt: now,
        rejectionReason: null,
        lastActionAt: now,
        ...actorMetadata,
      };
    case 'unpublish':
      if (baseWorkflow.status !== PRODUCT_WORKFLOW_STATUSES.PUBLISHED) {
        throw new Error('لا يمكن إلغاء نشر منتج غير منشور');
      }

      return {
        ...baseWorkflow,
        status: PRODUCT_WORKFLOW_STATUSES.APPROVED,
        unpublishedAt: now,
        lastActionAt: now,
        ...actorMetadata,
      };
    default:
      throw new Error('إجراء workflow غير مدعوم');
  }
};

const withWorkflowMetadata = (metadata, workflow) => ({
  ...parseProductMetadata(metadata),
  workflow: resolveProductWorkflow({
    metadata: { workflow },
    isActive: workflow?.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
  }),
});

const createWorkflowUpdatePayload = ({ metadata, workflow }) => ({
  metadata: JSON.stringify(withWorkflowMetadata(metadata, workflow)),
  isActive: workflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
});

const decorateProductWithWorkflow = (product) => ({
  ...product,
  workflow: resolveProductWorkflow(product),
});

module.exports = {
  PRODUCT_WORKFLOW_STATUSES,
  parseProductMetadata,
  resolveProductWorkflow,
  buildWorkflowTransition,
  withWorkflowMetadata,
  createWorkflowUpdatePayload,
  decorateProductWithWorkflow,
};
