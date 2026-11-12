import type { Category } from '../hooks/useCategories';
import type { StorefrontTheme } from '../types/theme.types';

export interface MarketplaceDepartmentItem {
  label: string;
  to: string;
  slug: string;
  image?: string;
}

export interface MarketplaceDepartment {
  id?: string;
  label: string;
  to: string;
  slug: string;
  image?: string;
  items: MarketplaceDepartmentItem[];
}

export interface MarketplaceCircularItem {
  label: string;
  to: string;
  slug: string;
  image: string;
  active: boolean;
}

export const MARKETPLACE_CATEGORY_IMAGES: Record<string, string> = {
  // Beauty & Care
  'beauty-care': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  'hair-dryers': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  'hair': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
  'shavers': 'https://images.unsplash.com/photo-1508380702597-707c1b00695c?auto=format&fit=crop&w=400&q=80',
  'skincare': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
  'makeup': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=400&q=80',
  'perfumes': 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80',
  // Tools & Home Improvement
  'tools-improvement': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  'power-tools': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  'hand-tools': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=400&q=80',
  'lighting': 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=400&q=80',
  'plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
  'industrial-scientific': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
  // Electronics
  'electronics': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  'mobiles': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  'laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80',
  'televisions': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80',
  'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
  'smart-watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
  'tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80',
  'computer-accessories': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80',
  'printers': 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=400&q=80',
  // Appliances
  'appliances': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=400&q=80',
  'washing-machines': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
  'refrigerators': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=400&q=80',
  'air-conditioners': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80',
  'vacuum-cleaners': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=400&q=80',
  'microwaves': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=400&q=80',
  'water-heaters': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
  // Home & Kitchen
  'home-kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  'blenders': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=400&q=80',
  'cookware': 'https://images.unsplash.com/photo-1584990347449-3972a953716a?auto=format&fit=crop&w=400&q=80',
  'pressure-cookers': 'https://images.unsplash.com/photo-1584990347449-3972a953716a?auto=format&fit=crop&w=400&q=80',
  'coffee-makers': 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?auto=format&fit=crop&w=400&q=80',
  'kitchen-tools': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  'dinnerware': 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80',
  'storage-organization': 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=400&q=80',
  'bedding': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80',
  'cleaning-supplies': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=400&q=80',
  // Health & Home
  'health-home': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  'supplements': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  'medical-devices': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
  // Sports
  'sports': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  'fitness-equipment': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  'sports-gear': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
  // Garden
  'garden': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80',
  'garden-tools': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80',
  'planters': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=400&q=80',
  'outdoor-furniture': 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=400&q=80',
};

export const getMarketplaceCategoryImage = (
  tokenOrSlug: string,
  dbCategories?: Category[],
): string => {
  const clean = String(tokenOrSlug || '').toLowerCase().trim();
  if (Array.isArray(dbCategories) && dbCategories.length > 0) {
    const dbMatch = dbCategories.find(
      (cat) =>
        cat.slug?.toLowerCase() === clean ||
        cat.id?.toLowerCase() === clean ||
        cat.name?.toLowerCase() === clean ||
        cat.nameEn?.toLowerCase() === clean,
    );
    if (dbMatch?.image && dbMatch.image.trim()) {
      return dbMatch.image.trim();
    }
  }
  for (const [key, url] of Object.entries(MARKETPLACE_CATEGORY_IMAGES)) {
    if (clean.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80';
};

export const getCategoryParamFromUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  try {
    const queryPart = url.includes('?') ? url.split('?')[1] : url;
    return new URLSearchParams(queryPart || '').get('category') || '';
  } catch {
    return '';
  }
};

export const isCategoryUrlMatch = (
  url?: string,
  activeCat?: string | null,
  dbCategories?: Category[],
): boolean => {
  if (!activeCat || !url) return false;
  const activeLower = activeCat.toLowerCase().trim();
  const param = getCategoryParamFromUrl(url).toLowerCase().trim();
  if (param && param === activeLower) return true;

  // Match if activeCat is a DB category ID and url param is its slug (or vice versa)
  if (Array.isArray(dbCategories) && dbCategories.length > 0 && param) {
    const matchedCat = dbCategories.find(
      (c) => c.id?.toLowerCase() === activeLower || c.slug?.toLowerCase() === activeLower,
    );
    if (matchedCat) {
      if (
        matchedCat.slug?.toLowerCase() === param ||
        matchedCat.id?.toLowerCase() === param
      ) {
        return true;
      }
    }
  }

  return url.toLowerCase().includes(`category=${activeLower}`);
};

export const isMarketplaceAvenueTheme = (themeId?: string | null): boolean =>
  themeId === 'marketplace-avenue' ||
  themeId === 'marketplace-avenue-ar' ||
  Boolean(themeId?.startsWith('marketplace-avenue'));

export const resolveMarketplaceDepartments = (
  theme: StorefrontTheme | undefined,
  dbCategories: Category[] = [],
  isRtl = true,
): MarketplaceDepartment[] => {
  const themeDropdowns = (theme?.header?.dropdowns || []) as Array<{
    label?: string;
    to?: string;
    items?: Array<{ label?: string; to?: string }>;
  }>;

  const findDbCategoryBySlug = (slugOrUrl: string): Category | undefined => {
    const param = getCategoryParamFromUrl(slugOrUrl) || slugOrUrl;
    const clean = param.toLowerCase().trim();
    if (!clean) return undefined;
    return dbCategories.find(
      (c) => c.slug?.toLowerCase() === clean || c.id?.toLowerCase() === clean,
    );
  };

  if (themeDropdowns.length > 0) {
    return themeDropdowns
      .filter((d) => Boolean(d?.label))
      .map((d) => {
        const items = (d.items || []).filter(
          (it): it is { label: string; to: string } => Boolean(it?.label && it?.to),
        );
        const safeTo = d.to || items[0]?.to || '/shop';
        const slug = getCategoryParamFromUrl(safeTo) || d.label || '';
        const matchedDbParent = findDbCategoryBySlug(safeTo);

        // If theme dropdown has items, enrich with DB image; if items empty, pull children from DB
        let resolvedItems: MarketplaceDepartmentItem[] = items.map((it) => {
          const itemSlug = getCategoryParamFromUrl(it.to) || it.label;
          const dbChild = findDbCategoryBySlug(it.to);
          return {
            label: it.label,
            to: it.to,
            slug: itemSlug,
            image: dbChild?.image || undefined,
          };
        });

        if (resolvedItems.length === 0 && matchedDbParent) {
          resolvedItems = dbCategories
            .filter((c) => c.parentId === matchedDbParent.id)
            .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
            .map((child) => ({
              label: isRtl ? child.name : child.nameEn || child.name,
              to: `/shop?category=${child.slug}`,
              slug: child.slug,
              image: child.image,
            }));
        }

        return {
          id: matchedDbParent?.id,
          label: d.label || '',
          to: safeTo,
          slug,
          image: matchedDbParent?.image,
          items: resolvedItems,
        };
      });
  }

  // Fallback: synthesize departments cleanly from hierarchical DB categories
  if (dbCategories.length > 0) {
    const parents = dbCategories
      .filter((c) => !c.parentId && c.slug !== 'other')
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

    const roots = parents.length > 0 ? parents : dbCategories.slice(0, 8);
    return roots.map((parent) => {
      const children = dbCategories
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

      return {
        id: parent.id,
        label: isRtl ? parent.name : parent.nameEn || parent.name,
        to: `/shop?category=${parent.slug}`,
        slug: parent.slug,
        image: parent.image,
        items: children.map((child) => ({
          label: isRtl ? child.name : child.nameEn || child.name,
          to: `/shop?category=${child.slug}`,
          slug: child.slug,
          image: child.image,
        })),
      };
    });
  }

  return [];
};

export const findActiveMarketplaceContext = (
  departments: MarketplaceDepartment[],
  activeCategoryParam: string | null,
  dbCategories: Category[] = [],
  isRtl = true,
) => {
  const matchedDepartment = activeCategoryParam
    ? departments.find((d) => {
        if (isCategoryUrlMatch(d.to, activeCategoryParam, dbCategories)) return true;
        return d.items.some((it) => isCategoryUrlMatch(it.to, activeCategoryParam, dbCategories));
      })
    : undefined;

  const activeSubcategory =
    matchedDepartment && activeCategoryParam
      ? matchedDepartment.items.find((it) =>
          isCategoryUrlMatch(it.to, activeCategoryParam, dbCategories),
        )
      : undefined;

  const dbFallbackCategory = activeCategoryParam
    ? dbCategories.find(
        (c) =>
          c.slug?.toLowerCase() === activeCategoryParam.toLowerCase() ||
          c.id?.toLowerCase() === activeCategoryParam.toLowerCase(),
      )
    : undefined;

  const activeHeadingTitle = activeSubcategory
    ? activeSubcategory.label
    : matchedDepartment
      ? matchedDepartment.label
      : dbFallbackCategory
        ? isRtl
          ? dbFallbackCategory.name
          : dbFallbackCategory.nameEn || dbFallbackCategory.name
        : isRtl
          ? 'المتجر'
          : 'Shop';

  const circularItems: MarketplaceCircularItem[] = (() => {
    if (matchedDepartment && matchedDepartment.items.length > 0) {
      return matchedDepartment.items.map((it) => ({
        label: it.label,
        to: it.to,
        slug: it.slug,
        image: it.image || getMarketplaceCategoryImage(it.slug, dbCategories),
        active: isCategoryUrlMatch(it.to, activeCategoryParam, dbCategories),
      }));
    }

    return departments.slice(0, 8).map((d) => ({
      label: d.label,
      to: d.to,
      slug: d.slug,
      image: d.image || getMarketplaceCategoryImage(d.slug, dbCategories),
      active: isCategoryUrlMatch(d.to, activeCategoryParam, dbCategories),
    }));
  })();

  return {
    matchedDepartment,
    activeSubcategory,
    activeHeadingTitle,
    circularItems,
  };
};
