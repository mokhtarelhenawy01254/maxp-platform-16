import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StorefrontClaritySettings from '../StorefrontClaritySettings';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

jest.mock('sonner', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/storefrontSettingsService', () => ({
  storefrontSettingsService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock('../ClarityAnalyticsPanel', () => () => <div data-testid="analytics-panel" />);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const toast = require('sonner').default as {
  success: jest.Mock;
  error: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { storefrontSettingsService } = require('../../../services/storefrontSettingsService') as {
  storefrontSettingsService: {
    getSettings: jest.Mock;
    updateSettings: jest.Mock;
  };
};

describe('StorefrontClaritySettings', () => {
  const renderPage = async () => {
    await act(async () => {
      render(<StorefrontClaritySettings />);
    });

    return screen.findByLabelText('Clarity Project ID');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: {
        clarityProjectId: 'k3a9mz1b',
        clarityApiToken: '',
      },
    });
    storefrontSettingsService.updateSettings.mockResolvedValue({
      data: {
        clarityProjectId: 'newclarity1',
      },
    });
  });

  it('loads the saved project id and shows connected state', async () => {
    const input = await renderPage();

    expect(screen.getByText('Microsoft Clarity')).toBeInTheDocument();
    expect(input).toHaveValue('k3a9mz1b');
    expect(screen.getByText(/متصل/)).toBeInTheDocument();
  });

  it('saves the edited project id and api token', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: 'newclar11' } });

    const tokenInput = screen.getByLabelText('Clarity API Token');
    fireEvent.change(tokenInput, { target: { value: 'mytoken12345' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));

    await waitFor(() => {
      expect(storefrontSettingsService.updateSettings).toHaveBeenCalledWith({
        clarityProjectId: 'newclar11',
        clarityApiToken: 'mytoken12345',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('تم حفظ إعدادات Clarity');
  });

  it('shows validation error when saving with empty project id', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));

    await waitFor(() => {
      expect(screen.getByText('Project ID مطلوب')).toBeInTheDocument();
    });

    expect(storefrontSettingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid project id format', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: 'INVALID!!!' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));

    await waitFor(() => {
      expect(screen.getByText(/الصيغة غير صحيحة/)).toBeInTheDocument();
    });
  });

  it('clears validation error when user edits the field', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));
    await screen.findByText('Project ID مطلوب');

    fireEvent.change(input, { target: { value: 'k3a9mz1b' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));

    await waitFor(() => {
      expect(storefrontSettingsService.updateSettings).toHaveBeenCalled();
    });
  });

  it('shows disconnect button when connected', async () => {
    await renderPage();

    expect(screen.getByText('قطع الاتصال')).toBeInTheDocument();
  });

  it('disconnects after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    await renderPage();

    fireEvent.click(screen.getByText('قطع الاتصال'));

    await waitFor(() => {
      expect(storefrontSettingsService.updateSettings).toHaveBeenCalledWith({
        clarityProjectId: '',
        clarityApiToken: '',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('تم قطع اتصال Clarity');
  });

  it('cancels disconnect when user declines confirmation', async () => {
    window.confirm = jest.fn(() => false);
    await renderPage();

    fireEvent.click(screen.getByText('قطع الاتصال'));

    expect(storefrontSettingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('shows disconnected state when no project id is saved', async () => {
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: { clarityProjectId: '', clarityApiToken: '' },
    });

    await renderPage();
    expect(screen.getByText('غير متصل')).toBeInTheDocument();
  });

  it('uses h1 for the page heading', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Microsoft Clarity' })).toBeInTheDocument();
  });

  it('has role=alert on validation error', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/مطلوب/);
  });

  it('has aria-describedby connecting helper text to project id input', async () => {
    const input = await renderPage();

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const helper = document.getElementById(describedBy!);
    expect(helper).toHaveTextContent(/ستجد/);
  });

  it('has aria-invalid when validation fails', async () => {
    const input = await renderPage();
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/i }));
    await screen.findByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('has main landmark', async () => {
    await renderPage();
    expect(document.querySelector('main')).toBeInTheDocument();
  });

  it('has maxLength on project id input', async () => {
    const input = await renderPage();
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('has min-h-[44px] on save button for touch targets', async () => {
    await renderPage();
    const button = screen.getByRole('button', { name: /حفظ الإعدادات/i });
    expect(button.className).toContain('min-h');
  });

  it('has loading status role', async () => {
    storefrontSettingsService.getSettings.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<StorefrontClaritySettings />);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
