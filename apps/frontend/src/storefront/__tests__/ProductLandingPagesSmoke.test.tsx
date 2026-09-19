// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const pagesPayload = [
  {
    id: 'lp_1',
    companyId: 'company123',
    productId: 'prod_1',
    slug: 'dash-sneakers',
    title: 'كوتشي Dash',
    status: 'PUBLISHED',
    generationMode: 'IMAGE_STACK',
    generationStatus: 'READY',
    designNotes: '',
    slices: [],
    sections: [{ id: 'sec-media-1', type: 'MEDIA', enabled: true, content: { images: [] } }],
    formConfig: { orderKicker: 'نموذج الطلب' },
    style: {},
    seo: {},
    product: { id: 'prod_1', name: 'كوتشي Dash', price: 620, mainImage: '' },
  },
];

vi.mock('../../hooks/useAuthSimple', () => ({
  useAuth: () => ({
    user: {
      companyId: 'company123',
      company: { id: 'company123', slug: 'swan', customDomain: '' },
    },
  }),
}));

vi.mock('../../../services/productLandingPagesService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    productLandingPagesService: {
      list: vi.fn(async () => pagesPayload),
      listProducts: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(async () => pagesPayload[0]),
      updateStatus: vi.fn(),
      delete: vi.fn(),
      generateAiContent: vi.fn(),
    },
  };
});

import ProductLandingPages from '../../pages/advertising/ProductLandingPages';

describe('ProductLandingPages builder smoke', () => {
  it('renders the builder without crashing (regression: production error boundary)', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/advertising/product-landing-pages']}>
        <ProductLandingPages />
      </MemoryRouter>,
    );

    // دع الـ effects (تحميل الصفحات) تشتغل
    await new Promise((r) => setTimeout(r, 50));

    expect(container.innerHTML).not.toContain('حدث خطأ غير متوقع');
  });
});
