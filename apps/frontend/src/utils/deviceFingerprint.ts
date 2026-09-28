/**
 * Persistent device fingerprint & classification utility for web clients
 */
const STORAGE_KEY = 'maxp_device_fingerprint';
const DEVICE_TYPE_KEY = 'maxp_device_type';

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';

  let fp = localStorage.getItem(STORAGE_KEY);
  if (!fp) {
    const randomHex = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).substring(2, 15);
    fp = `web_${randomHex}`;
    try {
      localStorage.setItem(STORAGE_KEY, fp);
      document.cookie = `${STORAGE_KEY}=${fp}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Safe fallback
    }
  }
  return fp;
}

export function getCachedDeviceType(): 'OFFICE' | 'PERSONAL' {
  if (typeof window === 'undefined') return 'PERSONAL';
  const val = localStorage.getItem(DEVICE_TYPE_KEY);
  return val === 'OFFICE' ? 'OFFICE' : 'PERSONAL';
}

export function setCachedDeviceType(type: 'OFFICE' | 'PERSONAL'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICE_TYPE_KEY, type);
  } catch {
    // Safe fallback
  }
}

export function isOfficeDevice(): boolean {
  return getCachedDeviceType() === 'OFFICE';
}

export function isPersonalDevice(): boolean {
  return getCachedDeviceType() === 'PERSONAL';
}
