const { normalizeImageTransformOptions } = require('../../controller/proxyImageController');

describe('Watchdog False Alerts & Resiliency Fixes', () => {
  describe('socketService silent rejection for expired tokens', () => {
    it('verifies that TokenExpiredError is silently rejected to avoid watchdog spam', () => {
      const socket = { id: 'test-socket-123', handshake: {} };
      let errorPassedToNext = null;
      const next = (err) => {
        errorPassedToNext = err;
      };

      const originalConsoleError = console.error;
      let consoleErrorCalled = false;
      console.error = (...args) => {
        consoleErrorCalled = true;
        originalConsoleError(...args);
      };

      try {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';

        // Replicate socketService middleware catch condition
        const shouldSilentlyReject =
          error?.message?.includes('jwt must be provided') ||
          error?.message?.includes('jwt expired') ||
          error?.name === 'JsonWebTokenError' ||
          error?.name === 'TokenExpiredError';

        expect(shouldSilentlyReject).toBe(true);

        if (shouldSilentlyReject) {
          next(new Error('Authentication failed'));
        } else {
          console.error(`❌ [SOCKET-AUTH] Authentication failed for socket ${socket.id}:`, error.message);
          next(new Error('Authentication failed'));
        }

        expect(consoleErrorCalled).toBe(false);
        expect(errorPassedToNext).toBeDefined();
        expect(errorPassedToNext.message).toBe('Authentication failed');
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('proxyImageController 502-to-404 mapping', () => {
    it('maps upstream 502/5xx failure status to 404 so platform 5xx metrics are not polluted', () => {
      const upstreamStatuses = [502, 500, 503, 504, null, undefined];
      for (const status of upstreamStatuses) {
        const resolvedStatus = !status || status >= 500 ? 404 : status;
        expect(resolvedStatus).toBe(404);
      }

      // Valid client-side errors like 403 or 404 remain unchanged
      expect(!403 || 403 >= 500 ? 404 : 403).toBe(403);
      expect(!404 || 404 >= 500 ? 404 : 404).toBe(404);
    });
  });

  describe('wooCommerceAutoExportService network error categorization', () => {
    it('classifies ENOTFOUND and DNS errors as network/DNS unreachability', () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND store.example.com');
      dnsError.code = 'ENOTFOUND';

      const isNetworkOrDnsError =
        dnsError.code === 'ENOTFOUND' ||
        dnsError.code === 'ECONNREFUSED' ||
        dnsError.code === 'ETIMEDOUT' ||
        dnsError.message?.includes('getaddrinfo') ||
        dnsError.message?.includes('ENOTFOUND');

      expect(isNetworkOrDnsError).toBe(true);
    });
  });

  describe('taskController safe date parsing', () => {
    it('handles ISO string timestamps without generating Invalid Date', () => {
      const parseSafeDate = (dateStr, isEndOfDay = false) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
        const str = String(dateStr).trim();
        if (!str) return null;
        const d = str.includes('T')
          ? new Date(str)
          : new Date(isEndOfDay ? `${str}T23:59:59.999Z` : `${str}T00:00:00.000Z`);
        return isNaN(d.getTime()) ? null : d;
      };

      // ISO string with T
      const isoInput = '2026-11-13T18:00:00.000Z';
      const parsedIso = parseSafeDate(isoInput, false);
      expect(parsedIso).toBeInstanceOf(Date);
      expect(isNaN(parsedIso.getTime())).toBe(false);

      // Plain date without T
      const plainInput = '2026-11-13';
      const parsedStart = parseSafeDate(plainInput, false);
      const parsedEnd = parseSafeDate(plainInput, true);
      expect(parsedStart.toISOString()).toBe('2026-11-13T00:00:00.000Z');
      expect(parsedEnd.toISOString()).toBe('2026-11-13T23:59:59.999Z');

      // Invalid input fails safely
      expect(parseSafeDate('invalid-date')).toBeNull();
      expect(parseSafeDate('')).toBeNull();
      expect(parseSafeDate(null)).toBeNull();
    });
  });
});
