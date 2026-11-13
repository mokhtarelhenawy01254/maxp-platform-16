import type {
  StudioSectionShape,
  StudioLoopSection,
  LoopSourceType,
} from "../StudioTypes";
import {
  resolveDynamicValue,
  resolveDynamicSettings,
  type DynamicContext,
  type DynamicProductContext,
  type DynamicCollectionContext,
  type DynamicStoreContext,
} from "./dynamicValues";

/**
 * Hard cap for loop sections per page to prevent runaway performance degradation.
 */
export const LOOP_MAX_LIMIT = 50;

export interface LoopDataResolverContext {
  products?: Array<DynamicProductContext | Record<string, unknown>>;
  collection?: DynamicCollectionContext | Record<string, unknown>;
  collections?:
    | Array<DynamicCollectionContext | Record<string, unknown>>
    | Record<string | number, Array<DynamicProductContext | Record<string, unknown>>>;
  articles?: Array<Record<string, unknown>>;
  posts?: Array<Record<string, unknown>>;
  blogs?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  store?: DynamicStoreContext;
  currency?: string | null;
  locale?: string | null;
  custom?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoopExpandedResult extends Array<StudioSectionShape> {
  warning?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  totalAvailable?: number;
  appliedLimit?: number;
}

export interface LoopResolution {
  sections: StudioSectionShape[];
  warning?: string;
  isEmpty: boolean;
  emptyMessage: string;
  columns: number;
  source: LoopSourceType;
  total: number;
  limit: number;
}

function extractItemsForSource(
  source: LoopSourceType,
  collectionId: string | number | undefined,
  data: any
): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  if (source === "products") {
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }

  if (source === "collection") {
    if (collectionId !== undefined && collectionId !== null && collectionId !== "") {
      const colKey = String(collectionId);
      if (data.collections && !Array.isArray(data.collections) && Array.isArray(data.collections[colKey])) {
        return data.collections[colKey];
      }
      if (Array.isArray(data.collections)) {
        const match = data.collections.find(
          (c: any) => String(c?.id) === colKey || String(c?.slug) === colKey
        );
        if (match && Array.isArray(match.products)) {
          return match.products;
        }
      }
      if (Array.isArray(data.products)) {
        const filtered = data.products.filter(
          (p: any) =>
            String(p?.collectionId) === colKey ||
            (Array.isArray(p?.collectionIds) && p.collectionIds.map(String).includes(colKey)) ||
            String(p?.category) === colKey
        );
        if (filtered.length > 0) return filtered;
      }
      if (
        data.collection &&
        (String(data.collection.id) === colKey || !data.collection.id) &&
        Array.isArray(data.collection.products)
      ) {
        return data.collection.products;
      }
    }
    if (data.collection && Array.isArray(data.collection.products)) {
      return data.collection.products;
    }
    if (Array.isArray(data.products)) {
      return data.products;
    }
    return [];
  }

  if (source === "articles") {
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data.posts)) return data.posts;
    if (Array.isArray(data.blogs)) return data.blogs;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }

  return [];
}

function cloneAndBindSection(
  node: StudioSectionShape,
  ctx: DynamicContext,
  itemIndex: number,
  subIndex: number,
  baseKey: string
): StudioSectionShape {
  if (!node || typeof node !== "object") return node;

  const keyPrefix = baseKey || "loop";
  const itemKey = `${keyPrefix}-item-${itemIndex}${subIndex > 0 ? `-${subIndex}` : ""}`;

  const boundSettings = node.settings
    ? resolveDynamicSettings(node.settings, ctx)
    : {};

  const cloned: StudioSectionShape = {
    ...node,
    key: node.key ? `${node.key}-item-${itemIndex}` : itemKey,
    settings: boundSettings,
    dynamicContext: ctx,
    _loopMeta: {
      itemIndex,
      subIndex,
    },
  };

  if (typeof node.label === "string" && node.label.includes("{{")) {
    cloned.label = resolveDynamicValue(node.label, ctx);
  }
  if (typeof node.title === "string" && node.title.includes("{{")) {
    cloned.title = resolveDynamicValue(node.title, ctx);
  }

  if (Array.isArray(node.children) && node.children.length > 0) {
    cloned.children = node.children.map((child, cIdx) =>
      cloneAndBindSection(child, ctx, itemIndex, cIdx, itemKey)
    );
  }

  if (cloned.template && typeof cloned.template === "object") {
    if (Array.isArray(cloned.template)) {
      cloned.template = cloned.template.map((tmpl, tIdx) =>
        cloneAndBindSection(tmpl, ctx, itemIndex, tIdx, itemKey)
      );
    } else {
      cloned.template = cloneAndBindSection(
        cloned.template as StudioSectionShape,
        ctx,
        itemIndex,
        0,
        itemKey
      );
    }
  }

  return cloned;
}

/**
 * Resolver expanding a loop section template over a list of items (products, collection, articles).
 * Resolves all dynamic tokens ({{item.*}}, {{product.*}}) using DYN-1 resolveDynamicValue.
 * Enforces a hard cap of 50 items and safely handles empty sources.
 */
export function expandLoopSection(
  section: StudioLoopSection | StudioSectionShape | any,
  data?: LoopDataResolverContext | any[] | any
): LoopExpandedResult {
  const safeSection = section || {};
  const source = (safeSection.source || safeSection.settings?.source || "products") as LoopSourceType;
  const collectionId = safeSection.collectionId ?? safeSection.settings?.collectionId;
  const sectionKey = safeSection.key || safeSection.id || "loop";

  const rawTemplate = safeSection.template ?? safeSection.settings?.template;
  let templates: StudioSectionShape[] = [];
  if (Array.isArray(rawTemplate)) {
    templates = rawTemplate.filter(Boolean);
  } else if (rawTemplate && typeof rawTemplate === "object") {
    templates = [rawTemplate];
  }

  const rawItems = extractItemsForSource(source, collectionId, data);

  const rawLimit = safeSection.limit ?? safeSection.settings?.limit;
  let requestedLimit = LOOP_MAX_LIMIT;
  if (typeof rawLimit === "number" && !Number.isNaN(rawLimit)) {
    requestedLimit = Math.max(0, Math.floor(rawLimit));
  } else if (typeof rawLimit === "string" && !Number.isNaN(Number(rawLimit))) {
    requestedLimit = Math.max(0, Math.floor(Number(rawLimit)));
  }

  let warning: string | undefined;
  if (requestedLimit > LOOP_MAX_LIMIT) {
    warning = `تم تجاوز الحد الأقصى (${LOOP_MAX_LIMIT} عنصراً). تم تحديد العدد بسقف ${LOOP_MAX_LIMIT} عنصراً لحماية الأداء.`;
    console.warn(`[StudioLoop] ${warning} (طلب: ${requestedLimit})`);
  }

  const effectiveLimit = Math.min(requestedLimit, LOOP_MAX_LIMIT);
  const slicedItems = rawItems.slice(0, effectiveLimit);

  if (slicedItems.length === 0) {
    const emptyMsg =
      safeSection.emptyMessage ??
      safeSection.settings?.emptyMessage ??
      "المصدر المحدد لا يحتوي على عناصر لعرضها";
    const emptyResult: LoopExpandedResult = [];
    emptyResult.warning = warning;
    emptyResult.isEmpty = true;
    emptyResult.emptyMessage = emptyMsg;
    emptyResult.totalAvailable = rawItems.length;
    emptyResult.appliedLimit = effectiveLimit;
    return emptyResult;
  }

  const result: LoopExpandedResult = [];
  result.warning = warning;
  result.isEmpty = false;
  result.emptyMessage = "";
  result.totalAvailable = rawItems.length;
  result.appliedLimit = effectiveLimit;

  for (let idx = 0; idx < slicedItems.length; idx++) {
    const item = slicedItems[idx];
    const itemCtx: DynamicContext = {
      product: source === "products" || source === "collection" ? item : (item.product ?? item),
      item: item,
      collection: source === "collection" ? (data?.collection ?? null) : null,
      page: data?.page ?? null,
      store: data?.store ?? null,
      currency: data?.currency || data?.store?.currency || "EGP",
      locale: data?.locale || "ar-EG",
      custom: {
        ...(data?.custom || {}),
        loopIndex: idx,
        itemIndex: idx,
        isFirst: idx === 0,
        isLast: idx === slicedItems.length - 1,
      },
    };

    if (templates.length === 1) {
      result.push(cloneAndBindSection(templates[0], itemCtx, idx, 0, sectionKey));
    } else if (templates.length > 1) {
      result.push({
        type: "container",
        key: `${sectionKey}-item-${idx}`,
        settings: {
          direction: "column",
          gap: 12,
        },
        children: templates.map((tmpl, subIdx) =>
          cloneAndBindSection(tmpl, itemCtx, idx, subIdx, sectionKey)
        ),
        dynamicContext: itemCtx,
      });
    } else {
      result.push({
        type: "heading",
        key: `${sectionKey}-item-${idx}`,
        settings: {
          text:
            resolveDynamicValue("{{item.title}}", itemCtx) ||
            resolveDynamicValue("{{product.title}}", itemCtx) ||
            `عنصر ${idx + 1}`,
          level: "h3",
        },
        dynamicContext: itemCtx,
      });
    }
  }

  return result;
}

/**
 * Structured helper returning the loop resolution status, metadata, and sections.
 */
export function resolveLoopResult(
  section: StudioLoopSection | StudioSectionShape | any,
  data?: LoopDataResolverContext | any
): LoopResolution {
  const sections = expandLoopSection(section, data);
  const source = (section?.source || section?.settings?.source || "products") as LoopSourceType;
  const columns = Number(section?.columns ?? section?.settings?.columns ?? 1) || 1;
  const rawLimit = section?.limit ?? section?.settings?.limit;
  const limit = typeof rawLimit === "number" ? Math.min(rawLimit, LOOP_MAX_LIMIT) : LOOP_MAX_LIMIT;

  return {
    sections,
    warning: sections.warning,
    isEmpty: Boolean(sections.isEmpty),
    emptyMessage: sections.emptyMessage || "",
    columns,
    source,
    total: sections.totalAvailable ?? sections.length,
    limit,
  };
}
