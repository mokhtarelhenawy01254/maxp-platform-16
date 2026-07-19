import {
  isRequestCancelled,
  getErrorMessage,
  openCompanyStorefront,
  runActivationNextAction,
} from "../utils";
import { toneMap, DASHBOARD_CACHE_TTL_MS, DASHBOARD_SECTION_KEYS } from "../constants";

describe("dashboard utils", () => {
  describe("isRequestCancelled", () => {
    it("returns true for CanceledError", () => {
      expect(isRequestCancelled({ name: "CanceledError" })).toBe(true);
    });

    it("returns true for AbortError", () => {
      expect(isRequestCancelled({ name: "AbortError" })).toBe(true);
    });

    it("returns true for ERR_CANCELED", () => {
      expect(isRequestCancelled({ code: "ERR_CANCELED" })).toBe(true);
    });

    it("returns false for null/undefined", () => {
      expect(isRequestCancelled(null)).toBe(false);
      expect(isRequestCancelled(undefined)).toBe(false);
    });

    it("returns false for a regular error", () => {
      expect(isRequestCancelled(new Error("Something broke"))).toBe(false);
    });

    it("returns false for non-object types", () => {
      expect(isRequestCancelled("string")).toBe(false);
      expect(isRequestCancelled(42)).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("extracts message from response.data", () => {
      const error = {
        response: { data: { message: "Server error" } },
      };
      expect(getErrorMessage(error, "Fallback")).toBe("Server error");
    });

    it("extracts error from response.data when message is missing", () => {
      const error = {
        response: { data: { error: "Validation failed" } },
      };
      expect(getErrorMessage(error, "Fallback")).toBe("Validation failed");
    });

    it("returns error.message for regular errors", () => {
      const error = new Error("Network failure");
      expect(getErrorMessage(error, "Fallback")).toBe("Network failure");
    });

    it("returns fallback when error has no message", () => {
      expect(getErrorMessage({}, "Fallback")).toBe("Fallback");
    });

    it("returns fallback for null/undefined", () => {
      expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
      expect(getErrorMessage(undefined, "Fallback")).toBe("Fallback");
    });

    it("prefers response.data.message over error.message", () => {
      const error = new Error("Regular error");
      (error as any).response = { data: { message: "Response message" } };
      expect(getErrorMessage(error, "Fallback")).toBe("Response message");
    });
  });

  describe("openCompanyStorefront", () => {
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, "open").mockImplementation(jest.fn());
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it("opens the company storefront URL when slug exists", () => {
      const onNavigate = jest.fn();
      openCompanyStorefront({ id: "1", name: "Test", slug: "test-co" }, onNavigate);
      expect(window.open).toHaveBeenCalledWith(
        "https://test-co.maxp.online",
        "_blank",
        "noopener,noreferrer",
      );
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it("navigates to store settings when slug is missing", () => {
      const onNavigate = jest.fn();
      openCompanyStorefront({ id: "1", name: "Test", slug: null }, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/settings/store");
    });

    it("navigates to store settings when company is null", () => {
      const onNavigate = jest.fn();
      openCompanyStorefront(null, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/settings/store");
    });
  });

  describe("runActivationNextAction", () => {
    it("navigates to /products/new for catalog step", () => {
      const onNavigate = jest.fn();
      runActivationNextAction("catalog", null, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/products/new");
    });

    it("navigates to /products/new for undefined step", () => {
      const onNavigate = jest.fn();
      runActivationNextAction(undefined, null, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/products/new");
    });

    it("opens storefront for storefront step", () => {
      const windowOpenSpy = jest.spyOn(window, "open").mockImplementation(jest.fn());
      const onNavigate = jest.fn();
      runActivationNextAction("storefront", { id: "1", name: "Test", slug: "co" }, onNavigate);
      expect(window.open).toHaveBeenCalled();
      windowOpenSpy.mockRestore();
    });

    it("navigates to /whatsapp for channel step", () => {
      const onNavigate = jest.fn();
      runActivationNextAction("channel", null, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/whatsapp");
    });

    it("navigates to /orders/manual for orders step", () => {
      const onNavigate = jest.fn();
      runActivationNextAction("orders", null, onNavigate);
      expect(onNavigate).toHaveBeenCalledWith("/orders/manual");
    });
  });
});

describe("dashboard constants", () => {
  it("has a valid DASHBOARD_CACHE_TTL_MS", () => {
    expect(DASHBOARD_CACHE_TTL_MS).toBe(60000);
  });

  it("toneMap maps all expected tones", () => {
    expect(toneMap.blue).toBe("primary");
    expect(toneMap.purple).toBe("secondary");
    expect(toneMap.orange).toBe("warning");
    expect(toneMap.green).toBe("success");
  });

  it("DASHBOARD_SECTION_KEYS has expected sections", () => {
    expect(DASHBOARD_SECTION_KEYS).toContain("companyDashboard.financials");
    expect(DASHBOARD_SECTION_KEYS).toContain("companyDashboard.rangeStats");
    expect(DASHBOARD_SECTION_KEYS).toContain("companyDashboard.operations");
  });
});
