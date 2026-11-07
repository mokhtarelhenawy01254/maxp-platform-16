/**
 * Unit tests — حماية أمان حذف الباقات (Task 621f2800).
 * المرافق: apps/backend/services/bundleCleanupSafety.js
 */

const { normalizeAppIds, computeBundleSafety } = require('../../services/bundleCleanupSafety');

describe('bundle cleanup safety — fail-closed (task 621f2800)', () => {
  it('treats malformed appIds as invalid and never safe to clean', () => {
    expect(normalizeAppIds('{not-json')).toEqual({ slugs: [], valid: false, issue: 'appIds malformed JSON' });
    expect(normalizeAppIds({ nope: true }).valid).toBe(false);
    expect(normalizeAppIds(null).valid).toBe(false);
    expect(normalizeAppIds([{ unexpected: 'object' }]).valid).toBe(false);
    expect(normalizeAppIds(['ok-slug', 123]).valid).toBe(false);

    const [row] = computeBundleSafety({
      bundles: [{ slug: 'orphan-bundle', appIds: '{not-json' }],
      referencedSlugs: [],
      activeCompanyIds: ['c1'],
      appsByCompany: new Map([['c1', new Set(['unified-inbox'])]]),
      slugById: new Map(),
    });
    expect(row.orphaned).toBe(true);
    expect(row.metadataIssue).toBe('appIds malformed JSON');
    expect(row.safeToClean).toBe(false);
  });

  it('never marks an orphan with an object inside appIds safe to clean', () => {
    const [row] = computeBundleSafety({
      bundles: [{ slug: 'orphan-bundle', appIds: [{ unexpected: 'object' }] }],
      referencedSlugs: [],
      activeCompanyIds: [],
      appsByCompany: new Map(),
      slugById: new Map(),
    });
    expect(row.metadataIssue).toBe('appIds contains non-string entry');
    expect(row.safeToClean).toBe(false);
  });

  it('marks an orphan bundle safe only when no active company uses any of its apps', () => {
    const rows = computeBundleSafety({
      bundles: [
        { slug: 'orphan-empty', appIds: ['app-a'] },
        { slug: 'orphan-used', appIds: ['app-b'] },
      ],
      referencedSlugs: [],
      activeCompanyIds: ['c1'],
      appsByCompany: new Map([['c1', new Set(['app-b'])]]),
      slugById: new Map(),
    });
    expect(rows.find((r) => r.slug === 'orphan-empty').safeToClean).toBe(true);
    expect(rows.find((r) => r.slug === 'orphan-used').activeSubscriberCompanies).toBe(1);
    expect(rows.find((r) => r.slug === 'orphan-used').safeToClean).toBe(false);
  });

  it('resolves app ids to slugs before matching subscribers', () => {
    const [row] = computeBundleSafety({
      bundles: [{ slug: 'orphan-id-based', appIds: ['app-id-1'] }],
      referencedSlugs: [],
      activeCompanyIds: ['c1'],
      appsByCompany: new Map([['c1', new Set(['whatsapp-business'])]]),
      slugById: new Map([['app-id-1', 'whatsapp-business']]),
    });
    expect(row.activeSubscriberCompanies).toBe(1);
    expect(row.safeToClean).toBe(false);
  });

  it('never marks a referenced bundle safe even with zero subscribers', () => {
    const [row] = computeBundleSafety({
      bundles: [{ slug: 'messaging-bundle', appIds: ['app-a'] }],
      referencedSlugs: ['messaging-bundle'],
      activeCompanyIds: [],
      appsByCompany: new Map(),
      slugById: new Map(),
    });
    expect(row.orphaned).toBe(false);
    expect(row.safeToClean).toBe(false);
  });
});
