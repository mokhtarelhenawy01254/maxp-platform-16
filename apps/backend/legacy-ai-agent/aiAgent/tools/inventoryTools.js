/**
 * @module inventoryTools
 * @description Real-time inventory and availability validation tools.
 */

const {
  getSharedPrismaClient,
  normalizeOptionalString,
  formatCurrency,
  aggregateVariantOptions,
  variantMatchesConstraint,
  variantAvailabilityStatus,
  productAvailabilityStatus,
  toPublicUrlList,
} = require('../utils/toolHelpers');
const {
  getVariantImageList,
  parseImageList,
} = require('../utils/productSearchQueryService');
const unifiedOrchestrator = require('../utils/UnifiedProductSearchOrchestrator');
const workingMemoryService = require('../workingMemoryService');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

function isTrue(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

async function inventoryCheckHandler(companyId, {
  productNameOrSku,
  productName,
  query: rawQuery,
  productSize,
  productColor,
  conversationId,
  referencesPreviousProduct,
  useVector,
}) {
  /** Check product inventory and validate requested size or color against active variants.
   * @param {string} productNameOrSku - Product name or SKU to check inventory for.
   * @param {string} [productName] - Optional product name when provided by a structured classifier.
   * @param {string} [query] - Optional product search text when provided by a structured classifier.
   * @param {string} [productSize] - Optional requested size.
   * @param {string} [productColor] - Optional requested color.
   * @param {string} [conversationId] - Optional conversation ID for memory context.
   * @param {boolean} [referencesPreviousProduct] - True only when the model-classified turn refers to the previous shown product.
   * @param {boolean} [useVector] - Enable semantic/vector search fallback.
   */
  const prisma = getSharedPrismaClient();
  const query = normalizeOptionalString(productNameOrSku)
    || normalizeOptionalString(productName)
    || normalizeOptionalString(rawQuery);
  const safeConversationId = normalizeOptionalString(conversationId);
  const usesPreviousProduct = isTrue(referencesPreviousProduct);

  if (!query) {
    if (!usesPreviousProduct) {
      return {
        found: false,
        code: 'MISSING_PRODUCT_NAME',
        productNameOrSku: null,
        needsClarification: true,
      };
    }

    const memoryContext = safeConversationId
      ? await workingMemoryService.getContext(companyId, safeConversationId).catch(() => null)
      : null;
    if (!memoryContext?.lastShownProductIds?.length) {
      return {
        found: false,
        code: 'PREVIOUS_PRODUCT_CONTEXT_MISSING',
        productNameOrSku: null,
        needsClarification: true,
      };
    }
  }
  const productSelect = {
    id: true,
    name: true,
    sku: true,
    price: true,
    comparePrice: true,
    stock: true,
    trackInventory: true,
    images: true,
    mainImage: true,
    tags: true,
    productVariants: {
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        name: true,
        type: true,
        sku: true,
        images: true,
        stock: true,
        trackInventory: true,
        isActive: true,
        metadata: true,
      },
    },
  };

  const orchestratorResult = await unifiedOrchestrator.search(companyId, query || '', {
    limit: 1,
    conversationId: safeConversationId || undefined,
    disableEmbeddings: useVector === false,
    skipRecovery: useVector === false,
    intentSlots: {
      productSize: productSize || undefined,
      productColor: productColor || undefined,
      ...(usesPreviousProduct ? { referencesPreviousProduct: true } : {}),
    },
  });

  const searchResults = orchestratorResult.products;
  const topSearchResult = searchResults[0] || null;
  const product = searchResults.length > 0
    ? (typeof prisma.product.findUnique === 'function'
        ? await prisma.product.findUnique({
            where: { id: topSearchResult.id },
            select: productSelect,
          })
        : (typeof prisma.product.findFirst === 'function'
            ? await prisma.product.findFirst({
                where: { id: topSearchResult.id },
                select: productSelect,
              })
            : topSearchResult))
    : null;

  if (!product) {
    return {
      found: false,
      code: 'PRODUCT_NOT_FOUND',
      productNameOrSku: query || null,
    };
  }

  const requestedSize = normalizeOptionalString(productSize);
  const requestedColor = normalizeOptionalString(productColor);
  const variants = Array.isArray(product.productVariants) ? product.productVariants : [];
  const variantImages = variants.flatMap(getVariantImageList);
  const sizeVariants = aggregateVariantOptions(variants, 'size', [
    'size',
    'Size',
    '\u0645\u0642\u0627\u0633',
    '\u0627\u0644\u0645\u0642\u0627\u0633',
  ]);
  const colorVariants = aggregateVariantOptions(variants, 'color', [
    'color',
    'Color',
    '\u0644\u0648\u0646',
    '\u0627\u0644\u0644\u0648\u0646',
  ]);
  const matchedSizeVariant = requestedSize
    ? sizeVariants.find(variant => variantMatchesConstraint(variant, requestedSize))
    : null;
  const matchedColorVariant = requestedColor
    ? colorVariants.find(variant => variantMatchesConstraint(variant, requestedColor))
    : null;
  const missingConstraints = [
    requestedSize && !matchedSizeVariant ? { type: 'SIZE', requestedValue: requestedSize, status: 'NOT_FOUND' } : null,
    requestedColor && !matchedColorVariant ? { type: 'COLOR', requestedValue: requestedColor, status: 'NOT_FOUND' } : null,
  ].filter(Boolean);
  const constraintStatuses = [
    matchedSizeVariant ? {
      type: 'SIZE',
      value: matchedSizeVariant.name,
      status: variantAvailabilityStatus(matchedSizeVariant),
      stock: matchedSizeVariant.stock,
    } : null,
    matchedColorVariant ? {
      type: 'COLOR',
      value: matchedColorVariant.name,
      status: variantAvailabilityStatus(matchedColorVariant),
      stock: matchedColorVariant.stock,
    } : null,
  ].filter(Boolean);
  const anyMatchedConstraintUnavailable = [matchedSizeVariant, matchedColorVariant]
    .filter(Boolean)
    .some(variant => variant.trackInventory !== false && Number(variant.stock || 0) <= 0);
  const hasRequestedConstraint = Boolean(requestedSize || requestedColor);
  const constraintAvailable = hasRequestedConstraint
    ? missingConstraints.length === 0 && !anyMatchedConstraintUnavailable
    : null;

  return {
    found: true,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    price: formatCurrency(product.price),
    comparePrice: product.comparePrice ? formatCurrency(product.comparePrice) : null,
    stock: product.stock,
    trackInventory: product.trackInventory,
    images: toPublicUrlList(parseImageList(product.mainImage, product.images, variantImages)).slice(0, 8),
    status: productAvailabilityStatus(product),
    availableSizes: sizeVariants.map(variant => ({
      value: variant.name,
      sku: variant.sku,
      stock: variant.stock,
      status: variantAvailabilityStatus(variant),
    })),
    availableColors: colorVariants.map(variant => ({
      value: variant.name,
      sku: variant.sku,
      stock: variant.stock,
      status: variantAvailabilityStatus(variant),
    })),
    ...(requestedSize ? { requestedSize } : {}),
    ...(requestedColor ? { requestedColor } : {}),
    ...(hasRequestedConstraint ? {
      constraintAvailable,
      constraintDetails: {
        matched: constraintStatuses,
        missing: missingConstraints,
      },
    } : {}),
  };
}

async function inventoryAdjustHandler(companyId, params = {}) {
  /** Propose adjusting inventory quantity.
   * @param {string} productId - Product ID.
   * @param {integer} quantityDelta - Quantity change (positive to add, negative to remove).
   * @param {string} [reason] - Reason for adjustment.
   */
  const prisma = getSharedPrismaClient();
  const productId = normalizeOptionalString(params.productId);
  const quantityDelta = Number(params.quantityDelta);
  const reason = normalizeOptionalString(params.reason);
  if (!productId) throw new Error('PRODUCT_ID_REQUIRED');
  if (!Number.isFinite(quantityDelta)) throw new Error('QUANTITY_DELTA_INVALID');

  const product = await prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true, name: true, stock: true } });
  if (!product) return { found: false, code: 'PRODUCT_NOT_FOUND', productId };

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'inventory.adjust',
    params: { productId, quantityDelta, reason },
    reasoning: `Agent proposed inventory adjustment for ${product.name}: ${quantityDelta > 0 ? '+' : ''}${quantityDelta} units.`,
    estimatedImpact: `Adjust inventory for ${product.name} by ${quantityDelta} units`,
  });

  if (!draft.success) return draft;
  return { ...draft, draft: true, requiresApproval: true, productId, productName: product.name, currentStock: product.stock, proposedDelta: quantityDelta };
}

const TOOLS = {
  'inventory.check': createToolFromFunction('inventory.check', inventoryCheckHandler, {
    description: 'Check product inventory and validate requested size or color against active variants.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'inventory.adjust': createToolFromFunction('inventory.adjust', inventoryAdjustHandler, {
    description: 'Propose adjusting inventory quantity.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['productId', 'quantityDelta'],
  }),
};

module.exports = TOOLS;
