import {
  isChunkLoadError,
  recoverFromChunkLoadError,
  resetChunkLoadRecovery,
} from "../chunkLoadRecovery";
import { clearAllSWCaches } from "../swCacheFlush";

jest.mock("../swCacheFlush", () => ({
  clearAllSWCaches: jest.fn().mockResolvedValue(true),
}));

const flushKeys = () => {
  window.sessionStorage.clear();
};

describe("chunkLoadRecovery", () => {
  it("detects Vite dynamic import fetch failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://maxp.online/assets/SuperAdminUsersManagement-D8Hbzj6W.js",
        ),
      ),
    ).toBe(true);
  });

  it("detects preload and chunk load failures across browsers", () => {
    expect(isChunkLoadError(new Error("vite:preloadError"))).toBe(true);
    expect(isChunkLoadError(new Error("ChunkLoadError: Loading chunk 42 failed"))).toBe(
      true,
    );
    expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
  });

  it("detects corrupted browser cache failures for Vite optimized deps", () => {
    expect(
      isChunkLoadError(
        "Failed to load resource: net::ERR_CACHE_READ_FAILURE http://localhost:3001/node_modules/.vite/deps/chunk-AVDUTSVO.js",
      ),
    ).toBe(true);
  });

  it("detects dynamic import undefined default chunk failure", () => {
    expect(
      isChunkLoadError(
        new TypeError("Cannot read properties of undefined (reading 'default')"),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new TypeError("Cannot read property 'default' of undefined"),
      ),
    ).toBe(true);
  });

  it("ignores unrelated runtime errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'id')"))).toBe(
      false,
    );
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(
      false,
    );
  });

  describe("auto-reload budget", () => {
    const chunkError = new TypeError(
      "Failed to fetch dynamically imported module: https://maxp.online/assets/route-auth-DELETED.js",
    );

    const originalLocation = window.location;

    beforeEach(() => {
      resetChunkLoadRecovery();
      flushKeys();
      (clearAllSWCaches as jest.Mock).mockClear();
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it("allows exactly one automatic recovery reload per failure episode", () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, reload: reloadMock },
        writable: true,
        configurable: true,
      });

      expect(recoverFromChunkLoadError(chunkError, "bootstrap")).toBe(true);

      // Simulate the 15s guard window having passed: only the attempt
      // timestamp is stale, the reload budget must still hold.
      window.sessionStorage.removeItem("maxp:chunk-load-recovery:last-attempt");

      expect(recoverFromChunkLoadError(chunkError, "bootstrap")).toBe(false);
      expect(clearAllSWCaches).toHaveBeenCalledTimes(1);
    });

    it("re-arms the budget after resetChunkLoadRecovery (healthy boot)", () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, reload: reloadMock },
        writable: true,
        configurable: true,
      });

      expect(recoverFromChunkLoadError(chunkError, "vite-preload")).toBe(true);
      window.sessionStorage.removeItem("maxp:chunk-load-recovery:last-attempt");
      expect(recoverFromChunkLoadError(chunkError, "vite-preload")).toBe(false);

      resetChunkLoadRecovery();

      expect(recoverFromChunkLoadError(chunkError, "vite-preload")).toBe(true);
    });

    it("resets budget and purges caches during emergencyPurgeAndHardReload", async () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, reload: reloadMock },
        writable: true,
        configurable: true,
      });

      // Max out budget
      expect(recoverFromChunkLoadError(chunkError, "bootstrap")).toBe(true);
      window.sessionStorage.removeItem("maxp:chunk-load-recovery:last-attempt");
      expect(recoverFromChunkLoadError(chunkError, "bootstrap")).toBe(false);

      // Execute manual emergency recovery
      const { emergencyPurgeAndHardReload } = await import("../chunkLoadRecovery");
      await emergencyPurgeAndHardReload();

      // Budget must be re-armed for the next episode
      expect(recoverFromChunkLoadError(chunkError, "bootstrap")).toBe(true);
      expect(clearAllSWCaches).toHaveBeenCalled();
    });
  });
});
