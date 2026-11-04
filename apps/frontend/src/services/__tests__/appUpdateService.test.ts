jest.mock('../../config/environment', () => ({
  isCapacitorNative: jest.fn(() => false),
}));

import {
  compareSemver,
  shouldShowUpdateModal,
  updateUrls,
  getCurrentAppVersion,
  checkAppUpdate,
  getAndroidDownloadUrl,
  UpdateCheckResult,
  AppVersionInfo,
} from '../appUpdateService';

describe('appUpdateService', () => {
  describe('compareSemver', () => {
    it('returns 0 for equal versions', () => {
      expect(compareSemver('1.0.7', '1.0.7')).toBe(0);
      expect(compareSemver('v1.0.7', '1.0.7')).toBe(0);
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('2.1.0', 'v2.1.0')).toBe(0);
    });

    it('returns -1 when current version is older', () => {
      expect(compareSemver('1.0.7', '1.0.8')).toBe(-1);
      expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
      expect(compareSemver('1.9.9', '2.0.0')).toBe(-1);
      expect(compareSemver('1.0', '1.0.1')).toBe(-1);
    });

    it('returns 1 when current version is newer', () => {
      expect(compareSemver('1.0.8', '1.0.7')).toBe(1);
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('1.2.0', '1.1.9')).toBe(1);
    });

    it('handles pre-release tags gracefully', () => {
      expect(compareSemver('1.0.7-beta', '1.0.8')).toBe(-1);
      expect(compareSemver('1.0.8-rc1', '1.0.7')).toBe(1);
      expect(compareSemver('1.0.7-beta', '1.0.7-prod')).toBe(0);
    });
  });

  describe('shouldShowUpdateModal', () => {
    const mockVersionInfo: AppVersionInfo = {
      platform: 'android',
      latestVersion: '1.0.8',
      latestVersionCode: 8,
      forceUpdate: false,
      downloadUrl: 'https://maxp.online/download/maxp.apk',
    };

    it('returns false if there is no update', () => {
      const result: UpdateCheckResult = {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: '1.0.8',
        currentVersionCode: 8,
        versionInfo: mockVersionInfo,
      };
      expect(shouldShowUpdateModal(result)).toBe(false);
    });

    it('returns true if update is mandatory, even if snoozed', () => {
      const result: UpdateCheckResult = {
        hasUpdate: true,
        isMandatory: true,
        currentVersion: '1.0.6',
        currentVersionCode: 6,
        versionInfo: {
          ...mockVersionInfo,
          forceUpdate: true,
        },
      };
      expect(shouldShowUpdateModal(result)).toBe(true);
    });

    it('returns true for optional update when not snoozed', () => {
      localStorage.clear();
      const result: UpdateCheckResult = {
        hasUpdate: true,
        isMandatory: false,
        currentVersion: '1.0.7',
        currentVersionCode: 7,
        versionInfo: mockVersionInfo,
      };
      expect(shouldShowUpdateModal(result)).toBe(true);
    });
  });

  describe('updateUrls', () => {
    it('returns an array of update URLs including relative and fallback endpoints', () => {
      const urls = updateUrls();
      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(0);
      expect(urls.some((u) => u.includes('/api/v1/app/version/android'))).toBe(true);
      expect(urls.some((u) => u.includes('https://maxp.online/api/v1/app/version/android'))).toBe(true);
    });
  });

  describe('getAndroidDownloadUrl', () => {
    it('returns raw URL when in standard web environment', () => {
      const url = getAndroidDownloadUrl('https://maxp.online/download/maxp.apk');
      expect(url).toBe('https://maxp.online/download/maxp.apk');
    });

    it('returns default fallback when no targetUrl is provided', () => {
      const url = getAndroidDownloadUrl();
      expect(url).toBe('https://maxp.online/download/maxp.apk');
    });
  });

  describe('getCurrentAppVersion & checkAppUpdate edge cases', () => {
    it('returns known: false when Capacitor App plugin is not available in web without debug flag', async () => {
      const current = await getCurrentAppVersion();
      expect(current.known).toBe(false);
      expect(current.version).toBe('1.2.1');
      expect(current.build).toBe(13);
    });

    it('returns fail-open APP_VERSION_UNKNOWN when current version is unknown', async () => {
      const result = await checkAppUpdate();
      expect(result.hasUpdate).toBe(false);
      expect(result.isMandatory).toBe(false);
      expect(result.error).toBe('APP_VERSION_UNKNOWN');
    });
  });
});
