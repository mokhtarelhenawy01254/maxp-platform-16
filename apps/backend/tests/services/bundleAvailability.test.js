/**
 * Unit tests — حماية قراءة الباقات (Task 621f2800).
 * المرافق: apps/backend/services/bundleAvailability.js
 */

const {
  buildBundleAvailability,
  describeBundleAvailability,
  normalizeSlug,
} = require('../../services/bundleAvailability');

describe('bundle availability — inventory (task 621f2800)', () => {
  it('reports every referenced slug that no longer exists', () => {
    const state = buildBundleAvailability({
      bundles: [{ slug: 'messaging-bundle', name: 'Messaging', isActive: true }],
      referencedSlugs: ['messaging-bundle', 'ai-inbox-bundle', 'medical-bundle'],
    });

    expect(state.available.map((b) => b.slug)).toEqual(['messaging-bundle']);
    expect(state.missing).toEqual(['ai-inbox-bundle', 'medical-bundle']);
    expect(state.hasMissing).toBe(true);
  });

  it('dedupes repeated and empty references', () => {
    const state = buildBundleAvailability({
      bundles: [{ slug: 'a', isActive: true }],
      referencedSlugs: ['a', 'a', null, '', undefined, 'b'],
    });

    expect(state.available).toHaveLength(1);
    expect(state.missing).toEqual(['b']);
  });

  it('marks inactive bundles as present but unavailable', () => {
    const state = buildBundleAvailability({
      bundles: [{ slug: 'store-pro', name: 'Store Pro', isActive: false }],
      referencedSlugs: ['store-pro'],
    });

    expect(state.available).toEqual([
      { slug: 'store-pro', name: 'Store Pro', isActive: false, isAvailable: false },
    ]);
    expect(state.missing).toEqual([]);
  });

  it('lists orphaned bundles that nothing references anymore', () => {
    const state = buildBundleAvailability({
      bundles: [{ slug: 'kept', isActive: true }, { slug: 'dead', isActive: true }],
      referencedSlugs: ['kept'],
    });

    expect(state.orphaned).toEqual(['dead']);
    expect(state.hasOrphaned).toBe(true);
  });

  it('handles empty input without throwing', () => {
    const state = buildBundleAvailability({});
    expect(state.available).toEqual([]);
    expect(state.missing).toEqual([]);
    expect(state.orphaned).toEqual([]);
    expect(state.hasMissing).toBe(false);
  });
});

describe('bundle availability — guard response (task 621f2800)', () => {
  it('returns a 409 BUNDLE_NOT_FOUND instead of a 500 when a bundle is gone', () => {
    const state = buildBundleAvailability({
      bundles: [],
      referencedSlugs: ['medical-bundle'],
    });
    const verdict = describeBundleAvailability(state);

    expect(verdict.ok).toBe(false);
    expect(verdict.statusCode).toBe(409);
    expect(verdict.code).toBe('BUNDLE_NOT_FOUND');
    expect(verdict.missing).toEqual(['medical-bundle']);
  });

  it('returns ok when every reference resolves', () => {
    const state = buildBundleAvailability({
      bundles: [{ slug: 'messaging-bundle', isActive: true }],
      referencedSlugs: ['messaging-bundle'],
    });
    const verdict = describeBundleAvailability(state);

    expect(verdict.ok).toBe(true);
    expect(verdict.statusCode).toBe(200);
    expect(verdict.code).toBeNull();
  });

  it('never throws on a missing state object', () => {
    expect(describeBundleAvailability(null).ok).toBe(true);
  });
});

describe('bundle availability — slug normalisation (task 621f2800)', () => {
  it('trims and rejects empty values', () => {
    expect(normalizeSlug('  medical-bundle ')).toBe('medical-bundle');
    expect(normalizeSlug('   ')).toBeNull();
    expect(normalizeSlug(null)).toBeNull();
  });
});
