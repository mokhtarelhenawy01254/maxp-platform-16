// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  canonicalizeCollectionImageCandidate,
  resolveFeaturedCollectionCards,
} from '../sections/FeaturedCollections';
import {
  getMarketplacePreviewCategories,
  getMarketplacePreviewProducts,
} from '../preview/marketplaceSampleData';
import { getThemePreviewDataset } from '../preview/themePreviewData';
import { STOREFRONT_THEME_PRESETS } from '../themes';

type ManualCollectionInput = {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
};

const buildUnsplashKey = (photoId: string): string =>
  canonicalizeCollectionImageCandidate(
    `https://images.unsplash.com/photo-${photoId}`,
  );

const SHOE_SECTION_IMAGE_KEYS = {
  sneakers: new Set([
    buildUnsplashKey('1491553895911-0055eca6402d'),
    buildUnsplashKey('1542291026-7eec264c27ff'),
    buildUnsplashKey('1600185365483-26d7a4cc7519'),
    buildUnsplashKey('1608231387042-66d1773070a5'),
    buildUnsplashKey('1608384177866-0bca0d225435'),
    buildUnsplashKey('1621315271772-28b1f3a5df87'),
  ]),
  flats: new Set([
    buildUnsplashKey('1551779245-692374a8efe2'),
    buildUnsplashKey('1556004583-d2aaffbba592'),
    buildUnsplashKey('1576792741377-eb0f4f6d1a47'),
    buildUnsplashKey('1616406432452-07bc5938759d'),
    buildUnsplashKey('1662541089338-c7d53b88be70'),
  ]),
  heels: new Set([
    buildUnsplashKey('1515347619252-60a4bf4fff4f'),
    buildUnsplashKey('1543163521-1bf539c55dd2'),
    buildUnsplashKey('1685954134741-a699bf8807c8'),
    buildUnsplashKey('1554062097-69c634085c6d'),
    buildUnsplashKey('1559334418-672d5a48531b'),
  ]),
  sandals: new Set([
    buildUnsplashKey('1656774446450-56a427a184b4'),
    buildUnsplashKey('1577999499505-a4b64aaa9066'),
    buildUnsplashKey('1603487742131-4160ec999306'),
    buildUnsplashKey('1554062097-69c634085c6d'),
    buildUnsplashKey('1559334418-672d5a48531b'),
  ]),
  boots: new Set([
    buildUnsplashKey('1549507575-a1ba6477add0'),
    buildUnsplashKey('1551779245-692374a8efe2'),
  ]),
} as const;

const MEN_SHOE_SECTION_IMAGE_KEYS = {
  sneakers: new Set([
    buildUnsplashKey('1491553895911-0055eca6402d'),
    buildUnsplashKey('1525966222134-fcfa99b8ae77'),
    buildUnsplashKey('1542291026-7eec264c27ff'),
    buildUnsplashKey('1552346154-21d32810aba3'),
    buildUnsplashKey('1600185365483-26d7a4cc7519'),
    buildUnsplashKey('1600185365926-3a2ce3cdb9eb'),
    buildUnsplashKey('1608230164697-c791326d284c'),
    buildUnsplashKey('1608231387042-66d1773070a5'),
    buildUnsplashKey('1608384177866-0bca0d225435'),
    buildUnsplashKey('1621315271772-28b1f3a5df87'),
  ]),
  casual: new Set([
    buildUnsplashKey('1515955656352-a1fa3ffcd111'),
    buildUnsplashKey('1543508282-6319a3e2621f'),
    buildUnsplashKey('1549298916-b41d501d3772'),
    buildUnsplashKey('1556004583-d2aaffbba592'),
    buildUnsplashKey('1576792741377-eb0f4f6d1a47'),
    buildUnsplashKey('1615979474401-8a6a344de5bd'),
    buildUnsplashKey('1662541089338-c7d53b88be70'),
    buildUnsplashKey('1676121270762-47c8d3a7b9d5'),
  ]),
  formal: new Set([
    buildUnsplashKey('1556004583-d2aaffbba592'),
    buildUnsplashKey('1576792741377-eb0f4f6d1a47'),
    buildUnsplashKey('1608667508764-33cf0726b13a'),
    buildUnsplashKey('1614252235316-8c857d38b5f4'),
    buildUnsplashKey('1615979474401-8a6a344de5bd'),
    buildUnsplashKey('1616406432452-07bc5938759d'),
    buildUnsplashKey('1662541089338-c7d53b88be70'),
    buildUnsplashKey('1676121270762-47c8d3a7b9d5'),
  ]),
  running: new Set([
    buildUnsplashKey('1491553895911-0055eca6402d'),
    buildUnsplashKey('1542291026-7eec264c27ff'),
    buildUnsplashKey('1552346154-21d32810aba3'),
    buildUnsplashKey('1600185365483-26d7a4cc7519'),
    buildUnsplashKey('1608231387042-66d1773070a5'),
    buildUnsplashKey('1621315271772-28b1f3a5df87'),
  ]),
} as const;

const IMAGE_FALLBACKS = [
  '/placeholders/luxury-shoes/pump-black.png',
  '/placeholders/luxury-shoes/sneaker-white.png',
  '/placeholders/luxury-shoes/sneakers.png',
  '/placeholders/luxury-shoes/flats.png',
  '/placeholders/luxury-shoes/boots.png',
  '/placeholders/luxury-shoes/hero.png',
];

const SMART_BAZAAR_IMAGE_FALLBACKS = [
  '/assets/themes/smart-bazaar/daily.png',
  '/assets/themes/smart-bazaar/home.png',
  '/assets/themes/smart-bazaar/deals.png',
  '/assets/themes/smart-bazaar/gifts.png',
];

const parseManualCollections = (value: unknown): ManualCollectionInput[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is ManualCollectionInput =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    );
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line, index) => {
        const [title, subtitle, image, link] = line
          .split('|')
          .map((part) => part.trim());

        return {
          id: `manual-${index}`,
          title: title || undefined,
          subtitle: subtitle || undefined,
          image: image || undefined,
          link: link || undefined,
        };
      })
      .filter(
        (item) => item.title || item.subtitle || item.image || item.link,
      );
  }

  return [];
};

const parseLookbookCategoryCards = (value: unknown): ManualCollectionInput[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line, index) => {
      const [id, title, subtitle, eyebrow, image, link] = line
        .split('|')
        .map((part) => part.trim());

      return {
        id: id || `lookbook-${index}`,
        title: title || eyebrow || undefined,
        subtitle: subtitle || undefined,
        image: image || undefined,
        link: link || undefined,
      };
    })
    .filter((item) => item.image || item.title || item.link);
};

const collectManualThemeSectionEntries = (themeId: string): ManualCollectionInput[] => {
  const theme = STOREFRONT_THEME_PRESETS[themeId];

  return Object.values(theme?.pages || {}).flatMap((page) => {
    const sections = Array.isArray(page?.sections) ? page.sections : [];

    return sections.flatMap((section) => {
      if (!section || typeof section !== 'object') {
        return [];
      }

      if (section.type === 'featured-collections') {
        return parseManualCollections(section.settings?.collections);
      }

      if (section.type === 'lookbook-showcase') {
        return parseLookbookCategoryCards(section.settings?.categoryCards);
      }

      return [];
    });
  });
};

const collectResolvedManualFeaturedCards = (themeId: string) => {
  const theme = STOREFRONT_THEME_PRESETS[themeId];
  const dataset = getThemePreviewDataset(themeId);
  const previewProducts =
    dataset?.products ||
    getMarketplacePreviewProducts({ limit: 120 }, themeId)?.data ||
    [];
  const categories =
    dataset?.categories || getMarketplacePreviewCategories(themeId) || [];
  const imageFallbacks =
    themeId === 'smart-bazaar'
      ? SMART_BAZAAR_IMAGE_FALLBACKS
      : IMAGE_FALLBACKS;

  return Object.values(theme?.pages || {}).flatMap((page) => {
    const sections = Array.isArray(page?.sections) ? page.sections : [];

    return sections.flatMap((section) => {
      if (
        !section ||
        typeof section !== 'object' ||
        section.type !== 'featured-collections'
      ) {
        return [];
      }

      const manualCollections = parseManualCollections(section.settings?.collections);

      if (!manualCollections.length) {
        return [];
      }

      const limit =
        typeof section.settings?.limit === 'number' && section.settings.limit > 0
          ? section.settings.limit
          : 6;
      const seeds = manualCollections.slice(0, limit).map((collection, index) => ({
        id:
          collection.id?.trim() ||
          collection.slug?.trim() ||
          `manual-${index}`,
        name:
          collection.title?.trim() ||
          collection.name?.trim() ||
          `Collection ${index + 1}`,
        slug: collection.slug?.trim() || undefined,
        description:
          collection.subtitle?.trim() ||
          collection.description?.trim() ||
          '',
        image: collection.image?.trim() || undefined,
        href:
          typeof collection.link === 'string' && collection.link.trim().length > 0
            ? collection.link.trim()
            : '/collections',
      }));

      return resolveFeaturedCollectionCards({
        seeds,
        categories,
        previewProducts,
        imageFallbacks,
        preferPreviewProductImagery: previewProducts.length > 0,
      }).map((card) => ({
        title: card.name,
        link: card.href,
        image: card.image,
      }));
    });
  });
};

const inferShoeSectionFamily = (
  entry: ManualCollectionInput,
): keyof typeof SHOE_SECTION_IMAGE_KEYS | null => {
  const source = [
    entry.id,
    entry.slug,
    entry.title,
    entry.name,
    entry.link,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (source.includes('بوت') || source.includes('boot')) {
    return 'boots';
  }

  if (source.includes('صندل') || source.includes('sandal')) {
    return 'sandals';
  }

  if (source.includes('كعب') || source.includes('heel')) {
    return 'heels';
  }

  if (
    source.includes('فلات') ||
    source.includes('لوفر') ||
    source.includes('flat') ||
    source.includes('loafer')
  ) {
    return 'flats';
  }

  if (source.includes('سنيكرز') || source.includes('sneaker')) {
    return 'sneakers';
  }

  return null;
};

const inferMenShoeSectionFamily = (
  entry: ManualCollectionInput,
): keyof typeof MEN_SHOE_SECTION_IMAGE_KEYS | null => {
  const source = [
    entry.id,
    entry.slug,
    entry.title,
    entry.name,
    entry.link,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    source.includes('جري') ||
    source.includes('running') ||
    source.includes('راحة')
  ) {
    return 'running';
  }

  if (source.includes('كاجوال') || source.includes('casual')) {
    return 'casual';
  }

  if (
    source.includes('كلاسيك') ||
    source.includes('لوفر') ||
    source.includes('formal') ||
    source.includes('loafer')
  ) {
    return 'formal';
  }

  if (source.includes('سنيكرز') || source.includes('sneaker')) {
    return 'sneakers';
  }

  return null;
};

describe('storefront theme image audit', () => {
  it('keeps preview product pools on real imagery across all presets', () => {
    const issues: Array<{
      themeId: string;
      productId: string;
      image: string;
    }> = [];

    Object.keys(STOREFRONT_THEME_PRESETS).forEach((themeId) => {
      const dataset = getThemePreviewDataset(themeId);
      const previewProducts =
        dataset?.products ||
        getMarketplacePreviewProducts({ limit: 120 }, themeId)?.data ||
        [];

      previewProducts.forEach((product) => {
        const firstImage =
          product.mainImage ||
          (Array.isArray(product.images) ? product.images[0] : '');

        if (
          typeof firstImage === 'string' &&
          firstImage.startsWith('/placeholders/')
        ) {
          issues.push({
            themeId,
            productId: product.id,
            image: firstImage,
          });
        }
      });
    });

    expect(issues).toEqual([]);
  });

  it('keeps featured-collection cards unique and product-led across all presets', () => {
    const issues: Array<{
      themeId: string;
      pageKey: string;
      placeholders: string[];
      duplicates: string[];
    }> = [];

    Object.entries(STOREFRONT_THEME_PRESETS).forEach(([themeId, theme]) => {
      const dataset = getThemePreviewDataset(themeId);
      const previewProducts =
        dataset?.products ||
        getMarketplacePreviewProducts({ limit: 120 }, themeId)?.data ||
        [];
      const categories =
        dataset?.categories || getMarketplacePreviewCategories(themeId) || [];
      const imageFallbacks =
        themeId === 'smart-bazaar'
          ? SMART_BAZAAR_IMAGE_FALLBACKS
          : IMAGE_FALLBACKS;

      Object.entries(theme.pages || {}).forEach(([pageKey, page]) => {
        const sections = Array.isArray(page?.sections) ? page.sections : [];

        sections.forEach((section) => {
          if (
            !section ||
            typeof section !== 'object' ||
            section.type !== 'featured-collections'
          ) {
            return;
          }

          const limit =
            typeof section.settings?.limit === 'number' &&
            section.settings.limit > 0
              ? section.settings.limit
              : 6;
          const manualCollections = parseManualCollections(
            section.settings?.collections,
          );
          const seeds = manualCollections.length
            ? manualCollections.slice(0, limit).map((collection, index) => ({
                id:
                  collection.id?.trim() ||
                  collection.slug?.trim() ||
                  `manual-${index}`,
                name:
                  collection.title?.trim() ||
                  collection.name?.trim() ||
                  `Collection ${index + 1}`,
                slug: collection.slug?.trim() || undefined,
                description:
                  collection.subtitle?.trim() ||
                  collection.description?.trim() ||
                  '',
                image: collection.image?.trim() || undefined,
                href:
                  typeof collection.link === 'string' &&
                  collection.link.trim().length > 0
                    ? collection.link.trim()
                    : '/collections',
              }))
            : categories.slice(0, limit).map((category) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                image: category.image?.trim() || undefined,
                href: `/shop?category=${encodeURIComponent(category.id)}`,
              }));

          if (!seeds.length) {
            return;
          }

          const cards = resolveFeaturedCollectionCards({
            seeds,
            categories,
            previewProducts,
            imageFallbacks,
            preferPreviewProductImagery: previewProducts.length > 0,
          });
          const placeholders = cards
            .map((card) => card.image)
            .filter((image) => image.startsWith('/placeholders/'));
          const imageKeys = cards
            .map((card) => canonicalizeCollectionImageCandidate(card.image))
            .filter(Boolean);
          const duplicates = [
            ...new Set(
              imageKeys.filter((imageKey, index) => imageKeys.indexOf(imageKey) !== index),
            ),
          ];

          if (placeholders.length || duplicates.length) {
            issues.push({
              themeId,
              pageKey,
              placeholders,
              duplicates,
            });
          }
        });
      });
    });

    expect(issues).toEqual([]);
  });

  it('keeps manual fashion landing imagery off repeated preview product covers', () => {
    const overlaps = [
      'modern-minimal',
      'solea-femme',
      'men-shoes-eg',
      'cairo-stride',
    ].flatMap((themeId) => {
      const previewProductKeys = new Set(
        (getMarketplacePreviewProducts({ limit: 24 }, themeId)?.data || [])
          .map((product) =>
            canonicalizeCollectionImageCandidate(
              product.mainImage ||
                (Array.isArray(product.images) ? product.images[0] : '') ||
                '',
            ),
          )
          .filter(Boolean),
      );

      return collectManualThemeSectionEntries(themeId)
        .map((entry) => ({
          themeId,
          title: entry.title || entry.id || 'entry',
          imageKey: canonicalizeCollectionImageCandidate(entry.image),
        }))
        .filter((entry) => entry.imageKey && previewProductKeys.has(entry.imageKey))
        .map((entry) => `${entry.themeId}:${entry.title}:${entry.imageKey}`);
    });

    expect(overlaps).toEqual([]);
  });

  it('keeps shoe-focused editorial sections on the right product family imagery', () => {
    const issues: string[] = [];

    ['modern-minimal', 'solea-femme'].forEach((themeId) => {
      collectManualThemeSectionEntries(themeId).forEach((entry) => {
        const family = inferShoeSectionFamily(entry);
        const imageKey = canonicalizeCollectionImageCandidate(entry.image);

        if (!family || !imageKey) {
          return;
        }

        if (!SHOE_SECTION_IMAGE_KEYS[family].has(imageKey)) {
          issues.push(`${themeId}:${family}:${entry.title || entry.id || 'entry'}`);
        }
      });
    });

    expect(issues).toEqual([]);
  });

  it('keeps men shoe editorial sections on the right product family imagery', () => {
    const issues: string[] = [];

    ['men-shoes-eg', 'cairo-stride'].forEach((themeId) => {
      collectManualThemeSectionEntries(themeId).forEach((entry) => {
        const family = inferMenShoeSectionFamily(entry);
        const imageKey = canonicalizeCollectionImageCandidate(entry.image);

        if (!family || !imageKey) {
          return;
        }

        if (!MEN_SHOE_SECTION_IMAGE_KEYS[family].has(imageKey)) {
          issues.push(`${themeId}:${family}:${entry.title || entry.id || 'entry'}`);
        }
      });
    });

    expect(issues).toEqual([]);
  });

  it('keeps resolved men shoe collection cards on real in-family imagery', () => {
    const issues: string[] = [];

    ['men-shoes-eg', 'cairo-stride'].forEach((themeId) => {
      collectResolvedManualFeaturedCards(themeId).forEach((entry) => {
        const family = inferMenShoeSectionFamily(entry);
        const imageKey = canonicalizeCollectionImageCandidate(entry.image);

        if (!family || !imageKey) {
          return;
        }

        if (!MEN_SHOE_SECTION_IMAGE_KEYS[family].has(imageKey)) {
          issues.push(`${themeId}:${family}:${entry.title}`);
        }
      });
    });

    expect(issues).toEqual([]);
  });
});
