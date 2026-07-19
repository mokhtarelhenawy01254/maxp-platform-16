// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  canonicalizeCollectionImageCandidate,
  resolveFeaturedCollectionCards,
  shouldPreferRuntimeFeaturedCollections,
} from '../sections/FeaturedCollections';

describe('featured collections image resolver', () => {
  const imageFallbacks = [
    '/placeholders/luxury-shoes/pump-black.png',
    '/placeholders/luxury-shoes/sneaker-white.png',
    '/placeholders/luxury-shoes/sneakers.png',
    '/placeholders/luxury-shoes/flats.png',
  ];

  it('treats the same Unsplash photo as one image even when query params differ', () => {
    expect(
      canonicalizeCollectionImageCandidate(
        'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&w=900',
      ),
    ).toBe(
      canonicalizeCollectionImageCandidate(
        'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&w=1400',
      ),
    );
  });

  it('preserves strong manual images but breaks duplicate chains with preview product images', () => {
    const cards = resolveFeaturedCollectionCards({
      seeds: [
        {
          id: 'manual-0',
          name: 'فساتين',
          description: 'موديلات يومية سهلة',
          image:
            'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&w=900',
          href: '/shop?category=dresses',
        },
        {
          id: 'manual-1',
          name: 'شنط',
          description: 'حقائب عملية وخفيفة',
          image:
            'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&w=1400',
          href: '/shop?category=bags',
        },
      ],
      categories: [
        { id: 'dresses', slug: 'dresses', name: 'فساتين', image: '/categories/dresses.jpg' },
        { id: 'bags', slug: 'bags', name: 'شنط', image: '/categories/bags.jpg' },
      ],
      previewProducts: [
        {
          id: 'dress-1',
          name: 'فستان ميدي',
          categoryId: 'dresses',
          category: { id: 'dresses', slug: 'dresses', name: 'فساتين' },
          mainImage: '/products/dress-1.jpg',
          images: ['/products/dress-1.jpg', '/products/dress-1-detail.jpg'],
        },
        {
          id: 'bag-1',
          name: 'شنطة كتف',
          categoryId: 'bags',
          category: { id: 'bags', slug: 'bags', name: 'شنط' },
          mainImage: '/products/bag-1.jpg',
          images: ['/products/bag-1.jpg', '/products/bag-1-detail.jpg'],
        },
      ],
      imageFallbacks,
      preferPreviewProductImagery: true,
    });

    expect(cards.map((card) => card.image)).toEqual([
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&w=900',
      '/products/bag-1.jpg',
    ]);
  });

  it('fills missing section images from preview products without falling back to placeholders', () => {
    const cards = resolveFeaturedCollectionCards({
      seeds: [
        {
          id: 'manual-0',
          name: 'أجهزة ذكية',
          description: 'منتجات يومية سريعة الاستخدام',
          href: '/shop?category=smart-devices',
        },
        {
          id: 'manual-1',
          name: 'إكسسوارات',
          description: 'إضافات عملية تكمل الطلب',
          href: '/shop?category=accessories',
        },
      ],
      categories: [
        {
          id: 'smart-devices',
          slug: 'smart-devices',
          name: 'أجهزة ذكية',
        },
        {
          id: 'accessories',
          slug: 'accessories',
          name: 'إكسسوارات',
        },
      ],
      previewProducts: [
        {
          id: 'device-1',
          name: 'ساعة ذكية',
          categoryId: 'smart-devices',
          category: {
            id: 'smart-devices',
            slug: 'smart-devices',
            name: 'أجهزة ذكية',
          },
          mainImage: '/products/smart-watch.jpg',
        },
        {
          id: 'accessory-1',
          name: 'حامل شحن',
          categoryId: 'accessories',
          category: {
            id: 'accessories',
            slug: 'accessories',
            name: 'إكسسوارات',
          },
          mainImage: '/products/charger-stand.jpg',
        },
      ],
      imageFallbacks,
      preferPreviewProductImagery: true,
    });

    expect(cards.map((card) => card.image)).toEqual([
      '/products/smart-watch.jpg',
      '/products/charger-stand.jpg',
    ]);
    expect(cards.some((card) => card.image.startsWith('/placeholders/'))).toBe(false);
  });

  it('prefers runtime categories for KHEMET gallery columns unless explicitly disabled', () => {
    expect(
      shouldPreferRuntimeFeaturedCollections({
        themeId: 'khemet-luxe-eg',
        variant: 'gallery-columns',
      }),
    ).toBe(true);

    expect(
      shouldPreferRuntimeFeaturedCollections({
        themeId: 'khemet-luxe-eg',
        variant: 'gallery-columns',
        settingsPreferRuntimeCategories: false,
      }),
    ).toBe(false);
  });

  it('keeps configured collections as the default for non-KHEMET themes', () => {
    expect(
      shouldPreferRuntimeFeaturedCollections({
        themeId: 'women-fashion-eg',
        variant: 'gallery-columns',
      }),
    ).toBe(false);

    expect(
      shouldPreferRuntimeFeaturedCollections({
        themeId: 'women-fashion-eg',
        variant: 'gallery-columns',
        settingsPreferRuntimeCategories: true,
      }),
    ).toBe(true);
  });
});
