import {
  SectionNode,
  ContainerSettings,
  DEFAULT_CONTAINER_SETTINGS,
  StudioDeviceMode,
} from "../../studio/StudioTypes";

/**
 * Checks if a given section node is a container
 */
export function isContainerNode(node: unknown): node is SectionNode & { type: "container" } {
  return Boolean(
    node &&
      typeof node === "object" &&
      (node as Record<string, unknown>).type === "container"
  );
}

/**
 * Normalizes a single section entry into a canonical SectionNode.
 * Backward compatible: handles strings or existing section config objects.
 */
export function normalizeSectionNode(
  node: string | SectionNode | Record<string, unknown>,
  index: number,
  parentKey?: string
): SectionNode {
  if (typeof node === "string") {
    const key = parentKey ? `${parentKey}-${node}-${index}` : `${node}-${index}`;
    return {
      type: node,
      key,
    };
  }

  const rawKey =
    typeof node.key === "string" && node.key
      ? node.key
      : typeof node.id === "string" && node.id
      ? node.id
      : parentKey
      ? `${parentKey}-${node.type || "section"}-${index}`
      : `${node.type || "section"}-${index}`;

  const isContainer = node.type === "container";
  const defaultSettings = isContainer ? { ...DEFAULT_CONTAINER_SETTINGS } : {};
  const settings = {
    ...defaultSettings,
    ...((node.settings as Record<string, unknown>) || {}),
  };

  const rawChildren = Array.isArray(node.children) ? node.children : isContainer ? [] : undefined;
  const children = rawChildren
    ? rawChildren.map((child, childIdx) =>
        normalizeSectionNode(child as SectionNode, childIdx, rawKey)
      )
    : undefined;

  return {
    ...node,
    type: String(node.type || "section"),
    key: rawKey,
    settings,
    ...(children !== undefined ? { children } : {}),
  };
}

/**
 * Deeply normalizes a list of section nodes into a full tree
 */
export function normalizeSectionTree(
  nodes: Array<string | SectionNode | Record<string, unknown>>
): SectionNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n, idx) => normalizeSectionNode(n, idx));
}

/**
 * Recursively finds a node by its unique key
 */
export function findNodeByKey(nodes: SectionNode[], key: string): SectionNode | null {
  if (!Array.isArray(nodes) || !key) return null;
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export interface NodeAndParentResult {
  node: SectionNode;
  parent: SectionNode | null;
  index: number;
  siblings: SectionNode[];
}

/**
 * Finds a node, its parent node, its index, and its sibling list
 */
export function findNodeAndParent(
  nodes: SectionNode[],
  key: string,
  parent: SectionNode | null = null
): NodeAndParentResult | null {
  if (!Array.isArray(nodes) || !key) return null;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.key === key) {
      return {
        node,
        parent,
        index: i,
        siblings: nodes,
      };
    }
    if (node.children && node.children.length > 0) {
      const res = findNodeAndParent(node.children, key, node);
      if (res) return res;
    }
  }

  return null;
}

/**
 * Recursively updates a node in the tree matching the given key
 */
export function updateNodeInTree(
  nodes: SectionNode[],
  key: string,
  updater: (node: SectionNode) => SectionNode
): SectionNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node) => {
    if (node.key === key) {
      return updater(node);
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, key, updater),
      };
    }
    return node;
  });
}

/**
 * Recursively removes a node from the tree by key.
 * When a container is removed, it is deleted along with its children.
 */
export function removeNodeFromTree(nodes: SectionNode[], key: string): SectionNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((node) => node.key !== key)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: removeNodeFromTree(node.children, key),
        };
      }
      return node;
    });
}

/**
 * Inserts a node into the tree at the specified parent (null for root) and index
 */
export function insertNodeInTree(
  nodes: SectionNode[],
  targetParentKey: string | null,
  nodeToInsert: SectionNode,
  insertIndex?: number
): SectionNode[] {
  if (!Array.isArray(nodes)) return [nodeToInsert];

  if (!targetParentKey) {
    const next = [...nodes];
    if (typeof insertIndex === "number" && insertIndex >= 0 && insertIndex <= next.length) {
      next.splice(insertIndex, 0, nodeToInsert);
    } else {
      next.push(nodeToInsert);
    }
    return next;
  }

  return nodes.map((node) => {
    if (node.key === targetParentKey) {
      const currentChildren = Array.isArray(node.children) ? [...node.children] : [];
      if (
        typeof insertIndex === "number" &&
        insertIndex >= 0 &&
        insertIndex <= currentChildren.length
      ) {
        currentChildren.splice(insertIndex, 0, nodeToInsert);
      } else {
        currentChildren.push(nodeToInsert);
      }
      return {
        ...node,
        children: currentChildren,
      };
    }

    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: insertNodeInTree(node.children, targetParentKey, nodeToInsert, insertIndex),
      };
    }

    return node;
  });
}

/**
 * Moves a node from its current position to another parent and index
 */
export function moveNodeInTree(
  nodes: SectionNode[],
  sourceKey: string,
  targetParentKey: string | null,
  targetIndex?: number
): SectionNode[] {
  const found = findNodeByKey(nodes, sourceKey);
  if (!found) return nodes;

  // Prevent moving a container inside itself or its descendants
  if (targetParentKey) {
    if (targetParentKey === sourceKey) return nodes;
    const targetParent = findNodeByKey(nodes, targetParentKey);
    if (!targetParent) return nodes;
    // Check if targetParent is inside sourceKey
    if (isDescendantOf(nodes, targetParentKey, sourceKey)) return nodes;
  }

  // Remove first
  const withoutSource = removeNodeFromTree(nodes, sourceKey);
  // Insert at target
  return insertNodeInTree(withoutSource, targetParentKey, found, targetIndex);
}

/**
 * Checks if targetKey is a descendant of ancestorKey
 */
export function isDescendantOf(
  nodes: SectionNode[],
  targetKey: string,
  ancestorKey: string
): boolean {
  const ancestor = findNodeByKey(nodes, ancestorKey);
  if (!ancestor || !ancestor.children) return false;
  return Boolean(findNodeByKey(ancestor.children, targetKey));
}

/**
 * Reorders children of a parent (or root if parentKey is null)
 */
export function reorderNodeChildren(
  nodes: SectionNode[],
  parentKey: string | null,
  fromIndex: number,
  toIndex: number
): SectionNode[] {
  if (!parentKey) {
    if (fromIndex < 0 || fromIndex >= nodes.length || toIndex < 0 || toIndex >= nodes.length) {
      return nodes;
    }
    const next = [...nodes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  return updateNodeInTree(nodes, parentKey, (parent) => {
    const children = Array.isArray(parent.children) ? [...parent.children] : [];
    if (
      fromIndex < 0 ||
      fromIndex >= children.length ||
      toIndex < 0 ||
      toIndex >= children.length
    ) {
      return parent;
    }
    const [moved] = children.splice(fromIndex, 1);
    children.splice(toIndex, 0, moved);
    return {
      ...parent,
      children,
    };
  });
}

export interface FlattenedSectionNode {
  node: SectionNode;
  depth: number;
  parentKey?: string;
  index: number;
}

/**
 * Flattens a section tree into a linear list with depth and parent tracking
 */
export function flattenSectionTree(
  nodes: SectionNode[],
  depth = 0,
  parentKey?: string
): FlattenedSectionNode[] {
  if (!Array.isArray(nodes)) return [];
  const result: FlattenedSectionNode[] = [];

  nodes.forEach((node, idx) => {
    result.push({
      node,
      depth,
      parentKey,
      index: idx,
    });
    if (node.children && node.children.length > 0) {
      result.push(...flattenSectionTree(node.children, depth + 1, node.key));
    }
  });

  return result;
}

/**
 * Collects all keys from a section tree in depth-first order
 */
export function getAllSectionKeys(nodes: Array<string | SectionNode>): string[] {
  if (!Array.isArray(nodes)) return [];
  const normalized = normalizeSectionTree(nodes);
  return flattenSectionTree(normalized).map((item) => item.node.key as string);
}

/**
 * Resolves effective container settings for a given device mode ("desktop" | "tablet" | "mobile").
 * Implements the responsive cascade: desktop -> tablet -> mobile.
 */
export function resolveContainerSettings(
  settings?: ContainerSettings | Record<string, unknown> | null,
  deviceMode: StudioDeviceMode | "desktop" | "tablet" | "mobile" = "desktop"
): ContainerSettings {
  if (!settings) {
    return { ...DEFAULT_CONTAINER_SETTINGS };
  }

  const base: ContainerSettings = {
    direction: (settings.direction as any) || DEFAULT_CONTAINER_SETTINGS.direction || "column",
    gap: typeof settings.gap === "number" ? settings.gap : (DEFAULT_CONTAINER_SETTINGS.gap ?? 12),
    columns: typeof settings.columns === "number" ? settings.columns : (DEFAULT_CONTAINER_SETTINGS.columns ?? 1),
    align: (settings.align as any) || DEFAULT_CONTAINER_SETTINGS.align || "stretch",
    wrap: typeof settings.wrap === "boolean" ? settings.wrap : Boolean(DEFAULT_CONTAINER_SETTINGS.wrap),
    paddingTop: settings.paddingTop,
    paddingBottom: settings.paddingBottom,
    paddingLeft: settings.paddingLeft,
    paddingRight: settings.paddingRight,
    responsive: settings.responsive as any,
  };

  const responsive = settings.responsive as ContainerSettings["responsive"];
  if (!responsive || typeof responsive !== "object") {
    return base;
  }

  // Tablet override cascade
  if (deviceMode === "tablet" || deviceMode === "mobile") {
    const tablet = responsive.tablet;
    if (tablet && typeof tablet === "object") {
      if (tablet.direction !== undefined) base.direction = tablet.direction;
      if (tablet.columns !== undefined) base.columns = tablet.columns;
      if (tablet.gap !== undefined) base.gap = tablet.gap;
      if (tablet.align !== undefined) base.align = tablet.align;
      if (tablet.wrap !== undefined) base.wrap = tablet.wrap;
      if (tablet.paddingTop !== undefined) base.paddingTop = tablet.paddingTop;
      if (tablet.paddingBottom !== undefined) base.paddingBottom = tablet.paddingBottom;
      if (tablet.paddingLeft !== undefined) base.paddingLeft = tablet.paddingLeft;
      if (tablet.paddingRight !== undefined) base.paddingRight = tablet.paddingRight;
    }
  }

  // Mobile override cascade (highest precedence)
  if (deviceMode === "mobile") {
    const mobile = responsive.mobile;
    if (mobile && typeof mobile === "object") {
      if (mobile.direction !== undefined) base.direction = mobile.direction;
      if (mobile.columns !== undefined) base.columns = mobile.columns;
      if (mobile.gap !== undefined) base.gap = mobile.gap;
      if (mobile.align !== undefined) base.align = mobile.align;
      if (mobile.wrap !== undefined) base.wrap = mobile.wrap;
      if (mobile.paddingTop !== undefined) base.paddingTop = mobile.paddingTop;
      if (mobile.paddingBottom !== undefined) base.paddingBottom = mobile.paddingBottom;
      if (mobile.paddingLeft !== undefined) base.paddingLeft = mobile.paddingLeft;
      if (mobile.paddingRight !== undefined) base.paddingRight = mobile.paddingRight;
    }
  }

  return base;
}
