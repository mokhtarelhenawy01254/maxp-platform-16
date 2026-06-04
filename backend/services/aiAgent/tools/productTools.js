/**
 * @module productTools
 * @description Product search, creation, and performance tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
  normalizeOptionalString,
  normalizeStringList,
  uniqueProductSlug,
  buildAgentProductDescription,
  aggregateVariantOptions,
  variantAvailabilityStatus,
  productAvailabilityStatus,
  toPublicUrlList,
} = require('../utils/toolHelpers');
const {
  buildProductSearchWhere,
  scoreProductMatch,
  parseImageList,
  getVariantImageList,
} = require('../utils/productSearchQueryService');
const { searchProducts } = require('../utils/productSemanticSearchService');
const unifiedOrchestrator = require('../utils/UnifiedProductSearchOrchestrator');
const workingMemoryService = require('../workingMemoryService');

function isTrue(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

function mapProductForSearch(product) {
  const variants = Array.isArray(product.productVariants) ? product.productVariants : [];
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
  const variantImages = variants.flatMap(getVariantImageList);

  return {
    name: product.name,
    sku: product.sku,
    price: formatCurrency(product.price),
    comparePrice: product.comparePrice ? formatCurrency(product.comparePrice) : null,
    stock: product.stock,
    status: productAvailabilityStatus(product),
    categoryName: product.category?.name || null,
    featured: Boolean(product.isFeatured),
    images: toPublicUrlList(parseImageList(product.mainImage, product.images, variantImages)).slice(0, 8),
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
  };
}

const TOOLS = {
  'product.search': {
    description: 'Search active catalog products by name or SKU.',
    params: {
      query: 'Search text',
      productName: 'Optional product name when provided by a structured classifier.',
      productNameOrSku: 'Optional product name or SKU when provided by a structured classifier.',
      limit: 'Maximum number of results. Default 5.',
      conversationId: 'Optional conversation ID for memory context.',
      productSize: 'Optional size filter.',
      productColor: 'Optional color filter.',
      referencesPreviousProduct: 'True only when the model-classified turn refers to the previous shown product.',
    },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search text to find products by name or SKU.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum number of results to return.' },
      },
    },
    handler: async (companyId, {
      query,
      productName,
      productNameOrSku,
      limit = 5,
      conversationId,
      productSize,
      productColor,
      referencesPreviousProduct,
    }) => {
      const prisma = getSharedPrismaClient();
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.min(Math.max(parseInt(limit, 10), 1), 20)
        : 5;
      const resolvedQuery = normalizeOptionalString(query)
        || normalizeOptionalString(productName)
        || normalizeOptionalString(productNameOrSku);
      const safeConversationId = normalizeOptionalString(conversationId);
      const usesPreviousProduct = isTrue(referencesPreviousProduct);

      if (!resolvedQuery) {
        if (!usesPreviousProduct) {
          return {
            found: false,
            code: 'MISSING_PRODUCT_QUERY',
            query: null,
            products: [],
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
            query: null,
            products: [],
            needsClarification: true,
          };
        }
      }

      // Use the unified orchestrator for enriched search
      const orchestratorResult = await unifiedOrchestrator.search(companyId, resolvedQuery || '', {
        limit: safeLimit,
        conversationId: safeConversationId || undefined,
        intentSlots: {
          productSize: productSize || undefined,
          productColor: productColor || undefined,
          ...(usesPreviousProduct ? { referencesPreviousProduct: true } : {}),
        },
      });

      const searchResults = orchestratorResult.products;

      if (!searchResults.length) {
        return {
          found: false,
          code: 'PRODUCT_NOT_FOUND',
          query: resolvedQuery || null,
          products: [],
          didYouMean: orchestratorResult.didYouMean || null,
          recoveryUsed: orchestratorResult.recoveryUsed,
        };
      }

      let orderedProducts;
      if (searchResults[0] && (searchResults[0].productVariants || searchResults[0].category)) {
        orderedProducts = searchResults;
      } else {
        const ids = searchResults.map(r => r.id);
        const products = typeof prisma.product.findMany === 'function'
          ? await prisma.product.findMany({
              where: { id: { in: ids } },
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                comparePrice: true,
                stock: true,
                trackInventory: true,
                isActive: true,
                isFeatured: true,
                images: true,
                mainImage: true,
                tags: true,
                category: { select: { name: true } },
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
              },
            })
          : [];

        const productMap = new Map(products.map(p => [p.id, p]));
        orderedProducts = ids.map(id => productMap.get(id)).filter(Boolean);
      }

      return {
        found: true,
        count: orderedProducts.length,
        query: resolvedQuery || null,
        products: orderedProducts.map(mapProductForSearch),
        parsedFilters: orchestratorResult.parsedQuery ? {
          size: orchestratorResult.parsedQuery.size,
          color: orchestratorResult.parsedQuery.color,
          category: orchestratorResult.parsedQuery.category,
        } : null,
        didYouMean: orchestratorResult.didYouMean || null,
        recoveryUsed: orchestratorResult.recoveryUsed,
      };
    },
  },

  'product.create': {
    description: 'Create a new unpublished draft product that requires merchant review.',
    params: {
      name: 'Product name',
      description: 'Merchant-provided product description',
      price: 'Product price',
      sku: 'Optional SKU',
      stock: 'Optional initial stock',
      colors: 'Optional color list',
      sizes: 'Optional size list',
      categoryId: 'Optional category id',
      tags: 'Optional tag list',
    },
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['name', 'price'],
      properties: {
        name: { type: 'string', description: 'Product name.' },
        description: { type: 'string', description: 'Product description.' },
        price: { type: 'number', minimum: 0, description: 'Product price.' },
        sku: { type: 'string', description: 'Optional SKU code.' },
        stock: { type: 'integer', minimum: 0, description: 'Initial stock quantity.' },
        colors: { type: 'array', items: { type: 'string' }, description: 'List of available colors.' },
        sizes: { type: 'array', items: { type: 'string' }, description: 'List of available sizes.' },
        categoryId: { type: 'string', description: 'Category ID to assign.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the product.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const prisma = getSharedPrismaClient();
      const name = normalizeOptionalString(params.name);
      const price = Number(params.price);
      if (!name) throw new Error('PRODUCT_NAME_REQUIRED');
      if (!Number.isFinite(price) || price < 0) throw new Error('PRODUCT_PRICE_INVALID');

      const sku = normalizeOptionalString(params.sku);
      if (sku) {
        const existingSku = await prisma.product.findFirst({
          where: { companyId, sku },
          select: { id: true, name: true },
        });
        if (existingSku) throw new Error(`PRODUCT_SKU_EXISTS:${sku}`);
      }

      const categoryId = normalizeOptionalString(params.categoryId);
      let resolvedCategoryId = null;
      if (categoryId) {
        const category = await prisma.category.findFirst({
          where: { companyId, id: categoryId },
          select: { id: true },
        });
        resolvedCategoryId = category?.id || null;
      }

      const colors = normalizeStringList(params.colors);
      const sizes = normalizeStringList(params.sizes);
      const tags = normalizeStringList(params.tags);
      const stock = Number.isFinite(Number(params.stock)) ? Math.max(0, parseInt(params.stock, 10)) : 0;
      const slug = await uniqueProductSlug(prisma, companyId, params.slug || name);
      const metadata = {
        workflow: {
          status: 'DRAFT',
          source: 'ceo-agent',
          requiresReview: true,
          createdBy: 'product.create',
        },
        agentCreated: true,
        colors,
        sizes,
      };

      const product = await prisma.product.create({
        data: {
          name,
          description: buildAgentProductDescription({
            name,
            description: params.description,
            colors,
            sizes,
          }),
          price,
          sku,
          stock,
          trackInventory: true,
          slug,
          companyId,
          categoryId: resolvedCategoryId,
          isActive: false,
          isFeatured: false,
          isHidden: false,
          source: 'ai_agent',
          tags: tags.length ? JSON.stringify(tags) : null,
          metadata: JSON.stringify(metadata),
          enableCheckoutForm: true,
          showAddToCartButton: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          price: true,
          stock: true,
          isActive: true,
        },
      });

      const variantRows = [
        ...colors.map((color, index) => ({
          productId: product.id,
          name: color,
          type: 'color',
          sku: sku ? `${sku}-C${index + 1}` : null,
          stock,
          trackInventory: true,
          sortOrder: index,
          metadata: JSON.stringify({ source: 'product.create' }),
        })),
        ...sizes.map((size, index) => ({
          productId: product.id,
          name: size,
          type: 'size',
          sku: sku ? `${sku}-S${index + 1}` : null,
          stock,
          trackInventory: true,
          sortOrder: colors.length + index,
          metadata: JSON.stringify({ source: 'product.create' }),
        })),
      ];
      if (variantRows.length > 0) {
        await prisma.productVariant.createMany({ data: variantRows, skipDuplicates: true });
      }

      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: Number(product.price),
        stock: product.stock,
        draft: true,
        published: Boolean(product.isActive),
        colors,
        sizes,
        adminReviewPath: `/admin/products/${product.id}`,
        publicPreviewPath: product.slug ? `/product/${product.slug}` : null,
        message: 'Created as an unpublished draft product that requires merchant review before publishing.',
      };
    },
  },

  'product.lowStock': {
    description: 'List low-stock or out-of-stock active products.',
    params: { threshold: 'Low-stock threshold. Default 5.', limit: 'Maximum number of results. Default 10.' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'integer', minimum: 0, description: 'Stock threshold for low-stock flag.' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Maximum products to return.' },
      },
    },
    handler: async (companyId, { threshold = 5, limit = 10 }) => {
      const prisma = getSharedPrismaClient();
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          trackInventory: true,
          stock: { lte: Number(threshold) },
        },
        orderBy: { stock: 'asc' },
        take: Math.min(Number(limit), 30),
        select: { name: true, sku: true, stock: true, price: true },
      });

      if (!products.length) return { count: 0, products: [], code: 'NO_LOW_STOCK_PRODUCTS' };

      return {
        count: products.length,
        products: products.map(p => ({
          name: p.name,
          sku: p.sku,
          stockRemaining: p.stock,
          price: formatCurrency(p.price),
          status: p.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        })),
      };
    },
  },

  'product.topSelling': {
    description: 'List top-selling products for a time period.',
    params: { period: 'today | week | month', limit: 'Maximum number of results. Default 5.' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period to analyze.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum products to return.' },
      },
    },
    handler: async (companyId, { period = 'month', limit = 5 }) => {
      const prisma = getSharedPrismaClient();
      const dateFilter = periodToRange(period);

      const items = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: { companyId, createdAt: dateFilter, status: { not: 'CANCELLED' } },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: Math.min(Number(limit), 20),
      });

      if (!items.length) return { count: 0, products: [], code: 'NO_SALES_DATA', period };

      return items.map((item, i) => ({
        rank: i + 1,
        productName: item.productName,
        quantitySold: item._sum.quantity,
        revenue: formatCurrency(item._sum.total),
      }));
    },
  },

  'product.updatePrice': {
    description: 'Propose changing a product price.',
    params: {
      productId: 'Product ID',
      originalPrice: 'Current price (for reference)',
      newPrice: 'New price to propose',
    },
    requiredParams: ['productId', 'newPrice'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['productId', 'newPrice'],
      properties: {
        productId: { type: 'string', description: 'The product ID to update.' },
        originalPrice: { type: 'number', description: 'Current price for reference.' },
        newPrice: { type: 'number', minimum: 0, description: 'Proposed new price.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const prisma = getSharedPrismaClient();
      const productId = normalizeOptionalString(params.productId);
      const newPrice = Number(params.newPrice);
      if (!productId) throw new Error('PRODUCT_ID_REQUIRED');
      if (!Number.isFinite(newPrice) || newPrice < 0) throw new Error('PRODUCT_PRICE_INVALID');

      const product = await prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true, name: true, price: true } });
      if (!product) return { found: false, code: 'PRODUCT_NOT_FOUND', productId };

      const draft = await getDraftProposalService().createDraft(companyId, {
        agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
        toolName: 'product.updatePrice',
        params: { productId, originalPrice: Number(product.price), newPrice },
        reasoning: `Agent proposed price change for ${product.name} from ${product.price} to ${newPrice}.`,
        estimatedImpact: `Update price for ${product.name}`,
      });

      if (!draft.success) return draft;
      return { ...draft, draft: true, requiresApproval: true, productId, productName: product.name, originalPrice: Number(product.price), newPrice };
    },
  },
};

module.exports = TOOLS;
