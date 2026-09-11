import { describe, expect, it } from 'vitest';
import { getSidebarConfig } from '../sidebar';

describe('Vertical Apps & Per-User AssignedApps Gating', () => {
  const t = (key: string) => key;

  it('keeps dental-lab section visible when company has dental-lab-app and user is assigned dental-lab-app', () => {
    const user = {
      id: 'user-dental-1',
      role: 'OWNER',
      company: {
        id: 'comp-dental-1',
        name: 'Dental Lab Corp',
        activeApps: ['dental-lab-app'],
      },
      companies: [
        {
          id: 'comp-dental-1',
          name: 'Dental Lab Corp',
          isCurrent: true,
          activeApps: ['dental-lab-app'],
        },
      ],
    };

    const config = getSidebarConfig(t, user, undefined, undefined, ['dental-lab-app']);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).toContain('dental-lab');
    // Owner retains access to company and settings
    expect(sectionIds).toContain('company');
    expect(sectionIds).toContain('settings');
  });

  it('allows regular employee assigned dental-lab-app to see dental-lab but restricts non-assigned sections', () => {
    const user = {
      id: 'user-tech-1',
      role: 'EMPLOYEE',
      company: {
        id: 'comp-dental-1',
        name: 'Dental Lab Corp',
        activeApps: ['dental-lab-app'],
      },
      companies: [
        {
          id: 'comp-dental-1',
          name: 'Dental Lab Corp',
          isCurrent: true,
          activeApps: ['dental-lab-app'],
        },
      ],
    };

    const config = getSidebarConfig(t, user, undefined, undefined, ['dental-lab-app']);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).toContain('dental-lab');
    // Regular employee with assignedApps restriction should not see company management
    expect(sectionIds).not.toContain('company');
  });

  it('resolves other vertical apps (radiology, lab, medical-center, education) when assigned', () => {
    const user = {
      id: 'user-multi-1',
      role: 'EMPLOYEE',
      company: {
        id: 'comp-multi-1',
        name: 'Multi Center',
        activeApps: ['radiology-app', 'lab-app', 'medical-system', 'education-app'],
      },
      companies: [
        {
          id: 'comp-multi-1',
          name: 'Multi Center',
          isCurrent: true,
          activeApps: ['radiology-app', 'lab-app', 'medical-system', 'education-app'],
        },
      ],
    };

    const config = getSidebarConfig(t, user, undefined, undefined, ['radiology-app', 'lab-app']);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).toContain('radiology');
    expect(sectionIds).toContain('lab');
    expect(sectionIds).not.toContain('education');
  });

  it('automatically resolves future unconfigured app slugs ending in -app or section ID', () => {
    // Simulated future app: section ID 'hotel' with slug 'hotel-app'
    const user = {
      id: 'user-hotel-1',
      role: 'EMPLOYEE',
      company: {
        id: 'comp-hotel-1',
        name: 'Grand Hotel',
        activeApps: ['hotel-app'],
      },
      companies: [
        {
          id: 'comp-hotel-1',
          name: 'Grand Hotel',
          isCurrent: true,
          activeApps: ['hotel-app'],
        },
      ],
    };

    const config = getSidebarConfig(t, user, undefined, undefined, ['hotel-app']);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).toContain('hotel');
  });

  it('guarantees OWNER never gets restricted to dental-technician-portal even if dentalRole or isDentalTechnician is set', () => {
    const ownerUser = {
      id: 'user-owner-new',
      role: 'OWNER',
      dentalRole: 'TECHNICIAN',
      isDentalTechnician: true,
      company: {
        id: 'comp-new-1',
        name: 'New Company',
        activeApps: [],
      },
      companies: [
        {
          id: 'comp-new-1',
          name: 'New Company',
          isCurrent: true,
          activeApps: [],
        },
      ],
    };

    const config = getSidebarConfig(t, ownerUser, undefined, undefined, []);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).not.toContain('dental-technician-portal');
    expect(sectionIds).toContain('company');
    expect(sectionIds).toContain('settings');
  });

  it('restricts non-owner technician employee to dental-technician-portal only', () => {
    const techUser = {
      id: 'user-tech-only',
      role: 'EMPLOYEE',
      dentalRole: 'TECHNICIAN',
      isDentalTechnician: true,
      company: {
        id: 'comp-dental-lab',
        name: 'Apex Lab',
        activeApps: ['dental-lab-app'],
      },
      companies: [
        {
          id: 'comp-dental-lab',
          name: 'Apex Lab',
          isCurrent: true,
          activeApps: ['dental-lab-app'],
        },
      ],
    };

    const config = getSidebarConfig(t, techUser, undefined, undefined, ['dental-lab-app']);
    const sectionIds = config.map((s) => s.id);

    expect(sectionIds).toEqual(['dental-technician-portal']);
    expect(config[0].items.map((i) => i.to)).toContain('/dental-lab');
    expect(config[0].items.map((i) => i.to)).toContain('/dental-lab/kiosk');
    expect(config[0].items.map((i) => i.to)).toContain('/dental-lab/my-wage');
  });
});
