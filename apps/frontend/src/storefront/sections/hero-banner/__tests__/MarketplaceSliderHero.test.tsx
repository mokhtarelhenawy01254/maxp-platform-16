/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceSliderHero } from '../MarketplaceSliderHero';

const mockProducts = [
  {
    id: 'prod-1',
    name: 'حلة ضغط 9 لتر سيتي',
    slug: 'pressure-cooker-9l',
    price: 4000,
    comparePrice: 4600,
    mainImage: 'https://store.cdn.com/uploads/pressure-cooker.jpg',
    isFeatured: true,
    category: { id: 'cat-1', name: 'حلل ضغط', slug: 'pressure-cookers' },
  },
  {
    id: 'prod-2',
    name: 'حلة ضغط 7 لتر سيتي',
    slug: 'pressure-cooker-7l',
    price: 3500,
    comparePrice: 4000,
    mainImage: 'https://store.cdn.com/uploads/pressure-cooker-7l.jpg',
    category: { id: 'cat-1', name: 'حلل ضغط', slug: 'pressure-cookers' },
  },
  {
    id: 'prod-3',
    name: 'دفاية زيت 11 ريشة',
    slug: 'oil-heater-11',
    price: 2500,
    mainImage: 'https://store.cdn.com/uploads/heater.jpg',
    category: { id: 'cat-2', name: 'أجهزة منزلية', slug: 'home-appliances' },
  },
  {
    id: 'prod-4',
    name: 'خلاط يدوي ترنادو',
    slug: 'hand-blender',
    price: 1200,
    mainImage: 'https://store.cdn.com/uploads/blender.jpg',
    category: { id: 'cat-3', name: 'أجهزة مطبخ', slug: 'kitchen' },
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'حلل ضغط',
    slug: 'pressure-cookers',
    image: 'https://store.cdn.com/uploads/cat-pressure.jpg',
  },
  {
    id: 'cat-2',
    name: 'أجهزة منزلية',
    slug: 'home-appliances',
    image: 'https://store.cdn.com/uploads/cat-home.jpg',
  },
  {
    id: 'cat-3',
    name: 'أجهزة مطبخ',
    slug: 'kitchen',
    image: 'https://store.cdn.com/uploads/cat-kitchen.jpg',
  },
];

vi.mock('../../../hooks/useProducts', () => ({
  useProducts: () => ({
    products: mockProducts,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    isLoading: false,
    error: null,
  }),
}));

describe('MarketplaceSliderHero Dynamic Replacement', () => {
  it('dynamically replaces demo Unsplash hero items with store live products and categories', () => {
    render(
      <MemoryRouter>
        <MarketplaceSliderHero
          title="Demo Store"
          subtitle=""
          ctaText="تسوّق الآن"
          primaryHref="/shop"
          secondaryCtaText=""
          secondaryHref=""
          backgroundImage=""
          highlights={[]}
          floatingCards={[]}
          stickers={[]}
          panel={{}}
          slides={[
            {
              title: 'سامسونج جالاكسي فليب 5',
              image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
            },
          ]}
          offerCard={{
            title: 'غسالة أوتوماتيك 8 كجم',
            price: '7,999 ج.م',
            image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
          }}
          miniCategories={{
            title: 'الأقسام الأكثر طلبًا',
            items: [
              {
                label: 'أجهزة منزلية ديمو',
                image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
              },
            ],
          }}
          bestPicks={{
            title: 'أفضل اختيارات الأسبوع',
            items: [
              {
                title: 'Oculus Quest 2',
                image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
                price: '4,490 ج.م',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    // Hero slide should show live product 'حلة ضغط 9 لتر سيتي' instead of Samsung
    expect(screen.queryByText('سامسونج جالاكسي فليب 5')).toBeNull();
    expect(screen.getAllByText('حلة ضغط 9 لتر سيتي').length).toBeGreaterThan(0);

    // Mini categories should show live category 'حلل ضغط' inside a circular container
    expect(screen.queryByText('أجهزة منزلية ديمو')).toBeNull();
    const catLabel = screen.getByText('حلل ضغط');
    expect(catLabel).toBeTruthy();
    const catCircle = catLabel.parentElement?.querySelector('span');
    expect(catCircle?.className).toContain('rounded-full');

    // Best picks should show live products instead of Oculus Quest 2
    expect(screen.queryByText('Oculus Quest 2')).toBeNull();
    expect(screen.getByText('حلة ضغط 7 لتر سيتي')).toBeTruthy();
  });

  it('preserves merchant custom uploaded images when they are not demo placeholders', () => {
    render(
      <MemoryRouter>
        <MarketplaceSliderHero
          title="Demo Store"
          subtitle=""
          ctaText="تسوّق الآن"
          primaryHref="/shop"
          secondaryCtaText=""
          secondaryHref=""
          backgroundImage=""
          highlights={[]}
          floatingCards={[]}
          stickers={[]}
          panel={{}}
          slides={[
            {
              title: 'بانر مخصص لمتجري',
              image: 'https://my-store.com/custom-banner.jpg',
            },
          ]}
          offerCard={{
            title: 'عرض مخصص لمتجري',
            price: '999 ج.م',
            image: 'https://my-store.com/custom-offer.jpg',
          }}
        />
      </MemoryRouter>,
    );

    // Merchant custom slides and offer cards are preserved
    expect(screen.getByText('بانر مخصص لمتجري')).toBeTruthy();
    expect(screen.getByText('عرض مخصص لمتجري')).toBeTruthy();
  });
});
