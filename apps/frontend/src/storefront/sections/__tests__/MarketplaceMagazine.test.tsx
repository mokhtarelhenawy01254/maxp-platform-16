import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceMagazine } from '../MarketplaceMagazine';

// Mock ProductCard to keep the test light
vi.mock('../../components/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid={`product-${product.id}`}>{product.name}</div>,
}));

// Mock useProductGridController
vi.mock('../product-grid/useProductGridController', () => ({
  useProductGridController: ({ section, settings }: any) => ({
    filteredProducts: [
      {
        id: 'p1',
        name: 'حلة ضغط 9 لتر سيتي',
        slug: 'hala-9l',
        price: 4000,
        comparePrice: 4600,
        isFeatured: true,
        mainImage: '/uploads/tasks/hala-9l.jpg',
        category: { name: 'حلل ضغط' },
      },
      {
        id: 'p2',
        name: 'دفاية كهربائية AKAI ثلاث شمعات',
        slug: 'akai-3-shamaa',
        price: 799,
        comparePrice: 1000,
        isFeatured: true,
        mainImage: '/uploads/tasks/akai.jpg',
        category: { name: 'دفايات' },
      },
      {
        id: 'p3',
        name: 'حلة ضغط 5 لتر سيتي',
        slug: 'hala-5l',
        price: 3000,
        comparePrice: 3500,
        isFeatured: false,
        mainImage: '/uploads/tasks/hala-5l.jpg',
        category: { name: 'حلل ضغط' },
      },
    ],
    shopProductCardStyleOverrides: {},
    resolveGridCardImageLoading: () => 'lazy',
    resolveGridCardImageFetchPriority: () => 'auto',
  }),
}));

describe('MarketplaceMagazine Section', () => {
  it('swaps demo promo banner with real merchant discounted product', () => {
    const settings = {
      promoTitle: 'Special Discount on PS5 Games & Gear',
      promoImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      promoBadge: 'Limited Time',
      promoText: 'S.T.A.L.K.E.R. 2 · Horizon Zero Dawn · Mafia · Cyberpunk 2077',
      articles: [
        {
          title: 'Best Laptops for Gaming & Work',
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
        },
      ],
    };

    render(
      <MemoryRouter>
        <MarketplaceMagazine section={{ id: 'mag-1', type: 'marketplace-magazine' } as any} settings={settings as any} />
      </MemoryRouter>
    );

    // Verify PS5 demo text is NOT present
    expect(screen.queryByText(/Special Discount on PS5 Games & Gear/i)).toBeNull();
    expect(screen.queryByText(/S\.T\.A\.L\.K\.E\.R\./i)).toBeNull();

    // Verify real merchant product (AKAI heater) is used for the promo banner
    const promoHeadings = screen.getAllByText('دفاية كهربائية AKAI ثلاث شمعات');
    expect(promoHeadings.length).toBeGreaterThan(0);
    // Discount percent: (1000 - 799) / 1000 = 20%
    expect(screen.getByText(/20%/i)).toBeDefined();

    // Verify articles replaced demo laptops with product-based guides
    expect(screen.queryByText(/Best Laptops for Gaming & Work/i)).toBeNull();
    expect(screen.getAllByText(/حلة ضغط 9 لتر سيتي/i).length).toBeGreaterThan(0);
  });
});
