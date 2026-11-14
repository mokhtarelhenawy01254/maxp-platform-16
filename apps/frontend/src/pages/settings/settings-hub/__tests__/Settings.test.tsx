/** @vitest-environment jsdom */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Settings from '../../Settings';

const mockNavigate = vi.fn();
let mockParams = { tab: 'profile' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, defaultValue?: string) => defaultValue || key,
      i18n: { language: 'ar', dir: () => 'rtl' },
    }),
  };
});

vi.mock('../../../../components/settings/AppVersionSettingsCard', () => ({
  AppVersionSettingsCard: () => <div data-testid="app-version-card">App Version 1.0.0</div>,
}));

vi.mock('../../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock('../../../../utils/tokenManager', () => ({
  default: {
    createAuthHeaders: (headers = {}) => ({
      Authorization: 'Bearer mock-token',
      ...headers,
    }),
  },
}));

describe('Settings Component (Batch 442)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { tab: 'profile' };
    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/hr/employees/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              employee: {
                firstName: 'أحمد',
                lastName: 'علي',
                email: 'ahmed@example.com',
                phone: '01099998888',
                timezone: 'Africa/Cairo',
                language: 'ar',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders page header and default ProfileSettings tab', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/profile']}>
        <Routes>
          <Route path="/settings/:tab?" element={<Settings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    expect(screen.getByText('إدارة تفضيلات الحساب والمتجر والأمان')).toBeInTheDocument();
    // App version card lives exclusively on the Authorized Devices tab, not in the shared shell
    expect(screen.queryByTestId('app-version-card')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('أحمد')).toBeInTheDocument();
      expect(screen.getByDisplayValue('علي')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ahmed@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('01099998888')).toBeInTheDocument();
    });
  });

  it('renders SecuritySettings tab with password requirement checklist', () => {
    mockParams = { tab: 'security' };

    render(
      <MemoryRouter initialEntries={['/settings/security']}>
        <Routes>
          <Route path="/settings/:tab?" element={<Settings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('إعدادات الأمان')).toBeInTheDocument();
    expect(screen.getByText('شروط كلمة المرور')).toBeInTheDocument();
    expect(screen.getByText('6 أحرف على الأقل')).toBeInTheDocument();
    expect(screen.getByText('حرف كبير واحد على الأقل (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('حرف صغير واحد على الأقل (a-z)')).toBeInTheDocument();
    expect(screen.getByText('رقم واحد على الأقل (0-9)')).toBeInTheDocument();
    expect(screen.queryByTestId('app-version-card')).not.toBeInTheDocument();
  });

  it('renders Authorized Devices tab with the exclusive app version card', () => {
    mockParams = { tab: 'devices' };

    render(
      <MemoryRouter initialEntries={['/settings/devices']}>
        <Routes>
          <Route path="/settings/:tab?" element={<Settings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-version-card')).toBeInTheDocument();
  });

  it('redirects to /marketplace when tab is billing', () => {
    mockParams = { tab: 'billing' };

    render(
      <MemoryRouter initialEntries={['/settings/billing']}>
        <Routes>
          <Route path="/settings/:tab?" element={<Settings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/marketplace', { replace: true });
  });

  it('redirects to /settings/profile when tab is invalid', () => {
    mockParams = { tab: 'unknown-tab-xyz' };

    render(
      <MemoryRouter initialEntries={['/settings/unknown-tab-xyz']}>
        <Routes>
          <Route path="/settings/:tab?" element={<Settings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/settings/profile', { replace: true });
  });
});
