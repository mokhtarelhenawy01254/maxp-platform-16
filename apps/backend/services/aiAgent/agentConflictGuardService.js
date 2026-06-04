/**
 * @module agentConflictGuardService
 * @description Prevents active agent work from creating contradictory pending
 * commands against the same business resource.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');

const ACTIVE_TASK_STATUSES = new Set(['PENDING', 'CHECKED_OUT', 'IN_PROGRESS']);

function normalizePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 120);
}

function stableHash(value) {
  const payload = JSON.stringify(value || {}, Object.keys(value || {}).sort());
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function buildConflictShape({ conflictKey, conflictAction, conflictResource, conflictScope, input }) {
  if (!conflictKey) return null;
  return {
    conflictKey,
    conflictAction: conflictAction || `action:${stableHash(input)}`,
    conflictResource: conflictResource || conflictKey,
    conflictScope: conflictScope || 'business-resource',
  };
}

class AgentConflictGuardService {
  buildToolConflict(toolName, input = {}) {
    switch (toolName) {
      case 'product.create':
        return buildConflictShape({
          conflictKey: input.sku
            ? `product-sku:${normalizePart(input.sku)}`
            : input.name
              ? `product-name:${normalizePart(input.name)}`
              : null,
          conflictAction: `create-product:${stableHash({
            name: input.name,
            sku: input.sku,
            price: input.price,
          })}`,
          conflictResource: input.sku || input.name,
          conflictScope: 'product-create',
          input,
        });
      case 'skill.create':
        return buildConflictShape({
          conflictKey: input.id || input.displayName
            ? `skill:${normalizePart(input.id || input.displayName)}`
            : null,
          conflictAction: `create-skill:${stableHash({
            id: input.id,
            displayName: input.displayName,
            description: input.description,
          })}`,
          conflictResource: input.id || input.displayName,
          conflictScope: 'skill-create',
          input,
        });
      case 'product.updatePrice':
        return buildConflictShape({
          conflictKey: input.productId ? `product:${normalizePart(input.productId)}:price` : null,
          conflictAction: `set-price:${input.newPrice}`,
          conflictResource: input.productId,
          conflictScope: 'product-price',
          input,
        });
      case 'inventory.adjust':
        return buildConflictShape({
          conflictKey: input.productId ? `product:${normalizePart(input.productId)}:inventory` : null,
          conflictAction: `adjust-stock:${input.quantityDelta}`,
          conflictResource: input.productId,
          conflictScope: 'product-inventory',
          input,
        });
      case 'order.cancel':
        return buildConflictShape({
          conflictKey: input.orderId ? `order:${normalizePart(input.orderId)}:lifecycle` : null,
          conflictAction: 'cancel-order',
          conflictResource: input.orderId,
          conflictScope: 'order-lifecycle',
          input,
        });
      case 'order.confirm':
        return buildConflictShape({
          conflictKey: input.orderId ? `order:${normalizePart(input.orderId)}:lifecycle` : null,
          conflictAction: 'confirm-order',
          conflictResource: input.orderId,
          conflictScope: 'order-lifecycle',
          input,
        });
      case 'shipping.update':
        return buildConflictShape({
          conflictKey: input.orderId ? `order:${normalizePart(input.orderId)}:lifecycle` : null,
          conflictAction: `update-shipping:${stableHash({
            shippingClass: input.shippingClass,
            address: input.address,
          })}`,
          conflictResource: input.orderId,
          conflictScope: 'order-lifecycle',
          input,
        });
      case 'order.refund':
        return buildConflictShape({
          conflictKey: input.orderId ? `order:${normalizePart(input.orderId)}:settlement` : null,
          conflictAction: `refund:${input.refundAmount}`,
          conflictResource: input.orderId,
          conflictScope: 'order-settlement',
          input,
        });
      case 'order.create_draft': {
        const customerTarget = input.customerId || input.customerPhone || input.conversationId;
        const productTarget = input.productName || input.productId || input.sku;
        return buildConflictShape({
          conflictKey: customerTarget && productTarget
            ? `order-draft:${normalizePart(customerTarget)}:${normalizePart(productTarget)}:${normalizePart(input.productSize || '')}:${normalizePart(input.productColor || '')}`
            : null,
          conflictAction: `create-order-draft:${stableHash({
            productName: input.productName,
            productPrice: input.productPrice,
            quantity: input.quantity,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            productSize: input.productSize,
            productColor: input.productColor,
          })}`,
          conflictResource: customerTarget || productTarget,
          conflictScope: 'order-create-draft',
          input,
        });
      }
      case 'discount.apply':
        return buildConflictShape({
          conflictKey: input.target ? `discount-target:${normalizePart(input.target)}` : null,
          conflictAction: `discount:${input.discountPercent}`,
          conflictResource: input.target,
          conflictScope: 'discount-target',
          input,
        });
      case 'discount.create_draft':
        return buildConflictShape({
          conflictKey: input.code ? `discount-code:${normalizePart(input.code)}` : null,
          conflictAction: `discount:${input.discountPercent}`,
          conflictResource: input.code,
          conflictScope: 'discount-code',
          input,
        });
      case 'whatsapp.send':
        return buildConflictShape({
          conflictKey: input.conversationId
            ? `conversation:${normalizePart(input.conversationId)}:message`
            : input.recipient
              ? `recipient:${normalizePart(input.recipient)}:message`
              : null,
          conflictAction: `send-message:${stableHash({ message: input.message })}`,
          conflictResource: input.conversationId || input.recipient,
          conflictScope: 'customer-message',
          input,
        });
      default: {
        const target = input.productId || input.orderId || input.customerId || input.conversationId || input.target || input.code;
        return buildConflictShape({
          conflictKey: target ? `${normalizePart(toolName)}:${normalizePart(target)}` : null,
          conflictAction: `${toolName}:${stableHash(input)}`,
          conflictResource: target,
          conflictScope: toolName,
          input,
        });
      }
    }
  }

  buildTaskConflict(task = {}) {
    const metadata = task.metadata || {};
    return buildConflictShape({
      conflictKey: metadata.conflictKey || task.conflictKey,
      conflictAction: metadata.conflictAction || task.conflictAction || stableHash({
        title: task.title,
        description: task.description,
      }),
      conflictResource: metadata.conflictResource || task.conflictResource,
      conflictScope: metadata.conflictScope || task.conflictScope || 'agent-task',
      input: task,
    });
  }

  async findPendingToolConflict(companyId, proposal = {}) {
    if (!companyId || !proposal?.conflictKey) return null;

    const prisma = getSharedPrismaClient();
    const pendingDrafts = await prisma.aiToolApprovalRequest.findMany({
      where: {
        companyId,
        status: 'PENDING',
        sideEffects: 'write',
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const draft of pendingDrafts) {
      const metadata = parseJson(draft.metadata);
      const input = parseJson(draft.inputSnapshot);
      const existing = metadata.conflictKey
        ? {
          conflictKey: metadata.conflictKey,
          conflictAction: metadata.conflictAction,
          conflictResource: metadata.conflictResource,
          conflictScope: metadata.conflictScope,
        }
        : this.buildToolConflict(draft.toolName, input);

      if (existing?.conflictKey === proposal.conflictKey) {
        return {
          draftId: draft.id,
          toolName: draft.toolName,
          conflictKey: proposal.conflictKey,
          conflictScope: proposal.conflictScope,
          conflictResource: proposal.conflictResource,
          existingAction: existing.conflictAction,
          requestedAction: proposal.conflictAction,
        };
      }
    }

    return null;
  }

  canSupersedePendingToolConflict(toolName, conflict = {}) {
    return toolName === 'order.create_draft'
      && conflict?.conflictScope === 'order-create-draft'
      && conflict.existingAction
      && conflict.requestedAction
      && conflict.existingAction !== conflict.requestedAction;
  }

  async supersedePendingToolConflict(companyId, conflict = {}, metadata = {}) {
    if (!companyId || !conflict?.draftId || !this.canSupersedePendingToolConflict('order.create_draft', conflict)) {
      return null;
    }

    const prisma = getSharedPrismaClient();
    const draft = await prisma.aiToolApprovalRequest.findFirst({
      where: {
        id: conflict.draftId,
        companyId,
        status: 'PENDING',
      },
    });
    if (!draft) return null;

    const existingMeta = parseJson(draft.metadata);
    const supersededAt = new Date().toISOString();
    await prisma.aiToolApprovalRequest.update({
      where: { id: draft.id },
      data: {
        status: 'SUPERSEDED',
        reviewedAt: new Date(),
        metadata: JSON.stringify({
          ...existingMeta,
          supersededAt,
          supersededByConflictAction: conflict.requestedAction,
          supersededReason: 'order_draft_revision',
          ...(metadata || {}),
        }),
      },
    });

    return {
      draftId: draft.id,
      supersededAt,
    };
  }

  findActiveTaskConflict(tasks = [], proposal = {}) {
    if (!proposal?.conflictKey) return null;

    for (const task of tasks) {
      if (!ACTIVE_TASK_STATUSES.has(task.status)) continue;
      const existing = this.buildTaskConflict(task);
      if (existing?.conflictKey === proposal.conflictKey) {
        return {
          taskId: task.id,
          status: task.status,
          conflictKey: proposal.conflictKey,
          conflictScope: proposal.conflictScope,
          conflictResource: proposal.conflictResource,
          existingAction: existing.conflictAction,
          requestedAction: proposal.conflictAction,
        };
      }
    }

    return null;
  }

  withConflictMetadata(metadata = {}, conflict = null) {
    if (!conflict) return metadata || {};
    return {
      ...(metadata || {}),
      conflictKey: conflict.conflictKey,
      conflictAction: conflict.conflictAction,
      conflictResource: conflict.conflictResource,
      conflictScope: conflict.conflictScope,
    };
  }
}

module.exports = new AgentConflictGuardService();
module.exports._private = {
  normalizePart,
  stableHash,
  parseJson,
};
