import { buildCopilotSessionUrl, copyCopilotSessionLink, openCopilotSessionInNewTab } from '../copilotLinkUtils';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Copilot Deep Link Utilities', () => {
  const originalLocation = window.location;
  const originalClipboard = navigator.clipboard;
  const originalOpen = window.open;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
    window.open = originalOpen;
  });

  describe('buildCopilotSessionUrl', () => {
    it('returns empty string when sessionId is empty or null', () => {
      expect(buildCopilotSessionUrl('')).toBe('');
      expect(buildCopilotSessionUrl(null as any)).toBe('');
    });

    it('generates canonical deep-link using current window origin', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://maxp.online' },
        writable: true,
      });

      const url = buildCopilotSessionUrl('sess_abc_123');
      expect(url).toBe('https://maxp.online/?copilot=1&session=sess_abc_123');
    });

    it('properly encodes special characters in sessionId', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://maxp.online' },
        writable: true,
      });

      const url = buildCopilotSessionUrl('sess test/123&foo=bar');
      expect(url).toContain('sess%20test%2F123%26foo%3Dbar');
      expect(url).toBe('https://maxp.online/?copilot=1&session=sess%20test%2F123%26foo%3Dbar');
    });
  });

  describe('copyCopilotSessionLink', () => {
    it('uses navigator.clipboard.writeText and shows success toast when supported', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true,
      });

      const result = await copyCopilotSessionLink('sess_999');
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('session=sess_999'));
      expect(toast.success).toHaveBeenCalledWith('تم نسخ لينك الجلسة بنجاح');
    });

    it('falls back to document.execCommand when navigator.clipboard fails', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockRejectedValue(new Error('Permission denied')),
        },
        configurable: true,
      });

      const mockExecCommand = jest.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      const result = await copyCopilotSessionLink('sess_fallback');
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(toast.success).toHaveBeenCalledWith('تم نسخ لينك الجلسة بنجاح');
    });

    it('returns false and does not copy when sessionId is empty', async () => {
      const result = await copyCopilotSessionLink('');
      expect(result).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('openCopilotSessionInNewTab', () => {
    it('calls window.open with the deep-link URL, _blank, and secure attributes', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      openCopilotSessionInNewTab('sess_tab_open');
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('session=sess_tab_open'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('does nothing when sessionId is empty', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      openCopilotSessionInNewTab('');
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('Deep-link parsing and URL cleanup simulation', () => {
    it('correctly reads copilot=1 and session from URLSearchParams and strips them via replaceState', () => {
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      const mockUrl = 'https://maxp.online/?copilot=1&session=sess_test_param&tab=orders';
      const parsedUrl = new URL(mockUrl);

      const isCopilot = parsedUrl.searchParams.get('copilot') === '1';
      const session = parsedUrl.searchParams.get('session');

      expect(isCopilot).toBe(true);
      expect(session).toBe('sess_test_param');

      // Emulate cleanup logic in MerchantCopilotHost
      parsedUrl.searchParams.delete('copilot');
      parsedUrl.searchParams.delete('session');

      const cleanQuery = parsedUrl.searchParams.toString();
      const cleanUrl = parsedUrl.pathname + (cleanQuery ? `?${cleanQuery}` : '');

      window.history.replaceState({}, '', cleanUrl);

      expect(mockReplaceState).toHaveBeenCalledWith({}, '', '/?tab=orders');
      expect(cleanUrl).not.toContain('copilot');
      expect(cleanUrl).not.toContain('sess_test_param');
    });
  });
});
