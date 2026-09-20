// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  canonicalizeAttributeKey,
  getVariantAttributeLabel,
  getVariantAttributes,
} from '../utils/variants';
import type { ProductVariant } from '../hooks/useProducts';

describe('Variant Attribute Canonicalization and Labeling', () => {
  it('correctly canonicalizes attributes with trailing punctuation, spaces, and underscores', () => {
    expect(canonicalizeAttributeKey('اللون :')).toBe('Color');
    expect(canonicalizeAttributeKey('اللون_:')).toBe('Color');
    expect(canonicalizeAttributeKey('اللون')).toBe('Color');
    expect(canonicalizeAttributeKey('مقاس الحذاء')).toBe('Size');
    expect(canonicalizeAttributeKey('shoe_size')).toBe('Size');
    expect(canonicalizeAttributeKey('shoe-size')).toBe('Size');
    expect(canonicalizeAttributeKey('المقاس :')).toBe('Size');
  });

  it('renders clean Arabic label without trailing colons or underscores', () => {
    expect(getVariantAttributeLabel('اللون :', true)).toBe('اللون');
    expect(getVariantAttributeLabel('اللون_:', true)).toBe('اللون');
    expect(getVariantAttributeLabel('shoe_size', true)).toBe('المقاس');
    expect(getVariantAttributeLabel('عدد_القطع', true)).toBe('عدد القطع');
    expect(getVariantAttributeLabel('عدد القطع', true)).toBe('عدد القطع');
    expect(getVariantAttributeLabel('custom_attr:', true)).toBe('custom attr');
  });

  it('extracts normalized attributes from variant objects with complex keys', () => {
    const mockVariant: ProductVariant = {
      id: 'var-1',
      name: 'بيج - 37',
      price: 550,
      attributes: {
        'اللون_:': 'بيج',
        shoe_size: '37',
      },
    } as unknown as ProductVariant;

    const attributes = getVariantAttributes(mockVariant);
    expect(attributes).toEqual({
      Color: 'بيج',
      Size: '37',
    });
  });
});
