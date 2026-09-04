import { describe, expect, it } from 'vitest';
import { getSidebarConfig } from '../sidebar';

const createSidebarForUser = ({
    role = 'OWNER',
    companies = [{ isCurrent: true, name: 'Main Company', activeApps: [] }],
}: {
    role?: string;
    companies?: Array<{ isCurrent?: boolean; name?: string; activeApps?: string[] }>;
}) => {
    return getSidebarConfig((key: string) => key, {
        role,
        companies,
        company: companies[0],
    });
};

describe('Company Management Sidebar Gating (إدارة شركاتي)', () => {
    it('hides multi-company links when user has only a single company', () => {
        const config = createSidebarForUser({
            role: 'OWNER',
            companies: [
                {
                    isCurrent: true,
                    name: 'Single Store',
                    activeApps: ['store', 'hr-core'],
                },
            ],
        });

        const companySection = config.find((s) => s.id === 'company');
        expect(companySection).toBeDefined();

        const hrDashboard = companySection?.items.find((i) => i.to === '/my-companies/hr');
        const unifiedReports = companySection?.items.find((i) => i.to === '/my-companies/reports');
        const attendanceReport = companySection?.items.find((i) => i.to === '/my-companies/attendance');
        const companyLinks = companySection?.items.find((i) => i.to === '/my-companies/links');
        const users = companySection?.items.find((i) => i.to === '/users');

        // Multi-company specific items should be hidden
        expect(hrDashboard?.hidden).toBe(true);
        expect(unifiedReports?.hidden).toBe(true);
        expect(attendanceReport?.hidden).toBe(true);

        // Core single company items should remain accessible
        expect(companyLinks?.hidden).toBeFalsy();
        expect(users?.hidden).toBeFalsy();
    });

    it('shows multi-company dashboard for multi-company owner, but gates reports and attendance by active apps', () => {
        const twoCompaniesNoApps = createSidebarForUser({
            role: 'OWNER',
            companies: [
                { isCurrent: true, name: 'Company 1', activeApps: [] },
                { isCurrent: false, name: 'Company 2', activeApps: [] },
            ],
        });

        const companySection = twoCompaniesNoApps.find((s) => s.id === 'company');
        const hrDashboard = companySection?.items.find((i) => i.to === '/my-companies/hr');
        const unifiedReports = companySection?.items.find((i) => i.to === '/my-companies/reports');
        const attendanceReport = companySection?.items.find((i) => i.to === '/my-companies/attendance');

        // Dashboard is visible because owner has > 1 company
        expect(hrDashboard?.hidden).toBe(false);
        // Reports and attendance remain hidden because neither store nor hr is active
        expect(unifiedReports?.hidden).toBe(true);
        expect(attendanceReport?.hidden).toBe(true);
    });

    it('reveals unified reports when store app is active, and attendance when HR is active in multi-company mode', () => {
        const multiWithApps = createSidebarForUser({
            role: 'OWNER',
            companies: [
                { isCurrent: true, name: 'Company 1', activeApps: ['store-pro', 'hr-attendance-pro'] },
                { isCurrent: false, name: 'Company 2', activeApps: [] },
            ],
        });

        const companySection = multiWithApps.find((s) => s.id === 'company');
        const hrDashboard = companySection?.items.find((i) => i.to === '/my-companies/hr');
        const unifiedReports = companySection?.items.find((i) => i.to === '/my-companies/reports');
        const attendanceReport = companySection?.items.find((i) => i.to === '/my-companies/attendance');

        expect(hrDashboard?.hidden).toBe(false);
        expect(unifiedReports?.hidden).toBe(false);
        expect(attendanceReport?.hidden).toBe(false);
    });
});
