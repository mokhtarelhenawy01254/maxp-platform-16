import { describe, expect, it } from 'vitest';
import { sanitizeProductCopy, truncateProductCopy } from '../utils/productCopy';

describe('product copy utilities', () => {
  it('strips markup and decodes common HTML entities for product summaries', () => {
    const cleaned = sanitizeProductCopy(
      '<p>Soft&nbsp;shoe &amp; daily style</p><script>alert(1)</script>',
    );

    expect(cleaned).toBe('Soft shoe & daily style');
    expect(cleaned).not.toContain('<p>');
    expect(cleaned).not.toContain('alert');
  });

  it('truncates cleaned product copy at the requested limit', () => {
    expect(truncateProductCopy('Comfortable everyday sneaker', 12)).toBe('Comfortable...');
  });
});
