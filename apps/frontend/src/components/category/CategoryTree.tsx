import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Image as ImageIcon,
  Layers,
  Pencil,
  Plus,
  Power,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import { getDirection } from "../../i18n";
import { getImageUrl } from "../../utils/imageUrl";
import type { ManagedCategory } from "./types";
import { buildCategoryTree, type CategoryTreeNode } from "./categoryTreeUtils";

interface CategoryTreeProps {
  categories: ManagedCategory[];
  searchQuery: string;
  statusFilter?: "all" | "active" | "inactive";
  onEdit: (category: ManagedCategory) => void;
  onAddChild: (parent: ManagedCategory) => void;
  onDelete: (category: ManagedCategory) => void;
  onToggleActive?: (category: ManagedCategory) => void;
  onMoveProducts?: (category: ManagedCategory) => void;
}

const matchesQuery = (category: ManagedCategory, query: string): boolean => {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    category.name.toLowerCase().includes(needle) ||
    category.slug.toLowerCase().includes(needle) ||
    (category.description || "").toLowerCase().includes(needle)
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  searchQuery,
  statusFilter = "all",
  onEdit,
  onAddChild,
  onDelete,
  onToggleActive,
  onMoveProducts,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = getDirection();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const searching = searchQuery.trim().length > 0;

  const { visibleIds, ancestorIds } = useMemo(() => {
    if (!searching) {
      return { visibleIds: null as Set<string> | null, ancestorIds: new Set<string>() };
    }

    const byId = new Map<string, ManagedCategory>();
    categories.forEach((category) => byId.set(category.id, category));

    const visible = new Set<string>();
    const ancestors = new Set<string>();

    categories.forEach((category) => {
      if (!matchesQuery(category, searchQuery)) return;
      visible.add(category.id);
      let parentId = category.parentId;
      let guard = 0;
      while (parentId && guard < 100) {
        visible.add(parentId);
        ancestors.add(parentId);
        parentId = byId.get(parentId)?.parentId || null;
        guard += 1;
      }
    });

    return { visibleIds: visible, ancestorIds: ancestors };
  }, [categories, searchQuery, searching]);

  const statusVisibleIds = useMemo(() => {
    if (statusFilter === "all") return null;
    const byId = new Map<string, ManagedCategory>();
    categories.forEach((category) => byId.set(category.id, category));
    const visible = new Set<string>();
    categories.forEach((category) => {
      const matches =
        statusFilter === "active" ? category.isActive : !category.isActive;
      if (!matches) return;
      visible.add(category.id);
      let parentId = category.parentId;
      let guard = 0;
      while (parentId && guard < 100) {
        visible.add(parentId);
        parentId = byId.get(parentId)?.parentId || null;
        guard += 1;
      }
    });
    return visible;
  }, [categories, statusFilter]);

  const isOpen = useCallback(
    (node: CategoryTreeNode): boolean => {
      if (node.children.length === 0) return false;
      if (searching) return true;
      return !collapsedIds.has(node.id);
    },
    [collapsedIds, searching],
  );

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsedIds(new Set()), []);

  const collapseAll = useCallback(() => {
    const ids = new Set<string>();
    const walk = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children.length > 0) ids.add(node.id);
        walk(node.children);
      });
    };
    walk(tree);
    setCollapsedIds(ids);
  }, [tree]);

  const totalNodes = categories.length;
  const rootCount = tree.length;
  const childCount = Math.max(totalNodes - rootCount, 0);

  const renderNode = (node: CategoryTreeNode, depth: number): React.ReactNode => {
    if (visibleIds && !visibleIds.has(node.id)) return null;
    if (statusVisibleIds && !statusVisibleIds.has(node.id)) return null;

    const hasChildren = node.children.length > 0;
    const open = isOpen(node);
    const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
    const productCount = node._count?.products || 0;

    return (
      <div key={node.id} className="border-b border-zinc-100/80 dark:border-zinc-800/60 last:border-b-0">
        <div
          className="group flex items-center gap-2 py-2 pr-2 pl-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
          style={{ paddingInlineStart: 10 + depth * 22 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              aria-label={
                open
                  ? (t("categories.management.tree.collapse") as string)
                  : (t("categories.management.tree.expand") as string)
              }
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <Chevron className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="inline-block h-[22px] w-[22px]" aria-hidden="true" />
          )}

          <div className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
            {node.image ? (
              <img
                src={getImageUrl(node.image, "thumbnail") || ""}
                alt={node.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </div>

          <div className="min-w-0 flex flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {node.name}
              </span>
              {!node.isActive && (
                <span className="shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {t("categories.management.status.inactive")}
                </span>
              )}
              {hasChildren && (
                <span className="shrink-0 rounded-full border border-zinc-200/70 dark:border-zinc-700/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {node.children.length} {t("categories.management.tree.subcategoriesUnit")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <code className="truncate rounded bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400" dir="ltr">
                {node.slug}
              </code>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-500">
                <CornerDownLeft className="h-3 w-3" />
                {productCount} {isEn ? "products" : "منتج"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 opacity-70 sm:opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(node)}
                title={
                  (node.isActive
                    ? t("categories.management.actions.deactivate")
                    : t("categories.management.actions.activate")) as string
                }
                aria-label={
                  (node.isActive
                    ? t("categories.management.actions.deactivate")
                    : t("categories.management.actions.activate")) as string
                }
                className={`p-1.5 rounded-md transition-colors ${
                  node.isActive
                    ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            )}
            {onMoveProducts && (
              <button
                type="button"
                onClick={() => onMoveProducts(node)}
                disabled={productCount === 0}
                title={t("categories.management.actions.moveProducts") as string}
                aria-label={t("categories.management.actions.moveProducts") as string}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onAddChild(node)}
              title={t("categories.management.tree.addChild") as string}
              aria-label={t("categories.management.tree.addChild") as string}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(node)}
              title={t("common.edit") as string}
              aria-label={t("common.edit") as string}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(node)}
              title={t("common.delete") as string}
              aria-label={t("common.delete") as string}
              className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && open && (
          <div
            className="border-s border-zinc-200/70 dark:border-zinc-800/70"
            style={{ marginInlineStart: 21 + depth * 22 }}
          >
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (categories.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/30 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <Layers className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{rootCount}</span>
          <span>{t("categories.management.tree.rootsUnit")}</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="font-mono tabular-nums">{childCount}</span>
          <span>{t("categories.management.tree.subcategoriesUnit")}</span>
          {ancestorIds.size > 0 && searching && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {t("categories.management.tree.searchActive")}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            {t("categories.management.tree.expandAll")}
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            {t("categories.management.tree.collapseAll")}
          </button>
        </div>
      </div>

      <div className="py-1">
        {visibleIds && visibleIds.size === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {t("categories.management.tree.noMatches")}
            </p>
            <p className="text-[11px] text-zinc-400">
              {t("categories.management.tree.noMatchesDesc")}
            </p>
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
};

export default CategoryTree;
