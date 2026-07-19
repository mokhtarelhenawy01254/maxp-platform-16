// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  getSectionSkeletonClassName,
  PageComposer,
  shouldCollapseSectionSkeleton,
} from '../engine/PageComposer';
import {
  DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  useCartStore,
} from '../store/useCartStore';

beforeEach(() => {
  localStorage.clear();
  useCartStore.persist.setOptions({
    name: DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  });
  useCartStore.setState({ items: [], isOpen: false });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  useCartStore.persist.setOptions({
    name: DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  });
  useCartStore.setState({ items: [], isOpen: false });
});

vi.mock('../engine/ComponentRegistry', () => {
  const createMockSection = (sectionId: string) => {
    const MockSection = () => (
      <div data-testid="mock-section" data-section-id={sectionId}>
        {sectionId}
      </div>
    );

    return MockSection;
  };

  return {
    ComponentRegistry: {
      'filters-sidebar': createMockSection('filters-sidebar'),
      'shop-command-bar': createMockSection('shop-command-bar'),
      'shop-promo-rail': createMockSection('shop-promo-rail'),
      'hero-banner': createMockSection('hero-banner'),
      'product-grid': createMockSection('product-grid'),
      'checkout-form': createMockSection('checkout-form'),
      'order-summary': createMockSection('order-summary'),
      'payment': createMockSection('payment'),
      'product-gallery': createMockSection('product-gallery'),
      'product-info': createMockSection('product-info'),
      'pdp-checkout': createMockSection('pdp-checkout'),
      'quantity-offers': createMockSection('quantity-offers'),
      'conversion-stack': createMockSection('conversion-stack'),
      'delivery-proof': createMockSection('delivery-proof'),
      'low-stock': createMockSection('low-stock'),
      'reviews': createMockSection('reviews'),
      'newsletter': createMockSection('newsletter'),
    },
  };
});

describe('PageComposer layouts', () => {
  it('uses stable skeleton heights for lazy hero and product sections', () => {
    expect(getSectionSkeletonClassName('promo-strip', 'promo-strip')).toContain('min-h-[4rem]');
    expect(getSectionSkeletonClassName('reviews', 'reviews')).toContain('md:min-h-[32rem]');
    expect(getSectionSkeletonClassName('hero-banner', 'hero-banner')).toContain('md:min-h-[34rem]');
    expect(
      getSectionSkeletonClassName('hero-banner', 'hero-banner', {
        type: 'hero-banner',
        variant: 'cinematic-plinth',
      }),
    ).toContain('min-h-[42rem]');
    expect(
      getSectionSkeletonClassName('hero-banner', 'hero-banner', {
        type: 'hero-banner',
        variant: 'cinematic-plinth',
      }),
    ).toContain('md:min-h-[52rem]');
    expect(getSectionSkeletonClassName('product-gallery', 'product-gallery')).toContain('md:min-h-[41rem]');
    expect(getSectionSkeletonClassName('product-info', 'product-info')).toContain('lg:min-h-[111rem]');
    expect(
      getSectionSkeletonClassName('pdp-checkout', 'pdp-checkout', {
        type: 'pdp-checkout',
        settings: { surfaceMode: 'merged-buybox' },
      }),
    ).toContain('min-h-0');
    expect(
      shouldCollapseSectionSkeleton('pdp-checkout', 'pdp-checkout', {
        type: 'pdp-checkout',
        settings: { surfaceMode: 'merged-buybox' },
      }),
    ).toBe(true);
    expect(getSectionSkeletonClassName('product-grid', 'product-grid')).toContain('md:min-h-[38rem]');
    expect(getSectionSkeletonClassName('related-products', 'related-products')).toContain('md:min-h-[32rem]');
    expect(getSectionSkeletonClassName('order-confirmation', 'order-confirmation')).toContain('min-h-[88rem]');
    expect(getSectionSkeletonClassName('order-summary', 'order-summary')).toContain('min-h-[46rem]');
    expect(getSectionSkeletonClassName('newsletter', 'newsletter')).toContain('md:min-h-[20rem]');
    expect(getSectionSkeletonClassName('filters-sidebar', 'filters-sidebar')).toContain('min-h-11');
    expect(
      getSectionSkeletonClassName('shop-command-bar', 'shop-command-bar', {
        type: 'shop-command-bar',
        settings: { simpleToolbar: true },
      }),
    ).toContain('min-h-0');
  });

  it('treats filters-sidebar as the sidebar even when it is not the first shop section', () => {
    render(
      <PageComposer
        pageConfig={{ sections: ['product-grid', 'filters-sidebar'] }}
        layout="sidebar-left"
      />,
    );

    expect(screen.getAllByText('filters-sidebar')).toHaveLength(2);
    expect(screen.getAllByText('product-grid')).toHaveLength(1);
  });

  it('renders checkout sections using the configured sidebar-right layout order', () => {
    render(
      <PageComposer
        pageConfig={{ sections: ['payment', 'checkout-form'] }}
        layout="sidebar-right"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual(['checkout-form', 'payment']);
  });

  it('keeps the prioritized checkout sidebar as one render with mobile visual ordering', () => {
    render(
      <PageComposer
        pageConfig={{ sections: ['checkout-form', 'order-summary'] }}
        layout="sidebar-right"
        prioritizeSidebarOnMobile
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual(['checkout-form', 'order-summary']);
  });

  it('renders a stable KHEMET empty checkout state instead of lazy checkout skeletons', () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <PageComposer
          pageConfig={{
            settings: { surfaceTone: 'flat-checkout' },
            sections: ['checkout-form', 'payment', 'order-summary'],
          }}
          layout="sidebar-right"
          prioritizeSidebarOnMobile
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('checkout-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-section')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('checkout-empty-state').querySelector('a[href="/shop"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('checkout-empty-state').querySelector('a[href="/sale"]'),
    ).toBeInTheDocument();
  });

  it('keeps the KHEMET checkout sections when the cart has products', () => {
    useCartStore.setState({
      items: [
        {
          id: 'swan-shoe-41',
          productId: 'swan-shoe',
          name: 'Swan Shoe',
          price: 330,
          quantity: 1,
        },
      ],
      isOpen: false,
    });

    render(
      <PageComposer
        pageConfig={{
          settings: { surfaceTone: 'flat-checkout' },
          sections: ['checkout-form', 'payment', 'order-summary'],
        }}
        layout="sidebar-right"
        prioritizeSidebarOnMobile
      />,
    );

    expect(screen.queryByTestId('checkout-empty-state')).not.toBeInTheDocument();

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual(['checkout-form', 'payment', 'order-summary']);
  });

  it('keeps checkout sections while persisted cart items hydrate', () => {
    localStorage.setItem(
      DEFAULT_STOREFRONT_CART_STORAGE_NAME,
      JSON.stringify({
        state: {
          items: [
            {
              id: 'persisted-swan-shoe',
              productId: 'swan-shoe',
              name: 'Swan Shoe',
              price: 330,
              quantity: 1,
            },
          ],
        },
      }),
    );

    render(
      <PageComposer
        pageConfig={{
          settings: { surfaceTone: 'flat-checkout' },
          sections: ['checkout-form', 'payment', 'order-summary'],
        }}
        layout="sidebar-right"
        prioritizeSidebarOnMobile
      />,
    );

    expect(screen.queryByTestId('checkout-empty-state')).not.toBeInTheDocument();

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual(['checkout-form', 'payment', 'order-summary']);
  });

  it('renders PDP gallery and info first even when theme sections are declared in a different order', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: ['reviews', 'product-info', 'conversion-stack', 'product-gallery'],
        }}
        layout="product-detail"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'product-gallery',
      'product-info',
      'conversion-stack',
      'reviews',
    ]);
  });

  it('keeps PDP checkout beside product info inside the product-detail column flow', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: ['reviews', 'pdp-checkout', 'product-info', 'conversion-stack', 'product-gallery'],
        }}
        layout="product-detail"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'product-gallery',
      'product-info',
      'pdp-checkout',
      'conversion-stack',
      'reviews',
    ]);
  });

  it('stabilizes the expanded KHEMET buybox grid while product data hydrates', () => {
    const { container } = render(
      <PageComposer
        pageConfig={{
          sections: [
            { type: 'product-gallery', variant: 'elessi-showroom' },
            { type: 'product-info', variant: 'elessi-care-buybox' },
            'reviews',
          ],
        }}
        layout="product-detail"
      />,
    );

    expect(container.querySelector('.storefront-page-composer .grid')?.className).toContain(
      'lg:min-h-[111rem]',
    );
  });

  it('keeps standalone conversion sections beside product info in product-detail layouts', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: ['reviews', 'delivery-proof', 'product-info', 'low-stock', 'product-gallery'],
        }}
        layout="product-detail"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'product-gallery',
      'product-info',
      'delivery-proof',
      'low-stock',
      'reviews',
    ]);
  });

  it('treats quantity-offers as a product-detail companion section beside product info', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: ['reviews', 'quantity-offers', 'product-info', 'product-gallery'],
        }}
        layout="product-detail"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'product-gallery',
      'product-info',
      'quantity-offers',
      'reviews',
    ]);
  });

  it('does not render inline-buybox quantity-offers twice in product-detail layouts', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: [
            'product-gallery',
            'product-info',
            {
              type: 'quantity-offers',
              settings: {
                placement: 'inline-buybox',
              },
            },
            'reviews',
          ],
        }}
        layout="product-detail"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'product-gallery',
      'product-info',
      'reviews',
    ]);
  });

  it('skips sections that are marked hidden through content overrides', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: [
            'product-grid',
            {
              id: 'newsletter',
              type: 'newsletter',
              settings: {
                hidden: true,
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('product-grid')).toBeInTheDocument();
    expect(screen.queryByText('newsletter')).not.toBeInTheDocument();
  });

  it('renders commerce-3col shop layouts with hero and command bar above the three-column content', () => {
    render(
      <PageComposer
        pageConfig={{
          sections: [
            'hero-banner',
            'shop-command-bar',
            'filters-sidebar',
            'product-grid',
            'shop-promo-rail',
            'newsletter',
          ],
        }}
        layout="commerce-3col"
      />,
    );

    const renderedOrder = screen
      .getAllByTestId('mock-section')
      .map((section) => section.getAttribute('data-section-id'));

    expect(renderedOrder).toEqual([
      'hero-banner',
      'shop-command-bar',
      'filters-sidebar',
      'product-grid',
      'newsletter',
      'shop-promo-rail',
    ]);
  });
});
