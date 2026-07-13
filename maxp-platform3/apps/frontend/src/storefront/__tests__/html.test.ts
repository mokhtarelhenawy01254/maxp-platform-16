// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { sanitizeStorefrontHtml } from '../utils/html';

describe('sanitizeStorefrontHtml', () => {
  it('removes scripts and inline event handlers from storefront content', () => {
    const sanitized = sanitizeStorefrontHtml(
      '<p>Hello</p><img src="x" onerror="alert(1)" /><script>alert(1)</script>',
    );

    expect(sanitized).toContain('<p>Hello</p>');
    expect(sanitized).not.toContain('script');
    expect(sanitized).not.toContain('onerror');
  });
});
