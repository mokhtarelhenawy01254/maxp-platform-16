// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { resolveShippingLocation } from '../sections/OrderConfirmation';

describe('order confirmation utilities', () => {
  it('formats JSON-encoded shipping addresses as readable text', () => {
    expect(
      resolveShippingLocation(
        JSON.stringify({
          address: 'TEST ORDER - DO NOT SHIP',
          city: 'Cairo',
          governorate: 'Cairo',
        }),
      ),
    ).toBe('TEST ORDER - DO NOT SHIP');
  });

  it('falls back to location parts when no full address exists', () => {
    expect(
      resolveShippingLocation({
        governorate: 'Cairo',
        city: 'Nasr City',
        street: 'Street 9',
      }),
    ).toBe('Cairo, Nasr City, Street 9');
  });
});
