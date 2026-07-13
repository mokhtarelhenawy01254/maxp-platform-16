// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ReviewsSection from '../sections/ReviewsSection';

const useDeferredSectionActivationMock = vi.hoisted(() =>
  vi.fn(() => ({
    isActive: true,
    sectionRef: { current: null },
  })),
);

vi.mock('../hooks/useDeferredSectionActivation', () => ({
  useDeferredSectionActivation: useDeferredSectionActivationMock,
}));

vi.mock('../hooks/useProductReviews', () => ({
  getRatingDistribution: () => [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
  normalizeProductReviewRecord: (review: Record<string, unknown>, index: number) => ({
    id: `review-${index}`,
    rating: Number(review.rating || 5),
    comment: String(review.comment || ''),
    media: [],
  }),
  useProductReviews: () => ({
    reviews: [],
    totalCount: 0,
    averageRating: 0,
    ratingDistribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
    isLoading: false,
  }),
}));

vi.mock('../hooks/useProduct', () => ({
  useProduct: () => ({
    product: {
      id: 'swan',
      slug: 'kotshy-soan',
      name: 'Swan',
      description: 'Stable product description',
      category: { name: "Women's Shoes" },
    },
  }),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {},
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'khemet-luxe-eg',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../utils/marketplaceApps', () => ({
  getStorefrontMarketplaceAppSettings: () => ({}),
  isStorefrontMarketplaceAppEnabled: () => false,
}));

vi.mock('../components/ReviewMediaGallery', () => ({
  default: () => null,
}));

vi.mock('../components/WriteReviewDialog', () => ({
  default: () => null,
}));

const renderReviews = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <Routes>
          <Route
            path="/product/:id"
            element={<ReviewsSection section={{ variant: 'elessi-story-grid' }} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Elessi story-grid reviews section', () => {
  beforeEach(() => {
    cleanup();
    useDeferredSectionActivationMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reserves review height and prewarms before the section enters the viewport', () => {
    const { container } = renderReviews();
    const section = container.querySelector('#storefront-product-reviews');

    expect(section?.className).toContain('min-h-[38rem]');
    expect(useDeferredSectionActivationMock).toHaveBeenCalledWith({
      idleTimeout: 3500,
      rootMargin: '1600px 0px',
    });
  });
});
