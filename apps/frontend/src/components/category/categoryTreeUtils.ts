import type { ManagedCategory } from "./types";

export interface CategoryTreeNode extends ManagedCategory {
  children: CategoryTreeNode[];
}

const compareNodes = (a: CategoryTreeNode, b: CategoryTreeNode): number => {
  const first = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
  const second = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
  if (first !== second) return first - second;
  return a.name.localeCompare(b.name, "ar");
};

/**
 * يبني شجرة الفئات: أي فئة أبوها مش موجود (اتحذف أو من شركة تانية)
 * بتتعامل كفئة رئيسية بدل ما تختفي من الشجرة.
 */
export const buildCategoryTree = (
  categories: ManagedCategory[],
): CategoryTreeNode[] => {
  const nodes = new Map<string, CategoryTreeNode>();

  categories.forEach((category) => {
    nodes.set(category.id, { ...category, children: [] });
  });

  const roots: CategoryTreeNode[] = [];
  const visited = new Set<string>();

  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // حماية من أي داتا دائرية قديمة في قاعدة البيانات
  const detachCycles = (list: CategoryTreeNode[]): boolean => {
    let changed = false;
    list.forEach((node) => {
      if (visited.has(node.id)) {
        node.children = [];
        changed = true;
        return;
      }
      visited.add(node.id);
      if (detachCycles(node.children)) changed = true;
    });
    return changed;
  };

  detachCycles(roots);

  const orphans = nodes.size - visited.size;
  if (orphans > 0) {
    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        node.children = [];
        roots.push(node);
        visited.add(node.id);
      }
    });
  }

  roots.sort(compareNodes);
  nodes.forEach((node) => node.children.sort(compareNodes));

  return roots;
};

/** كل الفئات الفرعية (وأحفادها) لفئة معينة — تُستخدم لمنع اختيارها كأب */
export const collectDescendantIds = (
  categories: ManagedCategory[],
  categoryId: string,
): Set<string> => {
  const byParent = new Map<string, ManagedCategory[]>();

  categories.forEach((category) => {
    if (!category.parentId) return;
    const list = byParent.get(category.parentId) || [];
    list.push(category);
    byParent.set(category.parentId, list);
  });

  const result = new Set<string>();
  const stack = [...(byParent.get(categoryId) || [])];

  while (stack.length > 0) {
    const current = stack.pop() as ManagedCategory;
    if (result.has(current.id)) continue;
    result.add(current.id);
    stack.push(...(byParent.get(current.id) || []));
  }

  return result;
};

export interface ParentOption {
  id: string;
  label: string;
  depth: number;
}

/** قائمة مسطحة لعناصر <select> مع مسافات حسب العمق */
export const buildParentOptions = (
  categories: ManagedCategory[],
  excludedIds: Set<string> = new Set(),
): ParentOption[] => {
  const tree = buildCategoryTree(categories);
  const options: ParentOption[] = [];

  const walk = (nodes: CategoryTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      if (!excludedIds.has(node.id)) {
        options.push({ id: node.id, label: node.name, depth });
      }
      walk(node.children, depth + 1);
    });
  };

  walk(tree, 0);

  return options;
};
