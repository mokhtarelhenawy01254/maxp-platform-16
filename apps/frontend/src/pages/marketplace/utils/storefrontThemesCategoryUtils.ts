import { StorefrontThemeCatalogItem } from "../../../services/storefrontThemeCatalogService";
import {
  ThemeCategoryGroup,
  ThemeSubcategoryGroup,
  MARKETPLACE_CATEGORY_ORDER,
  MARKETPLACE_SUBCATEGORY_ORDER,
  getOrderRank,
  getThemeCategory,
  matchesMarketplaceSearch,
  ThemeFilterType,
} from "../types/storefrontThemesTypes";

export function buildThemeCategoryGroups(
  themes: StorefrontThemeCatalogItem[]
): ThemeCategoryGroup[] {
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      count: number;
      subcategories: Map<string, ThemeSubcategoryGroup>;
    }
  >();

  themes.forEach((theme) => {
    const category = getThemeCategory(theme);
    const primaryId = category.primary.id;
    const secondaryId = category.secondary.id;
    const existingGroup = groups.get(primaryId);

    if (!existingGroup) {
      groups.set(primaryId, {
        id: primaryId,
        label: category.primary.label,
        count: 1,
        subcategories: new Map([
          [
            secondaryId,
            {
              id: secondaryId,
              label: category.secondary.label,
              count: 1,
            },
          ],
        ]),
      });
      return;
    }

    existingGroup.count += 1;
    const existingSubcategory = existingGroup.subcategories.get(secondaryId);

    if (existingSubcategory) {
      existingSubcategory.count += 1;
    } else {
      existingGroup.subcategories.set(secondaryId, {
        id: secondaryId,
        label: category.secondary.label,
        count: 1,
      });
    }
  });

  return [...groups.values()]
    .map((group) => ({
      id: group.id,
      label: group.label,
      count: group.count,
      subcategories: [...group.subcategories.values()].sort((left, right) => {
        const leftRank = getOrderRank(
          left.id,
          MARKETPLACE_SUBCATEGORY_ORDER[group.id] || []
        );
        const rightRank = getOrderRank(
          right.id,
          MARKETPLACE_SUBCATEGORY_ORDER[group.id] || []
        );

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.label.localeCompare(right.label, "ar");
      }),
    }))
    .sort((left, right) => {
      const leftRank = getOrderRank(left.id, MARKETPLACE_CATEGORY_ORDER);
      const rightRank = getOrderRank(right.id, MARKETPLACE_CATEGORY_ORDER);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.label.localeCompare(right.label, "ar");
    });
}

export function filterThemesList({
  themes,
  normalizedSearchQuery,
  deferredSearchQuery,
  filterType,
  selectedPrimaryCategoryId,
  selectedSecondaryCategoryId,
  highlightedThemeId,
}: {
  themes: StorefrontThemeCatalogItem[];
  normalizedSearchQuery: string;
  deferredSearchQuery: string;
  filterType: ThemeFilterType;
  selectedPrimaryCategoryId: string;
  selectedSecondaryCategoryId: string;
  highlightedThemeId: string;
}): StorefrontThemeCatalogItem[] {
  const base = themes.filter((theme) => {
    const category = getThemeCategory(theme);

    if (
      normalizedSearchQuery &&
      !matchesMarketplaceSearch(
        [
          theme.name,
          theme.description,
          theme.slug,
          theme.themeId,
          category.primary.label,
          category.secondary.label,
        ],
        deferredSearchQuery
      )
    ) {
      return false;
    }

    if (filterType === "owned" && !theme.isOwned) return false;
    if (filterType === "free" && theme.pricingModel !== "FREE") return false;
    if (filterType === "paid" && theme.pricingModel !== "ONE_TIME") return false;

    return true;
  });

  const filtered = base.filter((theme) => {
    const category = getThemeCategory(theme);

    if (
      selectedPrimaryCategoryId !== "all" &&
      category.primary.id !== selectedPrimaryCategoryId
    ) {
      return false;
    }

    if (
      selectedSecondaryCategoryId !== "all" &&
      category.secondary.id !== selectedSecondaryCategoryId
    ) {
      return false;
    }

    return true;
  });

  return filtered.sort((left, right) => {
    if (left.themeId === highlightedThemeId) return -1;
    if (right.themeId === highlightedThemeId) return 1;
    if (left.isCurrentTheme !== right.isCurrentTheme) {
      return Number(right.isCurrentTheme) - Number(left.isCurrentTheme);
    }
    if (left.isOwned !== right.isOwned) {
      return Number(right.isOwned) - Number(left.isOwned);
    }
    if (left.isFeatured !== right.isFeatured) {
      return Number(right.isFeatured) - Number(left.isFeatured);
    }
    return left.name.localeCompare(right.name, "ar");
  });
}
