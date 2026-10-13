import { describe, expect, it } from 'vitest';
import { getSidebarConfig } from '../sidebar';

describe('Expired App Sidebar Retention & Access', () => {
  const t = (key: string, def?: string) => def || key;

  it('keeps dental-lab section visible in sidebar when dental-lab-app is in installedAppSlugs even if expired (not in activeApps)', () => {
    const user = {
      id: 'user-dental-expired',
      role: 'OWNER',
      company: {
        id: 'comp-dental-harmoney',
        name: 'Harmoney Dental Lab',
        activeApps: [], // Expired! Not in activeApps!
        installedAppSlugs: ['dental-lab-app'], // But still installed!
        installedApps: [
          {
            slug: 'dental-lab-app',
            status: 'EXPIRED',
            isExpired: true,
          },
        ],
      },
      companies: [
        {
          id: 'comp-dental-harmoney',
          name: 'Harmoney Dental Lab',
          isCurrent: true,
          activeApps: [],
          installedAppSlugs: ['dental-lab-app'],
          installedApps: [
            {
              slug: 'dental-lab-app',
              status: 'EXPIRED',
              isExpired: true,
            },
          ],
        },
      ],
    };

    const config = getSidebarConfig(t, user);
    const visibleSectionIds = config.filter((s) => !s.hidden).map((s) => s.id);

    // The app MUST remain in the sidebar so the user does NOT think it was uninstalled!
    expect(visibleSectionIds).toContain('dental-lab');

    const dentalSection = config.find((s) => s.id === 'dental-lab');
    expect(dentalSection).toBeDefined();
    expect(dentalSection?.hidden).toBeFalsy();
    expect(dentalSection?.items.length).toBeGreaterThan(0);
  });

  it('hides dental-lab section if company NEVER installed dental-lab-app', () => {
    const user = {
      id: 'user-ecommerce-store',
      role: 'OWNER',
      company: {
        id: 'comp-fashion-store',
        name: 'Fashion Boutique',
        activeApps: ['store'],
        installedAppSlugs: ['store'],
        installedApps: [{ slug: 'store', status: 'ACTIVE' }],
      },
    };

    const config = getSidebarConfig(t, user);
    const visibleSectionIds = config.filter((s) => !s.hidden).map((s) => s.id);

    // E-commerce store that never installed dental-lab must NOT see dental-lab
    expect(visibleSectionIds).not.toContain('dental-lab');
    const dentalSection = config.find((s) => s.id === 'dental-lab');
    expect(dentalSection?.hidden).toBe(true);
  });
});
