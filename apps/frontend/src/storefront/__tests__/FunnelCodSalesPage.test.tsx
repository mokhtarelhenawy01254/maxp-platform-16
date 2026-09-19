// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { getFunnelMock, createOrderMock, trackFunnelOrderMock } = vi.hoisted(() => ({
  getFunnelMock: vi.fn(),
  createOrderMock: vi.fn(),
  trackFunnelOrderMock: vi.fn(),
}));

vi.mock('../../utils/storefrontApi', () => ({
  getCompanyId: () => null,
  storefrontApi: {
    getFunnel: (...args: unknown[]) => getFunnelMock(...args),
    createOrder: (...args: unknown[]) => createOrderMock(...args),
    trackFunnelOrder: (...args: unknown[]) => trackFunnelOrderMock(...args),
  },
}));

import FunnelCodSalesPage from '../pages/FunnelCodSalesPage';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';

const funnelResponse = {
  funnel: {
    id: 'fun_123',
    companyId: 'company123',
    productId: 'prod_123',
    slug: 'winter-socks',
    title: 'شرابات الشتاء',
    status: 'PUBLISHED',
    config: {
      heroTitle: 'شرابات الشتاء',
      heroSubtitle: 'شرابات قطن دافية بألوان مختارة',
      offerEndsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      bundleTiers: [
        { qty: 1, price: 249, originalPrice: 349, label: 'باكدج واحد' },
        { qty: 2, price: 448, originalPrice: 698, label: 'باكدجين', popular: true },
        { qty: 3, price: 597, originalPrice: 1047, label: '3 باكدجات', bestValue: true, freeShipping: true },
      ],
      features: [{ title: 'قطن ممشط', desc: 'خامة عالية الجودة', icon: '✨' }],
      reviews: [],
      trustBadges: [],
      fomoMessages: [],
    },
  },
  product: {
    id: 'prod_123',
    name: 'شرابات الشتاء',
    slug: 'winter-socks',
    description: 'باكدج 5 أزواج',
    price: 249,
    images: ['https://example.com/socks.jpg'],
  },
  company: { id: 'company123', name: 'Swan', slug: '', currency: 'EGP' },
};

const renderPage = (path = '/funnel/winter-socks') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/funnel/:slug" element={<FunnelCodSalesPage />} />
        <Route path="/thank-you" element={<div>THANK_YOU_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('FunnelCodSalesPage', () => {
  beforeEach(() => {
    cleanup();
    getFunnelMock.mockReset();
    createOrderMock.mockReset();
    trackFunnelOrderMock.mockReset();
  });

  it('renders a not-found state instead of demo content when the funnel 404s', async () => {
    getFunnelMock.mockRejectedValue(
      Object.assign(new Error('Request failed with status 404'), { status: 404 }),
    );

    renderPage('/funnel/does-not-exist');

    expect(await screen.findByText('الصفحة غير متاحة')).toBeInTheDocument();
    expect(screen.getByText(/الرابط غير صحيح أو صفحة الهبوط دي مش منشورة/)).toBeInTheDocument();
    // No demo product content may leak through.
    expect(screen.queryByText(/Swan High Skotch/)).not.toBeInTheDocument();
    expect(getFunnelMock).toHaveBeenCalledWith('does-not-exist', { companyId: undefined });
  });

  it('renders a transient-error state (not demo content) when the store errors', async () => {
    getFunnelMock.mockRejectedValue(new Error('network down'));

    renderPage();

    expect(await screen.findByText('الصفحة غير متاحة مؤقتًا')).toBeInTheDocument();
    expect(screen.queryByText(/Swan High Skotch/)).not.toBeInTheDocument();
  });

  it('creates a REAL order through the storefront pipeline on submit', async () => {
    getFunnelMock.mockResolvedValue(funnelResponse);
    createOrderMock.mockResolvedValue({
      success: true,
      data: { id: 'order_1', orderNumber: 'ORD-777', finalTotal: 597 },
    });
    trackFunnelOrderMock.mockResolvedValue({ ok: true });

    renderPage();

    expect(await screen.findByText('شرابات الشتاء')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/الاسم بالكامل/), 'أحمد محمود');
    await user.type(screen.getByLabelText(/رقم الجوال/), '01000000000');
    await user.selectOptions(
      screen.getByLabelText(/المحافظة/),
      EGYPT_GOVERNORATES[0].id,
    );
    await user.type(screen.getByLabelText(/العنوان بالكامل/), 'شارع التحرير، عمارة 4');
    // Choose the 3-piece tier — total must be the tier price (597), never
    // tier price × quantity (1791).
    await user.selectOptions(screen.getByLabelText(/الكمية/), '3');

    await user.click(screen.getByRole('button', { name: /تأكيد الطلب/ }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledTimes(1);
    });

    const payload = createOrderMock.mock.calls[0][0] as Record<string, any>;
    expect(payload.guestName).toBe('أحمد محمود');
    expect(payload.guestPhone).toBe('01000000000');
    expect(payload.paymentMethod).toBe('cod');
    // Tier total, not tier total × 3.
    expect(payload.total).toBe(597);
    expect(payload.subtotal).toBe(597);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe('prod_123');
    expect(payload.items[0].quantity).toBe(3);
    expect(payload.items[0].price).toBe(199);
    expect(payload.attribution.landingPage).toMatchObject({
      source: 'cod_funnel',
      landingPageSlug: 'winter-socks',
    });

    // Conversion counter fired, and the buyer lands on thank-you.
    await waitFor(() => {
      expect(trackFunnelOrderMock).toHaveBeenCalledWith('winter-socks', {
        orderId: 'ORD-777',
      });
    });
    expect(await screen.findByText('THANK_YOU_PAGE')).toBeInTheDocument();
  });

  it('keeps the buyer on the page with an error toast when order creation fails', async () => {
    getFunnelMock.mockResolvedValue(funnelResponse);
    createOrderMock.mockResolvedValue({
      success: false,
      message: 'تعذر إرسال الطلب الآن',
    });

    renderPage();

    expect(await screen.findByText('شرابات الشتاء')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/الاسم بالكامل/), 'أحمد محمود');
    await user.type(screen.getByLabelText(/رقم الجوال/), '01000000000');
    await user.selectOptions(
      screen.getByLabelText(/المحافظة/),
      EGYPT_GOVERNORATES[0].id,
    );
    await user.type(screen.getByLabelText(/العنوان بالكامل/), 'شارع التحرير، عمارة 4');

    await user.click(screen.getByRole('button', { name: /تأكيد الطلب/ }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledTimes(1);
    });
    // Still on the funnel page — no navigation, no silent data loss.
    expect(screen.getByText('شرابات الشتاء')).toBeInTheDocument();
    expect(screen.queryByText('THANK_YOU_PAGE')).not.toBeInTheDocument();
    expect(trackFunnelOrderMock).not.toHaveBeenCalled();
  });
});
