// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllSWCaches,
  clearNonPortalSWCaches,
  flushSWCacheAndReload,
  PORTAL_SHELL_CACHE_NAME,
} from "../swCacheFlush";
import { getPortalKeyFromPath, getPortalSwScope } from "../../config/portals";

function makeRegistration(scriptURL: string, slot: "active" | "waiting" | "installing" = "active") {
  const unregister = vi.fn().mockResolvedValue(true);
  const reg = {
    active: slot === "active" ? { scriptURL } : null,
    waiting: slot === "waiting" ? { scriptURL } : null,
    installing: slot === "installing" ? { scriptURL } : null,
    unregister,
  } as unknown as ServiceWorkerRegistration;
  return { reg, unregister };
}

describe("swCacheFlush", () => {
  const originalCaches = window.caches;
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: originalCaches,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: originalServiceWorker,
    });
  });

  it("clearAllSWCaches deletes all caches and unregisters all service workers", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    const keysMock = vi.fn().mockResolvedValue(["pages-v1", PORTAL_SHELL_CACHE_NAME]);
    const legacy = makeRegistration("https://maxp.online/sw.js");
    const portalSw = makeRegistration("https://maxp.online/sw-portal.js");

    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: { keys: keysMock, delete: deleteMock },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([legacy.reg, portalSw.reg]),
      },
    });

    const result = await clearAllSWCaches();
    expect(result).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("pages-v1");
    expect(deleteMock).toHaveBeenCalledWith(PORTAL_SHELL_CACHE_NAME);
    expect(legacy.unregister).toHaveBeenCalledTimes(1);
    expect(portalSw.unregister).toHaveBeenCalledTimes(1);
  });

  it("clearNonPortalSWCaches keeps maxp-portal-shell-v1 and /sw-portal.js while purging legacy caches and SWs", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    const keysMock = vi.fn().mockResolvedValue([
      "pages-v1",
      "assets-v2",
      PORTAL_SHELL_CACHE_NAME,
    ]);
    const legacyActive = makeRegistration("https://maxp.online/sw.js", "active");
    const legacyWaiting = makeRegistration("https://maxp.online/push-sw.js", "waiting");
    const portalActive = makeRegistration("https://maxp.online/sw-portal.js", "active");
    const portalInstalling = makeRegistration("https://maxp.online/sw-portal.js", "installing");

    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: { keys: keysMock, delete: deleteMock },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([
            legacyActive.reg,
            legacyWaiting.reg,
            portalActive.reg,
            portalInstalling.reg,
          ]),
      },
    });

    const result = await clearNonPortalSWCaches();
    expect(result).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("pages-v1");
    expect(deleteMock).toHaveBeenCalledWith("assets-v2");
    expect(deleteMock).not.toHaveBeenCalledWith(PORTAL_SHELL_CACHE_NAME);
    expect(legacyActive.unregister).toHaveBeenCalledTimes(1);
    expect(legacyWaiting.unregister).toHaveBeenCalledTimes(1);
    expect(portalActive.unregister).not.toHaveBeenCalled();
    expect(portalInstalling.unregister).not.toHaveBeenCalled();
  });

  it("flushSWCacheAndReload triggers cache clear and reloads window location", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    const keysMock = vi.fn().mockResolvedValue(["test-cache"]);
    const reloadMock = vi.fn();

    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: { keys: keysMock, delete: deleteMock },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]) },
    });

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    await flushSWCacheAndReload();

    expect(deleteMock).toHaveBeenCalledWith("test-cache");
    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("getPortalSwScope and getPortalKeyFromPath resolve portal scopes accurately", () => {
    expect(getPortalSwScope("/parent/dashboard")).toBe("/parent/");
    expect(getPortalSwScope("/teacher/schedule")).toBe("/teacher/");
    expect(getPortalSwScope("/doctor/patients")).toBe("/doctor/");
    expect(getPortalSwScope("/patient/history")).toBe("/patient/");
    expect(getPortalSwScope("/dental-portal/cases")).toBe("/dental-portal/");
    expect(getPortalSwScope("/courier-portal")).toBe("/courier-portal/");
    expect(getPortalSwScope("/account/cashback")).toBe("/account/");
    expect(getPortalSwScope("/wholesale-portal/orders")).toBe("/wholesale-portal/");
    expect(getPortalSwScope("/client-portal/abc")).toBe("/client-portal/");
    expect(getPortalSwScope("/agency/client-portal/tok")).toBe("/agency/client-portal/");
    expect(getPortalSwScope("/portal/my-courses")).toBe("/portal/");
    expect(getPortalSwScope("/academy/portal")).toBe("/academy/");
    expect(getPortalSwScope("/academy/dashboard")).toBeNull();
    expect(getPortalSwScope("/academy/courses")).toBeNull();
    expect(getPortalSwScope("/client-portal/shipping")).toBeNull();
    expect(getPortalSwScope("/portal/production/tok")).toBeNull();
    expect(getPortalSwScope("/dashboard")).toBeNull();
    expect(getPortalSwScope("/parenting")).toBeNull();

    expect(getPortalKeyFromPath("/parent/dashboard")).toBe("parent");
    expect(getPortalKeyFromPath("/portal/production/tok")).toBe("production");
    expect(getPortalKeyFromPath("/academy/dashboard")).toBeNull();
    expect(getPortalKeyFromPath("/orders")).toBeNull();
  });
});
