// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import BoughtTogetherSection from '../sections/BoughtTogetherSection';

const mockAddItem = vi.fn();
const mockSetIsOpen = vi.fn();
const mockTrackStorefrontAppUsage = vi.fn();
const mockToastError = vi.fn();

const mockMainProduct = {
  id: 'main-shoe',
  name: 'Stride Core Runner',
  description: '',
  price: 1890,
  images: ['/stride.jpg'],
  slug: 'stride-core-runner',
  productVariants: [
    {
      id: 'stride-core-runner-black-42',
      name: 'Black / 42',
      price: 1890,
      attributes: {
        Color: 'Black',
        Size: '42',
      },
    },
  ],
};

const { mockRecommendations } = vi.hoisted(() => ({
  mockRecommendations: [
    {
      id: 'city-white-court',
      name: 'سنيك Court أبيض',
      description: '',
      price: 1590,
      images: ['/court.jpg'],
      slug: 'city-white-court',
      productVariants: [
        {
          id: 'city-white-court-orange-42',
          name: 'Orange / 42',
          price: 1590,
          attributes: {
            Color: 'Orange',
            Size: '42',
          },
        },
        {
          id: 'city-white-court-white-43',
          name: 'White / 43',
          price: 1690,
          attributes: {
            Color: 'White',
            Size: '43',
          },
        },
      ],
    },
  ],
}));

let mockUseProductState: {
  product: typeof mockMainProduct | null;
  isLoading: boolean;
} = {
  product: mockMainProduct,
  isLoading: false,
};

let mockPdpSelection: {
  productId: string;
  productName: string;
  variantId: string;
  unitPrice: number;
  basePrice: number;
  attributes: Record<string, string>;
  imageUrl: string;
  volumeDiscounts: [];
  requiresVariantSelection: boolean;
  isSelectionReady: boolean;
} | null = {
  productId: 'main-shoe',
  productName: 'Stride Core Runner',
  variantId: 'stride-core-runner-black-42',
  unitPrice: 1890,
  basePrice: 1890,
  attributes: {
    Color: 'Black',
    Size: '42',
  },
  imageUrl: '/stride.jpg',
  volumeDiscounts: [],
  requiresVariantSelection: true,
  isSelectionReady: true,
};

vi.mock('../hooks/useProduct', () => ({
  useProduct: () => mockUseProductState,
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      storefront: {
        settings: {
          currency: 'EGP',
        },
      },
      company: {
        currency: 'EGP',
      },
    },
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'men-shoes-eg',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../preview/themePreviewData', () => ({
  resolveActiveThemePreviewDataset: () => null,
  getThemePreviewProductRecommendations: () => [],
}));

vi.mock('../../utils/storefrontApi', () => ({
  storefrontFetch: vi.fn().mockResolvedValue({
    success: true,
    data: mockRecommendations,
  }),
  getStorefrontScope: () => 'storefront',
}));

vi.mock('../preview/marketplaceSampleData', () => ({
  getMarketplacePreviewRecommendations: () => mockRecommendations,
}));

vi.mock('../utils/marketplaceApps', () => ({
  isStorefrontMarketplaceAppEnabled: () => true,
  getStorefrontMarketplaceAppSettings: () => ({
    modules: {
      boughtTogether: true,
    },
    ui: {},
    copy: {},
  }),
}));

vi.mock('../store/useCartStore', () => ({
  useCartStore: (
    selector: (state: {
      addItem: typeof mockAddItem;
      setIsOpen: typeof mockSetIsOpen;
    }) => unknown,
  ) =>
    selector({
      addItem: mockAddItem,
      setIsOpen: mockSetIsOpen,
    }),
}));

vi.mock('../store/usePdpSelectionStore', () => ({
  usePdpSelectionStore: (
    selector: (state: {
      selection: typeof mockPdpSelection;
    }) => unknown,
  ) =>
    selector({
      selection: mockPdpSelection,
    }),
}));

vi.mock('../components/StorefrontProductImage', () => ({
  default: ({ alt }: { alt: string }) => <div>{alt}</div>,
}));

vi.mock('../components/VariantSelector', () => ({
  default: ({
    selectedAttributes,
    onChange,
  }: {
    selectedAttributes: Record<string, string>;
    onChange: (attributes: Record<string, string>) => void;
  }) => (
    <div>
      <div data-testid="bundle-variant-summary">
        {Object.values(selectedAttributes).join(' / ')}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            Color: 'White',
            Size: '43',
          })
        }
      >
        غيّر المتغير
      </button>
    </div>
  ),
}));

vi.mock('../utils/appUsageTracking', () => ({
  trackStorefrontAppUsage: (...args: unknown[]) => mockTrackStorefrontAppUsage(...args),
}));

vi.mock('sonner', () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('BoughtTogetherSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProductState = {
      product: mockMainProduct,
      isLoading: false,
    };
    mockPdpSelection = {
      productId: 'main-shoe',
      productName: 'Stride Core Runner',
      variantId: 'stride-core-runner-black-42',
      unitPrice: 1890,
      basePrice: 1890,
      attributes: {
        Color: 'Black',
        Size: '42',
      },
      imageUrl: '/stride.jpg',
      volumeDiscounts: [],
      requiresVariantSelection: true,
      isSelectionReady: true,
    };
  });

  it('configures a recommendation variant inline and adds it with the bundle', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/product/main-shoe']}>
        <Routes>
          <Route path="/product/:id" element={<BoughtTogetherSection />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'سنيك Court أبيض' })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /إضافة سنيك Court أبيض إلى الباقة/i,
      }),
    );

    expect(screen.getByTestId('bundle-variant-summary')).toHaveTextContent('Orange / 42');

    await user.click(screen.getByRole('button', { name: 'غيّر المتغير' }));

    expect(screen.getByTestId('bundle-variant-summary')).toHaveTextContent('White / 43');

    await user.click(
      screen.getByRole('button', {
        name: /أضف الباقة المحددة/i,
      }),
    );

    expect(mockAddItem).toHaveBeenCalledTimes(2);
    expect(mockAddItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        productId: 'main-shoe',
        variantId: 'stride-core-runner-black-42',
        attributes: {
          Color: 'Black',
          Size: '42',
        },
      }),
      expect.objectContaining({
        openCart: false,
      }),
    );
    expect(mockAddItem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        productId: 'city-white-court',
        variantId: 'city-white-court-white-43',
        price: 1690,
        attributes: {
          Color: 'White',
          Size: '43',
        },
      }),
      expect.objectContaining({
        openCart: true,
      }),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('returns null safely before the main product finishes hydrating', () => {
    mockUseProductState = {
      product: null,
      isLoading: false,
    };
    mockPdpSelection = null;

    expect(() =>
      render(
        <MemoryRouter initialEntries={['/product/main-shoe']}>
          <Routes>
            <Route path="/product/:id" element={<BoughtTogetherSection />} />
          </Routes>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
