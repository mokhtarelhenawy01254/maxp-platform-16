import { useState, useMemo, useDeferredValue } from "react";
import { useSearchParams } from "react-router-dom";
import { resolveStorefrontThemeId } from "../../../storefront/themes";
import {
  ThemeFilterType,
  ThemeCategoryGroup,
} from "../types/storefrontThemesTypes";

export function useStorefrontThemesFilters({
  categoryGroups,
}: {
  categoryGroups: ThemeCategoryGroup[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawHighlightedThemeId = searchParams.get("theme")?.trim() || "";
  const highlightedThemeId =
    resolveStorefrontThemeId(rawHighlightedThemeId) || rawHighlightedThemeId;
  const rawSelectedPrimaryCategoryId =
    searchParams.get("category")?.trim() || "all";
  const rawSelectedSecondaryCategoryId =
    searchParams.get("subcategory")?.trim() || "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ThemeFilterType>("all");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [customCategories, setCustomCategories] = useState<ThemeCategoryGroup[]>(() => {
    try {
      const raw = window.localStorage.getItem("storefront-themes-custom-categories");
      return raw ? (JSON.parse(raw) as ThemeCategoryGroup[]) : [];
    } catch {
      return [];
    }
  });

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const displayCategoryGroups = useMemo<ThemeCategoryGroup[]>(() => {
    const existingIds = new Set(categoryGroups.map((group) => group.id));
    const customGroups = customCategories.filter(
      (group) => !existingIds.has(group.id)
    );
    return [...categoryGroups, ...customGroups];
  }, [categoryGroups, customCategories]);

  const selectedPrimaryCategoryId =
    rawSelectedPrimaryCategoryId === "all" ||
    displayCategoryGroups.some((group) => group.id === rawSelectedPrimaryCategoryId)
      ? rawSelectedPrimaryCategoryId
      : "all";

  const selectedPrimaryCategory = useMemo(
    () =>
      displayCategoryGroups.find((group) => group.id === selectedPrimaryCategoryId) ||
      null,
    [displayCategoryGroups, selectedPrimaryCategoryId]
  );

  const selectedSecondaryCategoryId =
    rawSelectedSecondaryCategoryId === "all" ||
    selectedPrimaryCategory?.subcategories.some(
      (subcategory) => subcategory.id === rawSelectedSecondaryCategoryId
    )
      ? rawSelectedSecondaryCategoryId
      : "all";

  const selectedSecondaryCategory = useMemo(
    () =>
      selectedPrimaryCategory?.subcategories.find(
        (subcategory) => subcategory.id === selectedSecondaryCategoryId
      ) || null,
    [selectedPrimaryCategory, selectedSecondaryCategoryId]
  );

  const updateCategorySearchParams = (
    primaryCategoryId: string,
    secondaryCategoryId: string,
    options?: { replace?: boolean }
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (primaryCategoryId === "all") {
      nextSearchParams.delete("category");
    } else {
      nextSearchParams.set("category", primaryCategoryId);
    }

    if (secondaryCategoryId === "all") {
      nextSearchParams.delete("subcategory");
    } else {
      nextSearchParams.set("subcategory", secondaryCategoryId);
    }

    setSearchParams(nextSearchParams, { replace: options?.replace ?? false });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    updateCategorySearchParams("all", "all");
  };

  const handlePrimaryCategorySelect = (categoryId: string) => {
    updateCategorySearchParams(categoryId, "all");
  };

  const handleSecondaryCategorySelect = (
    primaryCategoryId: string,
    secondaryCategoryId: string
  ) => {
    updateCategorySearchParams(primaryCategoryId, secondaryCategoryId);
  };

  const handleAddCategory = () => {
    const label = newCategoryName.trim();
    if (!label) {
      return;
    }

    const next = [
      ...customCategories,
      {
        id: `custom-${Date.now()}`,
        label,
        count: 0,
        subcategories: [],
      },
    ];
    setCustomCategories(next);
    try {
      window.localStorage.setItem(
        "storefront-themes-custom-categories",
        JSON.stringify(next)
      );
    } catch {
      // localStorage unavailable
    }
    setNewCategoryName("");
    setAddingCategory(false);
    updateCategorySearchParams(next[next.length - 1].id, "all");
  };

  const handleRemoveCategory = (categoryId: string) => {
    const next = customCategories.filter((group) => group.id !== categoryId);
    setCustomCategories(next);
    try {
      window.localStorage.setItem(
        "storefront-themes-custom-categories",
        JSON.stringify(next)
      );
    } catch {
      // ignore
    }
    if (selectedPrimaryCategoryId === categoryId) {
      updateCategorySearchParams("all", "all");
    }
  };

  return {
    searchParams,
    setSearchParams,
    highlightedThemeId,
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    filterType,
    setFilterType,
    addingCategory,
    setAddingCategory,
    newCategoryName,
    setNewCategoryName,
    displayCategoryGroups,
    selectedPrimaryCategoryId,
    selectedPrimaryCategory,
    selectedSecondaryCategoryId,
    selectedSecondaryCategory,
    clearAllFilters,
    handlePrimaryCategorySelect,
    handleSecondaryCategorySelect,
    handleAddCategory,
    handleRemoveCategory,
  };
}
