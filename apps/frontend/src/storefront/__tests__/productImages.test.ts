// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  buildOptimizedStorefrontImageUrl,
  buildResponsiveStorefrontImage,
  buildStorefrontImageCandidates,
  buildVersionedStorefrontStaticAssetUrl,
  canOptimizeStorefrontImage,
  getPrimaryProductImage,
  getProductImageCandidates,
  normalizeStorefrontImageValue,
} from '../utils/productImages';

describe('storefront product image helpers', () => {
  it('normalizes object-based image values', () => {
    expect(
      normalizeStorefrontImageValue({
        fullUrl: ' https://cdn.example.com/main.webp ',
      }),
    ).toBe('https://cdn.example.com/main.webp');
  });

  it('deduplicates image candidates while preserving order', () => {
    expect(
      buildStorefrontImageCandidates(
        ' /uploads/products/one.webp ',
        [
          { url: '/uploads/products/two.webp' },
          '/uploads/products/one.webp',
        ],
        { fullUrl: '/uploads/products/three.webp' },
      ),
    ).toEqual([
      normalizeStorefrontImageValue('/uploads/products/one.webp'),
      normalizeStorefrontImageValue('/uploads/products/two.webp'),
      normalizeStorefrontImageValue('/uploads/products/three.webp'),
    ]);
  });

  it('parses JSON-encoded image values from variant payloads', () => {
    expect(normalizeStorefrontImageValue('["/uploads/products/variant.webp"]')).toBe(
      normalizeStorefrontImageValue('/uploads/products/variant.webp'),
    );

    expect(
      buildStorefrontImageCandidates(
        '["/uploads/products/variant.webp"]',
        '/uploads/products/fallback.webp',
      ),
    ).toEqual([
      normalizeStorefrontImageValue('/uploads/products/variant.webp'),
      normalizeStorefrontImageValue('/uploads/products/fallback.webp'),
    ]);
  });

  it('rebases WooCommerce variant paths onto the product image origin', () => {
    expect(
      buildStorefrontImageCandidates(
        '["/wp-content/uploads/2025/03/IMG_4227.jpg"]',
        'https://swan3.fiore.icu/wp-content/uploads/2025/03/IMG_4000.jpg',
      ),
    ).toEqual([
      '/api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2FIMG_4227.jpg',
      '/api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2FIMG_4000.jpg',
    ]);
  });

  it('drops unresolved WooCommerce-relative image paths instead of pointing at the storefront host', () => {
    expect(
      buildStorefrontImageCandidates('["/wp-content/uploads/2025/03/IMG_4227.jpg"]'),
    ).toEqual([]);
  });

  it('falls back to mainImage when images are empty', () => {
    expect(
      getProductImageCandidates({
        images: [],
        mainImage: '/uploads/products/fallback.webp',
      }),
    ).toEqual([normalizeStorefrontImageValue('/uploads/products/fallback.webp')]);
    expect(
      getPrimaryProductImage({
        images: [],
        mainImage: '/uploads/products/fallback.webp',
      }),
    ).toBe(normalizeStorefrontImageValue('/uploads/products/fallback.webp'));
  });

  it('builds optimized upload urls without touching unrelated external assets', () => {
    expect(canOptimizeStorefrontImage('/uploads/products/photo.JPG')).toBe(true);
    expect(canOptimizeStorefrontImage('/uploads/products/animated.gif')).toBe(false);
    expect(canOptimizeStorefrontImage('https://cdn.example.com/photo.jpg')).toBe(false);
    expect(
      canOptimizeStorefrontImage(
        'https://swan3.fiore.icu/wp-content/uploads/2025/03/photo.jpg',
      ),
    ).toBe(true);

    expect(
      buildOptimizedStorefrontImageUrl('/uploads/products/photo.JPG', {
        width: 800,
        quality: 74,
      }),
    ).toBe('/api/proxy-image?url=%2Fuploads%2Fproducts%2Fphoto.JPG&w=800&q=74&format=webp');

    expect(
      buildOptimizedStorefrontImageUrl('https://cdn.example.com/photo.jpg', {
        width: 800,
      }),
    ).toBe('https://cdn.example.com/photo.jpg');

    expect(
      buildOptimizedStorefrontImageUrl(
        'https://swan3.fiore.icu/wp-content/uploads/2025/03/photo.jpg',
        {
          width: 360,
          quality: 70,
        },
      ),
    ).toBe(
      '/api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2Fphoto.jpg&w=360&q=70&format=webp',
    );

    expect(
      buildOptimizedStorefrontImageUrl('/uploads/products/animated.gif', {
        width: 800,
      }),
    ).toBe('/uploads/products/animated.gif');
  });

  it('routes known storefront CDN images through the proxy even without file extensions', () => {
    const unsplashImage =
      'https://images.unsplash.com/photo-1700000000000?auto=format&fit=crop&w=1200&q=80';
    const googleHeroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuChero';

    expect(canOptimizeStorefrontImage(unsplashImage)).toBe(true);
    expect(canOptimizeStorefrontImage(googleHeroImage)).toBe(true);

    expect(
      buildOptimizedStorefrontImageUrl(unsplashImage, {
        width: 640,
        quality: 72,
      }),
    ).toBe(
      '/api/proxy-image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1700000000000%3Fauto%3Dformat%26fit%3Dcrop%26w%3D1200%26q%3D80&w=640&q=72&format=webp',
    );

    expect(
      buildOptimizedStorefrontImageUrl(googleHeroImage, {
        width: 960,
        quality: 74,
      }),
    ).toBe(
      '/api/proxy-image?url=https%3A%2F%2Flh3.googleusercontent.com%2Faida-public%2FAB6AXuChero&w=960&q=74&format=webp',
    );
  });

  it('adds a stable version to cached storefront placeholder assets', () => {
    expect(
      buildVersionedStorefrontStaticAssetUrl('/placeholders/luxury-shoes/hero.png'),
    ).toBe('/placeholders/luxury-shoes/hero.webp?v=20260503-khemet-webp-placeholders');

    expect(
      buildVersionedStorefrontStaticAssetUrl(
        '/placeholders/luxury-shoes/hero.png?foo=bar#preview',
      ),
    ).toBe(
      '/placeholders/luxury-shoes/hero.webp?foo=bar&v=20260503-khemet-webp-placeholders#preview',
    );

    expect(
      buildVersionedStorefrontStaticAssetUrl('/placeholders/luxury-shoes/hero.webp'),
    ).toBe('/placeholders/luxury-shoes/hero.webp?v=20260503-khemet-webp-placeholders');

    expect(buildVersionedStorefrontStaticAssetUrl('/assets/themes/aura-chic/hero.png')).toBe(
      '/assets/themes/aura-chic/hero.png',
    );
  });

  it('builds responsive image descriptors for product uploads', () => {
    expect(
      buildResponsiveStorefrontImage('/uploads/products/photo.JPG', {
        widths: [320, 640],
        fallbackWidth: 640,
        sizes: '(min-width: 1024px) 50vw, 100vw',
      }),
    ).toEqual({
      src: '/api/proxy-image?url=%2Fuploads%2Fproducts%2Fphoto.JPG&w=640&q=78&format=webp',
      srcSet:
        '/api/proxy-image?url=%2Fuploads%2Fproducts%2Fphoto.JPG&w=320&q=78&format=webp 320w, /api/proxy-image?url=%2Fuploads%2Fproducts%2Fphoto.JPG&w=640&q=78&format=webp 640w',
      sizes: '(min-width: 1024px) 50vw, 100vw',
    });
  });

  it('builds responsive proxy descriptors for WooCommerce product images', () => {
    expect(
      buildResponsiveStorefrontImage(
        'https://swan3.fiore.icu/wp-content/uploads/2025/03/photo.jpg',
        {
          widths: [240, 480],
          fallbackWidth: 480,
          sizes: '(max-width: 767px) 50vw, 25vw',
          quality: 72,
        },
      ),
    ).toEqual({
      src: '/api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2Fphoto.jpg&w=480&q=72&format=webp',
      srcSet:
        '/api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2Fphoto.jpg&w=240&q=72&format=webp 240w, /api/proxy-image?url=https%3A%2F%2Fswan3.fiore.icu%2Fwp-content%2Fuploads%2F2025%2F03%2Fphoto.jpg&w=480&q=72&format=webp 480w',
      sizes: '(max-width: 767px) 50vw, 25vw',
    });
  });
});
