export type FacebookPageSyncPayload = {
  companyId?: string | null;
  timestamp: number;
};

const FACEBOOK_PAGE_SYNC_EVENT = "facebook-page-sync";
const FACEBOOK_PAGE_SYNC_STORAGE_KEY = "facebook-page-sync";

const parseFacebookPageSyncPayload = (
  rawValue: string | null,
): FacebookPageSyncPayload | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<FacebookPageSyncPayload>;
    return {
      companyId:
        typeof parsed.companyId === "string" ? parsed.companyId : parsed.companyId ?? null,
      timestamp:
        typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
    };
  } catch {
    return null;
  }
};

export const emitFacebookPageSync = (companyId?: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: FacebookPageSyncPayload = {
    companyId: companyId ?? null,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent<FacebookPageSyncPayload>(FACEBOOK_PAGE_SYNC_EVENT, {
      detail: payload,
    }),
  );

  try {
    window.localStorage.setItem(
      FACEBOOK_PAGE_SYNC_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn("Failed to write Facebook page sync event to storage", error);
  }
};

export const subscribeToFacebookPageSync = (
  callback: (payload: FacebookPageSyncPayload) => void,
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleWindowEvent = (event: Event) => {
    const customEvent = event as CustomEvent<FacebookPageSyncPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== FACEBOOK_PAGE_SYNC_STORAGE_KEY) {
      return;
    }

    const payload = parseFacebookPageSyncPayload(event.newValue);
    if (payload) {
      callback(payload);
    }
  };

  window.addEventListener(
    FACEBOOK_PAGE_SYNC_EVENT,
    handleWindowEvent as EventListener,
  );
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(
      FACEBOOK_PAGE_SYNC_EVENT,
      handleWindowEvent as EventListener,
    );
    window.removeEventListener("storage", handleStorageEvent);
  };
};
