import React from "react";
import {
  resilientImport,
  extractChunkName,
  clearChunkReloadFlag,
} from "../resilientLazy";
import { performPurgeAndReload } from "../chunkLoadRecovery";
import errorTracking from "../../services/errorTracking";

jest.mock("../chunkLoadRecovery", () => ({
  performPurgeAndReload: jest.fn().mockResolvedValue(undefined),
  emergencyPurgeAndHardReload: jest.fn().mockResolvedValue(undefined),
  isChunkLoadError: jest.fn().mockReturnValue(true),
}));

jest.mock("../../services/errorTracking", () => ({
  logError: jest.fn(),
}));

describe("resilientLazy", () => {
  const sessionStore = new Map<string, string>();

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStore.clear();

    if (jest.isMockFunction(window.sessionStorage.getItem)) {
      (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => sessionStore.get(key) ?? null);
      (window.sessionStorage.setItem as jest.Mock).mockImplementation((key: string, val: string) => sessionStore.set(key, String(val)));
      (window.sessionStorage.removeItem as jest.Mock).mockImplementation((key: string) => sessionStore.delete(key));
      (window.sessionStorage.clear as jest.Mock).mockImplementation(() => sessionStore.clear());
    }

    clearChunkReloadFlag("MyDashboard");
    clearChunkReloadFlag("TestComponent");
  });

  describe("extractChunkName", () => {
    it("extracts chunk name from string parameter", () => {
      expect(extractChunkName("MyDashboard")).toBe("MyDashboard");
    });

    it("extracts chunk name from function string or path", () => {
      expect(extractChunkName(() => import("./pages/employee/MyDashboard"))).toBe("MyDashboard");
    });

    it("extracts chunk name from import without file extension", () => {
      expect(extractChunkName(() => import("../sections/ProductInfo"))).toBe("ProductInfo");
    });

    it("falls back to unknown-chunk if not determinable", () => {
      expect(extractChunkName(() => Promise.resolve({}))).toBe("unknown-chunk");
    });
  });

  describe("resilientImport lifecycle", () => {
    const DummyComponent: React.FC = () => React.createElement("div", null, "Hello");

    it("resolves immediately when first attempt succeeds", async () => {
      const importer = jest.fn().mockResolvedValue({ default: DummyComponent });

      const result = await resilientImport(importer, "TestComponent");

      expect(result.default).toBe(DummyComponent);
      expect(importer).toHaveBeenCalledTimes(1);
      expect(performPurgeAndReload).not.toHaveBeenCalled();
    });

    it("retries and resolves when first attempt returns undefined (Vite preload error symptom)", async () => {
      let callCount = 0;
      const importer = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return undefined; // Simulating Vite returning undefined on preloadError
        }
        return { default: DummyComponent };
      });

      const result = await resilientImport(importer, "TestComponent");

      expect(result.default).toBe(DummyComponent);
      expect(importer).toHaveBeenCalledTimes(2);
      expect(performPurgeAndReload).not.toHaveBeenCalled();
    });

    it("retries and resolves when first attempt throws a network error", async () => {
      let callCount = 0;
      const importer = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new TypeError("Failed to fetch dynamically imported module");
        }
        return { default: DummyComponent };
      });

      const result = await resilientImport(importer, "TestComponent");

      expect(result.default).toBe(DummyComponent);
      expect(importer).toHaveBeenCalledTimes(2);
      expect(performPurgeAndReload).not.toHaveBeenCalled();
    });

    it("triggers performPurgeAndReload once when retry also fails (first episode)", async () => {
      const importer = jest.fn().mockRejectedValue(
        new TypeError("Failed to fetch dynamically imported module: chunk-deleted.js")
      );

      const result = await resilientImport(importer, "MyDashboard");

      // Verifies reload was scheduled
      expect(performPurgeAndReload).toHaveBeenCalledTimes(1);
      // Verifies error logged to telemetry with chunk name
      expect(errorTracking.logError).toHaveBeenCalledWith(
        expect.stringContaining("ResilientLazy chunk reload triggered: MyDashboard"),
        expect.any(Error),
        expect.objectContaining({ chunkName: "MyDashboard" })
      );
      // Verifies reload flag recorded in sessionStorage
      expect(window.sessionStorage.getItem("maxp:resilient-lazy:reloaded:MyDashboard")).toBe("1");
      // Result contains placeholder component so React doesn't crash during reload
      expect(typeof result.default).toBe("function");
    });

    it("returns ResilientUpdateFallback when chunk fails again after reload was already attempted", async () => {
      // Simulate that reload was already attempted in this session
      window.sessionStorage.setItem("maxp:resilient-lazy:reloaded:MyDashboard", "1");

      const importer = jest.fn().mockRejectedValue(
        new TypeError("Failed to fetch dynamically imported module: chunk-deleted.js")
      );

      const result = await resilientImport(importer, "MyDashboard");

      // Does NOT trigger a second reload loop
      expect(performPurgeAndReload).not.toHaveBeenCalled();
      // Logs persistent failure
      expect(errorTracking.logError).toHaveBeenCalledWith(
        expect.stringContaining("ResilientLazy chunk persistent failure: MyDashboard"),
        expect.any(Error),
        expect.objectContaining({ chunkName: "MyDashboard", persistent: true })
      );
      // Returns fallback component
      expect(typeof result.default).toBe("function");
    });
  });
});
