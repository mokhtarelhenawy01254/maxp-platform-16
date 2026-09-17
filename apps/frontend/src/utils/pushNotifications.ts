/**
 * Browser push notifications — permanently disabled.
 * Service Worker push is fully removed to prevent caching/PWA conflicts.
 * Only stub exports remain so existing import sites compile without errors.
 */

export interface BrowserPushState {
  active: false;
  endpoint: null;
  updatedAt: string;
}

// Browser push via Service Worker is permanently disabled
export const isBrowserPushSupported = () => false;
export const isBrowserPushActive = () => false;

export const readBrowserPushState = (): BrowserPushState | null => null;

export const subscribeToBrowserPush = async (): Promise<never> => {
  throw new Error("push_not_supported");
};

export const unsubscribeFromBrowserPush = async (): Promise<BrowserPushState> => ({
  active: false,
  endpoint: null,
  updatedAt: new Date().toISOString(),
});

export const syncBrowserPushSubscription = async (
  enabled: boolean,
): Promise<BrowserPushState | never> => {
  if (!enabled) {
    return unsubscribeFromBrowserPush();
  }
  return subscribeToBrowserPush();
};
