import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MerchantCopilotHost, COPILOT_TRIGGER_MODE_KEY } from '../MerchantCopilotHost';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/orders', search: '', hash: '' }),
  useNavigate: () => jest.fn(),
}));

// Mock useAuthSimple
jest.mock('../../../hooks/useAuthSimple', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'ADMIN', companyId: 'c1' },
    isAuthenticated: true,
  }),
}));

// Mock shouldUseSuperAdminShell
jest.mock('../../layout/layoutMode', () => ({
  shouldUseSuperAdminShell: () => false,
}));

// Mock MerchantCopilotDrawer to avoid full drawer dependency in host tests
jest.mock('../MerchantCopilotDrawer', () => ({
  MerchantCopilotDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="copilot-drawer">
        <button onClick={onClose}>Close Drawer</button>
      </div>
    ) : null,
}));

describe('MerchantCopilotHost - Non-blocking Trigger & RTL Controls', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    (localStorage.getItem as jest.Mock).mockImplementation((key: string) => store[key] ?? null);
    (localStorage.setItem as jest.Mock).mockImplementation((key: string, val: string) => {
      store[key] = String(val);
    });
    (localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      delete store[key];
    });
    (localStorage.clear as jest.Mock).mockImplementation(() => {
      store = {};
    });
    jest.clearAllMocks();
  });

  it('renders floating container with pointer-events-none and RTL right classes by default', () => {
    render(<MerchantCopilotHost />);
    const container = screen.getByLabelText('المساعد التنفيذي للمتجر');
    expect(container).toBeInTheDocument();
    expect(container.className).toContain('pointer-events-none');
    expect(container.className).toContain('rtl:right-4');
    expect(container.className).toContain('rtl:sm:right-6');
    expect(container.className).toContain('rtl:left-auto');

    // Trigger button has pointer-events-auto
    const openBtn = screen.getByRole('button', { name: /فتح المساعد التنفيذي للمتجر/i });
    expect(openBtn).toBeInTheDocument();
  });

  it('renders circular trigger button and opens drawer when clicked', () => {
    render(<MerchantCopilotHost />);
    const openBtn = screen.getByRole('button', { name: /فتح المساعد التنفيذي للمتجر/i });
    expect(openBtn).toBeInTheDocument();
    expect(openBtn.className).toContain('rounded-full');
    expect(openBtn.className).toContain('w-12');
    expect(openBtn.className).toContain('h-12');

    fireEvent.click(openBtn);
    expect(screen.getByTestId('copilot-drawer')).toBeInTheDocument();
  });

  it('hides completely and persists to localStorage when close/hide button is clicked', () => {
    render(<MerchantCopilotHost />);
    const hideBtn = screen.getByRole('button', { name: /إخفاء الشيب العائم/i });
    fireEvent.click(hideBtn);

    expect(localStorage.getItem(COPILOT_TRIGGER_MODE_KEY)).toBe('hidden');
    expect(screen.queryByLabelText('المساعد التنفيذي للمتجر')).not.toBeInTheDocument();
  });

  it('initializes from localStorage in circular mode by default even if legacy minimized is present', () => {
    localStorage.setItem(COPILOT_TRIGGER_MODE_KEY, 'minimized');
    render(<MerchantCopilotHost />);

    const openBtn = screen.getByRole('button', { name: /فتح المساعد التنفيذي للمتجر/i });
    expect(openBtn).toBeInTheDocument();
  });

  it('initializes from localStorage in hidden mode if previously hidden', () => {
    localStorage.setItem(COPILOT_TRIGGER_MODE_KEY, 'hidden');
    render(<MerchantCopilotHost />);

    expect(screen.queryByLabelText('المساعد التنفيذي للمتجر')).not.toBeInTheDocument();
  });

  it('opens copilot drawer with Ctrl+J shortcut even if trigger is hidden, and unmounts floating chip when drawer is open', () => {
    localStorage.setItem(COPILOT_TRIGGER_MODE_KEY, 'hidden');
    render(<MerchantCopilotHost />);

    expect(screen.queryByTestId('copilot-drawer')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(screen.getByTestId('copilot-drawer')).toBeInTheDocument();
    // While open, floating trigger must remain unmounted
    expect(screen.queryByLabelText('المساعد التنفيذي للمتجر')).not.toBeInTheDocument();
  });
});
