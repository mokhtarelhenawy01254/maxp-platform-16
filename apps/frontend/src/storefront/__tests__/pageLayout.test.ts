import { describe, expect, it } from 'vitest';
import { resolveStorefrontPageLayout } from '../utils/pageLayout';

describe('resolveStorefrontPageLayout', () => {
  it('returns the configured layout hint when present', () => {
    expect(
      resolveStorefrontPageLayout(
        {
          layoutHint: 'commerce-3col',
          sections: ['shop-command-bar', 'product-grid'],
        },
        'stack',
      ),
    ).toBe('commerce-3col');

    expect(
      resolveStorefrontPageLayout(
        {
          layoutHint: 'product-detail',
          sections: ['product-gallery', 'product-info'],
        },
        'stack',
      ),
    ).toBe('product-detail');
  });

  it('falls back when the page does not specify a layout hint', () => {
    expect(resolveStorefrontPageLayout(undefined, 'sidebar-right')).toBe(
      'sidebar-right',
    );

    expect(
      resolveStorefrontPageLayout(
        {
          sections: ['hero-banner'],
        },
        'stack',
      ),
    ).toBe('stack');
  });
});
