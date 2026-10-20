import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  Baby,
  Bike,
  BookOpen,
  Boxes,
  Brush,
  Car,
  ChevronDown,
  Coffee,
  Dumbbell,
  Footprints,
  Gem,
  Glasses,
  Heart,
  Layers,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Trash2,
  Utensils,
  Watch,
  Wrench,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getDirection } from "../../i18n";
import { getImageUrl } from "../../utils/imageUrl";
import type { ManagedCategory } from "./types";
import { buildCategoryTree, type CategoryTreeNode } from "./categoryTreeUtils";

interface CategoryFlowTreeProps {
  categories: ManagedCategory[];
  searchQuery: string;
  statusFilter?: "all" | "active" | "inactive";
  onEdit: (category: ManagedCategory) => void;
  onAddChild: (parent: ManagedCategory) => void;
  onDelete: (category: ManagedCategory) => void;
  onToggleActive?: (category: ManagedCategory) => void;
  onMoveProducts?: (category: ManagedCategory) => void;
}

const NODE_W = 240;
const NODE_H = 108;
const H_GAP = 22;
const V_GAP = 62;
const PAD = 24;

const PALETTE = [
  { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.55)", solid: "#10b981" },
  { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.55)", solid: "#f97316" },
  { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.55)", solid: "#6366f1" },
  { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.55)", solid: "#f43f5e" },
  { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.55)", solid: "#0ea5e9" },
  { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.55)", solid: "#a855f7" },
  { bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.55)", solid: "#14b8a6" },
  { bg: "rgba(234,179,8,0.14)", border: "rgba(234,179,8,0.55)", solid: "#eab308" },
];

const paletteAt = (depth: number) =>
  PALETTE[Math.abs(depth) % PALETTE.length] ?? {
    bg: "rgba(120,120,120,0.12)",
    border: "rgba(120,120,120,0.5)",
    solid: "#71717a",
  };

const ICON_RULES: Array<{ keys: string[]; Icon: React.ComponentType<{ className?: string }> }> = [
  { keys: ["ملابس", "تيشيرت", "قميص", "شورت", "بنطلون", "فستان", "عبايه", "عباية", "clothes", "shirt"], Icon: Shirt },
  { keys: ["حذاء", "احذية", "أحذية", "جزمة", "شوز", "shoe", "sneaker"], Icon: Footprints },
  { keys: ["ساع", "watch"], Icon: Watch },
  { keys: ["رياض", "جيم", "sport", "gym", "fitness"], Icon: Dumbbell },
  { keys: ["اكسسوار", "إكسسوار", "مجوهرات", "خاتم", "سلسلة", "accessor", "jewel"], Icon: Gem },
  { keys: ["موبايل", "هاتف", "جوال", "phone", "mobile"], Icon: Smartphone },
  { keys: ["مفروش", "كنب", "أثاث", "اثاث", "sofa", "furniture"], Icon: Sofa },
  { keys: ["عطر", "مكياج", "تجميل", "عناية", "beauty", "cosmetic", "perfume"], Icon: Sparkles },
  { keys: ["نظار", "glasses", "eyewear"], Icon: Glasses },
  { keys: ["أطفال", "اطفال", "بيبي", "baby", "kids"], Icon: Baby },
  { keys: ["دراج", "عجلة", "bike", "cycle"], Icon: Bike },
  { keys: ["سيار", "car", "auto"], Icon: Car },
  { keys: ["كتاب", "قرطاس", "book", "stationery"], Icon: BookOpen },
  { keys: ["أدوات", "ادوات", "tool", "hardware"], Icon: Wrench },
  { keys: ["قهوة", "كافيه", "مشروب", "coffee", "cafe", "drink"], Icon: Coffee },
  { keys: ["مطبخ", "طعام", "أكل", "اكل", "food", "kitchen"], Icon: Utensils },
  { keys: ["شعر", "حلاق", "hair", "salon"], Icon: Scissors },
  { keys: ["فرش", "دهان", "paint", "brush"], Icon: Brush },
  { keys: ["صح", "صحة", "دواء", "health", "pharma"], Icon: Heart },
  { keys: ["بكبك", "حقيبة", "شنطة", "bag"], Icon: ShoppingBag },
  { keys: ["نسيج", "قماش", "شريط", "textile", "fabric"], Icon: Boxes },
];

const pickIcon = (name: string) => {
  const value = (name || "").toLowerCase();
  const match = ICON_RULES.find((rule) =>
    rule.keys.some((key) => value.includes(key.toLowerCase())),
  );
  return match ? match.Icon : Tag;
};

const buildConnector = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius = 12,
): string => {
  const midY = (y1 + y2) / 2;
  const dir = x2 > x1 ? 1 : -1;
  const r = Math.min(radius, Math.abs(x2 - x1) / 2, Math.abs(midY - y1));
  if (Math.abs(x2 - x1) < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${midY - r}`,
    `Q ${x1} ${midY} ${x1 + dir * r} ${midY}`,
    `L ${x2 - dir * r} ${midY}`,
    `Q ${x2} ${midY} ${x2} ${midY + r}`,
    `L ${x2} ${y2}`,
  ].join(" ");
};

const CategoryFlowTree: React.FC<CategoryFlowTreeProps> = ({
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
  const [zoomOverride, setZoomOverride] = useState<number | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fullTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const searching = searchQuery.trim().length > 0;

  const visibleTree = useMemo(() => {
    if (!searching && statusFilter === "all") return fullTree;
    const needle = searchQuery.trim().toLowerCase();

    const matches = (node: CategoryTreeNode): boolean => {
      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? node.isActive
            : !node.isActive;
      if (!statusOk) return false;
      if (!needle) return true;
      return (
        node.name.toLowerCase().includes(needle) ||
        node.slug.toLowerCase().includes(needle) ||
        (node.description || "").toLowerCase().includes(needle)
      );
    };

    const prune = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
      const result: CategoryTreeNode[] = [];
      nodes.forEach((node) => {
        const kids = prune(node.children);
        if (matches(node) || kids.length > 0) {
          result.push({ ...node, children: kids });
        }
      });
      return result;
    };

    return prune(fullTree);
  }, [fullTree, searching, searchQuery, statusFilter]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    walk(fullTree);
    setCollapsedIds(ids);
  }, [fullTree]);

  const layout = useMemo(() => {
    const isCollapsed = (node: CategoryTreeNode) =>
      !searching && collapsedIds.has(node.id);

    const widthOf = (node: CategoryTreeNode): number => {
      if (node.children.length === 0 || isCollapsed(node)) return NODE_W;
      const childrenWidth = node.children.reduce(
        (sum, child, index) => sum + widthOf(child) + (index > 0 ? H_GAP : 0),
        0,
      );
      return Math.max(NODE_W, childrenWidth);
    };

    interface Placed {
      node: CategoryTreeNode;
      x: number;
      y: number;
      depth: number;
      width: number;
    }
    const placed: Placed[] = [];

    const place = (node: CategoryTreeNode, left: number, depth: number) => {
      const width = widthOf(node);
      placed.push({
        node,
        x: left + width / 2 - NODE_W / 2,
        y: depth * (NODE_H + V_GAP),
        depth,
        width: NODE_W,
      });
      if (node.children.length === 0 || isCollapsed(node)) return;
      let cursor = left;
      node.children.forEach((child, index) => {
        const childWidth = widthOf(child);
        place(child, cursor, depth + 1);
        cursor += childWidth + (index < node.children.length - 1 ? H_GAP : 0);
      });
    };

    const totalWidth =
      visibleTree.reduce(
        (sum, node, index) => sum + widthOf(node) + (index > 0 ? H_GAP * 2 : 0),
        0,
      ) || NODE_W;

    let cursor = 0;
    visibleTree.forEach((node, index) => {
      const width = widthOf(node);
      place(node, cursor, 0);
      cursor += width + (index < visibleTree.length - 1 ? H_GAP * 2 : 0);
    });

    const maxDepth = placed.reduce((max, item) => Math.max(max, item.depth), 0);

    const nodes = placed.map((item) => ({
      ...item,
      x: dir === "rtl" ? totalWidth - item.x - NODE_W : item.x,
    }));

    const edges: Array<{ id: string; d: string; color: string }> = [];
    const byId = new Map(nodes.map((item) => [item.node.id, item]));
    nodes.forEach((item) => {
      item.node.children.forEach((child) => {
        const childPlaced = byId.get(child.id);
        if (!childPlaced) return;
        edges.push({
          id: `${item.node.id}->${child.id}`,
          d: buildConnector(
            item.x + NODE_W / 2,
            item.y + NODE_H,
            childPlaced.x + NODE_W / 2,
            childPlaced.y,
          ),
          color: paletteAt(item.depth).solid,
        });
      });
    });

    return {
      nodes,
      edges,
      width: totalWidth,
      height: (maxDepth + 1) * NODE_H + maxDepth * V_GAP,
    };
  }, [visibleTree, collapsedIds, searching, dir]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const compute = () => {
      const available = element.clientWidth - 8;
      const needed = layout.width + PAD * 2;
      if (needed <= 0 || available <= 0) return;
      setFitScale(Math.min(1, Math.max(0.6, available / needed)));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout.width]);

  const scale = zoomOverride ?? fitScale;

  const totalProducts = categories.reduce(
    (sum, category) => sum + (category._count?.products || 0),
    0,
  );

  if (categories.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/30 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <Layers className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{categories.length}</span>
          <span>{t("categories.management.flow.categoriesUnit")}</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="font-mono tabular-nums">{totalProducts}</span>
          <span>{isEn ? "products" : "منتج"}</span>
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
          <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomOverride(Math.min(1.4, Number((scale + 0.1).toFixed(2))))}
            aria-label={t("categories.management.flow.zoomIn") as string}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomOverride(Math.max(0.3, Number((scale - 0.1).toFixed(2))))}
            aria-label={t("categories.management.flow.zoomOut") as string}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomOverride(null)}
            aria-label={t("categories.management.flow.zoomReset") as string}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {layout.nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-14 text-center">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {t("categories.management.tree.noMatches")}
          </p>
          <p className="text-[11px] text-zinc-400">
            {t("categories.management.tree.noMatchesDesc")}
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(120,120,120,0.16)_1px,transparent_0)] [background-size:22px_22px]"
        >
          <div
            style={{
              width: (layout.width + PAD * 2) * scale,
              height: (layout.height + PAD * 2) * scale,
              position: "relative",
            }}
          >
          <div
            style={{
              width: layout.width + PAD * 2,
              height: layout.height + PAD * 2,
              position: "absolute",
              top: 0,
              ...(dir === "rtl" ? { right: 0 } : { left: 0 }),
              transform: `scale(${scale})`,
              transformOrigin: dir === "rtl" ? "top right" : "top left",
            }}
          >
            <svg
              width={layout.width + PAD * 2}
              height={layout.height + PAD * 2}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              {layout.edges.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.d}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  transform={`translate(${PAD}, ${PAD})`}
                  opacity={1}
                />
              ))}
            </svg>

            {layout.nodes.map(({ node, x, y, depth }) => {
              const palette = paletteAt(depth);
              const Icon = pickIcon(node.name);
              const hasChildren = node.children.length > 0;
              const isCollapsed = collapsedIds.has(node.id) && !searching;
              const productCount = node._count?.products || 0;

              return (
                <div
                  key={node.id}
                  className="group"
                  style={{
                    position: "absolute",
                    top: y + PAD,
                    left: x + PAD,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(node)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onEdit(node);
                      }
                    }}
                    className="flex h-full w-full cursor-pointer flex-col justify-between rounded-2xl border-2 p-2.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      background: palette.bg,
                      borderColor: node.isActive ? palette.border : "rgba(148,163,184,0.6)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
                        style={{
                          borderColor: palette.border,
                          background: "rgba(255,255,255,0.55)",
                          color: palette.solid,
                        }}
                      >
                        {node.image ? (
                          <img
                            src={getImageUrl(node.image, "thumbnail") || ""}
                            alt={node.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Icon className="h-[18px] w-[18px]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-50">
                            {node.name}
                          </span>
                          {!node.isActive && (
                            <span className="shrink-0 rounded-full bg-zinc-200/80 px-1.5 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                              {t("categories.management.status.inactive")}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono" dir="ltr">
                            {node.slug}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-600">|</span>
                          <span className="font-mono tabular-nums">
                            {productCount} {isEn ? "products" : "منتج"}
                          </span>
                          {hasChildren && (
                            <>
                              <span className="text-zinc-300 dark:text-zinc-600">|</span>
                              <span className="font-mono tabular-nums">
                                {node.children.length}{" "}
                                {t("categories.management.tree.subcategoriesUnit")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAddChild(node);
                          }}
                          title={t("categories.management.tree.addChild") as string}
                          aria-label={t("categories.management.tree.addChild") as string}
                          className="rounded-md bg-white/70 p-1 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900/60 dark:text-zinc-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(node);
                          }}
                          title={t("common.edit") as string}
                          aria-label={t("common.edit") as string}
                          className="rounded-md bg-white/70 p-1 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900/60 dark:text-zinc-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {onToggleActive && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleActive(node);
                            }}
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
                            className="rounded-md bg-white/70 p-1 text-emerald-600 hover:bg-white dark:bg-zinc-900/60"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onMoveProducts && (
                          <button
                            type="button"
                            disabled={productCount === 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onMoveProducts(node);
                            }}
                            title={t("categories.management.actions.moveProducts") as string}
                            aria-label={t("categories.management.actions.moveProducts") as string}
                            className="rounded-md bg-white/70 p-1 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 dark:bg-zinc-900/60 dark:text-zinc-300"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(node);
                          }}
                          title={t("common.delete") as string}
                          aria-label={t("common.delete") as string}
                          className="rounded-md bg-white/70 p-1 text-zinc-500 hover:text-rose-600 dark:bg-zinc-900/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleCollapse(node.id);
                          }}
                          aria-label={
                            (isCollapsed
                              ? t("categories.management.tree.expand")
                              : t("categories.management.tree.collapse")) as string
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-white dark:bg-zinc-900/60 dark:text-zinc-300"
                        >
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              isCollapsed ? "-rotate-90" : ""
                            }`}
                          />
                          {isCollapsed
                            ? t("categories.management.flow.show")
                            : t("categories.management.flow.hide")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryFlowTree;
