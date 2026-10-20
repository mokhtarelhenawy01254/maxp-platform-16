import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  RefreshCw,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Tag,
  FolderTree,
  ListTree,
  Table2,
  Power,
  ArrowRightLeft,
} from "lucide-react";
import { getDirection } from "../../i18n";
import { apiClient } from "../../services/apiClient";
import { getImageUrl } from "../../utils/imageUrl";
import type { AxiosError } from "axios";
import { CategoryFormModal } from "../../components/category/CategoryFormModal";
import MoveProductsModal from "../../components/category/MoveProductsModal";
import CategoryTree from "../../components/category/CategoryTree";
import type { ManagedCategory } from "../../components/category/types";

type Category = ManagedCategory;

const getApiErrorMessage = (error: unknown): string | null => {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return axiosError.response?.data?.error || axiosError.response?.data?.message || null;
};

const Categories: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "tree">("list");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [movingCategory, setMovingCategory] = useState<Category | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const isEn = i18n.language?.startsWith("en");

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Category[];
      }>("/products/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        setError(t("categories.management.form.errors.fetchFailed"));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(t("categories.management.form.errors.fetchFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const dir = getDirection();
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", i18n.language);
  }, [i18n.language]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCategories = categories
    .filter((cat) => {
      if (statusFilter === "active") return cat.isActive;
      if (statusFilter === "inactive") return !cat.isActive;
      return true;
    })
    .filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description &&
          cat.description.toLowerCase().includes(searchQuery.toLowerCase())),
    );

  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const childrenCountById = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((category) => {
      if (!category.parentId) return;
      map.set(category.parentId, (map.get(category.parentId) || 0) + 1);
    });
    return map;
  }, [categories]);

  const countLabel =
    categories.length === 0
      ? t("categories.management.count.none")
      : categories.length === 1
        ? t("categories.management.count.one")
        : categories.length === 2
          ? t("categories.management.count.two")
          : categories.length <= 10
            ? t("categories.management.count.few", { count: categories.length })
            : t("categories.management.count.many", { count: categories.length });

  const handleOpenModal = (category: Category | null = null, parentId: string | null = null) => {
    setEditingCategory(category);
    setDefaultParentId(parentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setDefaultParentId(null);
  };

  const handleSaved = () => {
    fetchCategories();
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const formData = new FormData();
      formData.append("isActive", String(!category.isActive));
      await apiClient.put(`/products/categories/${category.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchCategories();
    } catch (err) {
      console.error("Error toggling category:", err);
      alert(
        getApiErrorMessage(err) ||
          (t("categories.management.form.errors.actionFailed") as string),
      );
    }
  };

  const handleDelete = async (category: Category) => {
    const productCount = category._count?.products || 0;
    if (productCount > 0) {
      alert(
        `${t("categories.management.delete.hasProducts")}\n${t(
          "categories.management.delete.moveFirst",
        )}`,
      );
      return;
    }

    const childCount = childrenCountById.get(category.id) || 0;
    if (childCount > 0) {
      alert(
        `${t("categories.management.delete.hasSubcategories")}\n${t(
          "categories.management.delete.reparentFirst",
        )}`,
      );
      return;
    }

    if (window.confirm(t("categories.management.delete.confirm"))) {
      try {
        await apiClient.delete(`/products/categories/${category.id}`);
        fetchCategories();
      } catch (err) {
        console.error("Error deleting category:", err);
        alert(
          getApiErrorMessage(err) ||
            (t("categories.management.form.errors.actionFailed") as string),
        );
      }
    }
  };

  const tabButtonClass = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
      isActive
        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-2xs"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    }`;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10" dir={getDirection()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("categories.management.title")}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700">
              <FolderTree className="h-3 w-3 text-zinc-400" />
              {countLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("categories.management.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-2xs shadow-black/10 active:scale-[0.97] transition-all duration-150"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t("categories.management.addCategory")}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-1 w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={tabButtonClass(activeTab === "list")}
          aria-pressed={activeTab === "list"}
        >
          <Table2 className="h-3.5 w-3.5" />
          {t("categories.management.tabs.list")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tree")}
          className={tabButtonClass(activeTab === "tree")}
          aria-pressed={activeTab === "tree"}
        >
          <ListTree className="h-3.5 w-3.5" />
          {t("categories.management.tabs.tree")}
        </button>
      </div>

      {/* Search & Action Strip */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className={`h-4 w-4 absolute ${
                isEn ? "left-3" : "right-3"
              } top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none`}
            />
            <input
              type="text"
              aria-label={t("categories.management.searchPlaceholder") as string}
              placeholder={t("categories.management.searchPlaceholder") as string}
              value={searchQuery}
              onChange={handleSearch}
              className={`w-full ${
                isEn ? "pl-9 pr-14" : "pr-9 pl-14"
              } py-2 text-xs sm:text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs`}
            />
            <div
              className={`absolute ${
                isEn ? "right-2.5" : "left-2.5"
              } top-1/2 -translate-y-1/2 flex items-center gap-1`}
            >
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="مسح البحث"
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchCategories}
            disabled={isLoading}
            title={t("common.refresh") as string}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-[0.94] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {(
            [
              { key: "all", label: t("categories.management.filter.all") },
              { key: "active", label: t("categories.management.filter.active") },
              { key: "inactive", label: t("categories.management.filter.inactive") },
            ] as const
          ).map((chip) => {
            const isActiveChip = statusFilter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusFilter(chip.key)}
                aria-pressed={isActiveChip}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  isActiveChip
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs font-medium">{t("common.loading")}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-rose-500 space-y-2">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchCategories}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 active:scale-[0.97] transition-all"
            >
              {t("common.refresh")}
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3 border border-zinc-200/60 dark:border-zinc-700">
              <Tag className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {t("categories.management.noCategories")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              {t("categories.management.noCategoriesDesc")}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 active:scale-[0.97] transition-all"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{t("categories.management.addCategory")}</span>
              </button>
            )}
          </div>
        ) : activeTab === "tree" ? (
          <CategoryTree
            categories={categories}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onEdit={(category) => handleOpenModal(category)}
            onAddChild={(parent) => handleOpenModal(null, parent.id)}
            onDelete={(category) => handleDelete(category)}
            onToggleActive={(category) => handleToggleActive(category)}
            onMoveProducts={(category) => setMovingCategory(category)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50/75 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5 w-14 text-center">
                    {t("categories.management.table.image", "صورة")}
                  </th>
                  <th className="py-2.5 px-3.5">{t("categories.management.table.name")}</th>
                  <th className="py-2.5 px-3.5">{t("categories.management.table.parent")}</th>
                  <th className="py-2.5 px-3.5">{t("categories.management.table.slug")}</th>
                  <th className="py-2.5 px-3.5 text-center">{t("categories.management.table.sortOrder")}</th>
                  <th className="py-2.5 px-3.5">{t("categories.management.table.status")}</th>
                  <th className="py-2.5 px-3.5">{t("categories.management.table.products")}</th>
                  <th className="py-2.5 px-3.5 text-center w-24">
                    {t("categories.management.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="h-9 w-9 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center mx-auto shadow-2xs">
                        {cat.image ? (
                          <img
                            src={getImageUrl(cat.image, "thumbnail") || ""}
                            alt={cat.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                          {cat.name}
                        </span>
                        {cat.description && (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1 max-w-md">
                            {cat.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      {cat.parentId && parentNameById.get(cat.parentId) ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          {parentNameById.get(cat.parentId)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          {t("categories.management.table.rootCategory")}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 font-mono text-[11px]">
                      <code
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60"
                        dir="ltr"
                      >
                        {cat.slug}
                      </code>
                    </td>

                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                      {cat.sortOrder ?? 0}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          cat.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            cat.isActive ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        {cat.isActive
                          ? t("categories.management.status.active")
                          : t("categories.management.status.inactive")}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 font-mono tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{cat._count?.products || 0}</span>
                      <span className="text-[10px] text-zinc-400 font-sans mr-1">
                        {t("categories.management.table.productsUnit")}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          title={
                            (cat.isActive
                              ? t("categories.management.actions.deactivate")
                              : t("categories.management.actions.activate")) as string
                          }
                          aria-label={
                            (cat.isActive
                              ? t("categories.management.actions.deactivate")
                              : t("categories.management.actions.activate")) as string
                          }
                          className={`p-1.5 rounded-md transition-all active:scale-[0.94] ${
                            cat.isActive
                              ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovingCategory(cat)}
                          disabled={(cat._count?.products || 0) === 0}
                          title={t("categories.management.actions.moveProducts") as string}
                          aria-label={t("categories.management.actions.moveProducts") as string}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.94] transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(null, cat.id)}
                          title={t("categories.management.tree.addChild") as string}
                          aria-label={t("categories.management.tree.addChild") as string}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.94] transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(cat)}
                          title={t("common.edit") as string}
                          aria-label={t("common.edit") as string}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.94] transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          title={t("common.delete") as string}
                          aria-label={t("common.delete") as string}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.94] transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <CategoryFormModal
        open={isModalOpen}
        editingCategory={editingCategory}
        categories={categories}
        defaultParentId={defaultParentId}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />

      <MoveProductsModal
        open={Boolean(movingCategory)}
        sourceCategory={movingCategory}
        categories={categories}
        onClose={() => setMovingCategory(null)}
        onMoved={handleSaved}
      />
    </div>
  );
};

export default Categories;
