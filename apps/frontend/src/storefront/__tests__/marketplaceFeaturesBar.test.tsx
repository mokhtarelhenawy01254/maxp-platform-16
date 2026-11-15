// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FeaturesBar from '../sections/FeaturesBar';

let mockThemeId = 'marketplace-avenue-ar';

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: mockThemeId,
      name: 'Marketplace Avenue',
      direction: 'rtl',
      tokens: {
        colors: {
          accent: '352 71% 59%',
        },
      },
    },
    resolvedTheme: {},
  }),
}));

describe('FeaturesBar — Marketplace Avenue & Theme Harmonization', () => {
  afterEach(() => {
    cleanup();
    mockThemeId = 'marketplace-avenue-ar';
  });

  it('renders harmonized marketplace trust section for marketplace-avenue-ar without green organic slop', () => {
    mockThemeId = 'marketplace-avenue-ar';

    const { container } = render(
      <FeaturesBar
        section={{ type: 'features-bar', variant: 'trust-strip' } as any}
        settings={{
          title: '',
          subtitle: '',
          items: [
            { icon: 'truck', title: 'شحن سريع مجاني', description: 'على الطلبات فوق 500 ج.م' },
            { icon: 'clock', title: 'توصيل اليوم التالي', description: 'مجانًا فوق 990 ج.م' },
            { icon: 'refresh', title: 'استرجاع خلال 60 يوم', description: 'لكل طرق الشحن بحالة المنتج الأصلية' },
            { icon: 'headset', title: 'خدمة عملاء وخبراء', description: 'شات أو مكالمة 24/7' },
            { icon: 'shield-check', title: 'ضمان رسمي معتمد', description: 'ماركات أصلية ومضمونة 100%' },
          ],
        } as any}
      />
    );

    // Should NOT contain the old organic tea green color or classes
    expect(container.innerHTML).not.toContain('#275c4c');
    expect(container.innerHTML).not.toContain('text-green-100');

    // Should display the default title "مميزاتنا" and the reassurance badge
    expect(screen.getByText('مميزاتنا')).toBeInTheDocument();
    expect(screen.getByText('تسوق آمن ومضمون 100%')).toBeInTheDocument();

    // Should display all 5 items
    expect(screen.getByText('شحن سريع مجاني')).toBeInTheDocument();
    expect(screen.getByText('على الطلبات فوق 500 ج.م')).toBeInTheDocument();
    expect(screen.getByText('توصيل اليوم التالي')).toBeInTheDocument();
    expect(screen.getByText('استرجاع خلال 60 يوم')).toBeInTheDocument();
    expect(screen.getByText('خدمة عملاء وخبراء')).toBeInTheDocument();
    expect(screen.getByText('ضمان رسمي معتمد')).toBeInTheDocument();
    expect(screen.getByText('ماركات أصلية ومضمونة 100%')).toBeInTheDocument();

    // Should have clean single-surface chassis with border-slate-200 and rose accent dot
    expect(container.querySelector('.bg-\\[\\#e14a5c\\]')).toBeInTheDocument();
  });

  it('intelligently resolves legacy generic icons (grid, target, clipboard) to semantic icons', () => {
    mockThemeId = 'marketplace-avenue';

    const { container } = render(
      <FeaturesBar
        section={{ type: 'features-bar', variant: 'trust-strip' } as any}
        settings={{
          title: 'مميزات المتجر',
          subtitle: 'تسوق بثقة واطمئنان',
          items: [
            { icon: 'grid', title: 'Fast Free Shipping', description: 'Nationwide coverage' },
            { icon: 'clipboard', title: 'Next-day dispatch', description: 'Order before 3 PM' },
            { icon: 'target', title: '14-day easy returns', description: 'On all eligible items' },
            { icon: 'search', title: 'Expert Support', description: 'Live chat or hotline 24/7' },
            { icon: 'shield', title: 'Official Warranty', description: '100% Genuine selection' },
          ],
        } as any}
      />
    );

    expect(screen.getByText('مميزات المتجر')).toBeInTheDocument();
    expect(screen.getByText('تسوق بثقة واطمئنان')).toBeInTheDocument();
    expect(screen.getByText('Fast Free Shipping')).toBeInTheDocument();
    expect(screen.getByText('Next-day dispatch')).toBeInTheDocument();
    expect(screen.getByText('14-day easy returns')).toBeInTheDocument();
    expect(screen.getByText('Expert Support')).toBeInTheDocument();
    expect(screen.getByText('Official Warranty')).toBeInTheDocument();

    // Should not contain hardcoded dark green
    expect(container.innerHTML).not.toContain('#275c4c');
  });

  it('preserves organic green styling for zen-organic theme backward compatibility', () => {
    mockThemeId = 'zen-organic';

    const { container } = render(
      <FeaturesBar
        section={{ type: 'features-bar', variant: 'trust-strip' } as any}
        settings={{ title: 'لماذا تختارنا' } as any}
      />
    );

    expect(container.innerHTML).toContain('#275c4c');
  });

  it('renders neutral card styling for general themes without hardcoding green', () => {
    mockThemeId = 'generic-modern-theme';

    const { container } = render(
      <FeaturesBar
        section={{ type: 'features-bar', variant: 'trust-strip' } as any}
        settings={{ title: 'مميزاتنا' } as any}
      />
    );

    expect(container.innerHTML).not.toContain('#275c4c');
    expect(container.innerHTML).toContain('bg-card');
  });
});
