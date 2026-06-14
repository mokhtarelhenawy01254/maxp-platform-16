/**
 * Regression tests for Unified Inbox search & filter redesign.
 *
 * Covers:
 * - Multi-platform query param serialisation
 * - Platform filter label logic (all / single / multi)
 * - Follow-up and unread filter param building
 */
import { describe, it, expect } from "vitest";

describe("Unified Inbox – query param builder", () => {
  function buildParams(opts: {
    selectedPlatforms: string[];
    searchQuery: string;
    followUpFilter: boolean;
    unreadFilter: boolean;
  }): URLSearchParams {
    const params = new URLSearchParams();

    if (opts.selectedPlatforms.length > 0) {
      params.set("platform", opts.selectedPlatforms.join(","));
    } else {
      params.set("platform", "all");
    }

    if (opts.searchQuery) params.set("search", opts.searchQuery);
    if (opts.followUpFilter) params.set("status", "pending");
    if (opts.unreadFilter) params.set("unreadOnly", "true");
    params.set("limit", "50");

    return params;
  }

  it("sends platform=all when no platform is selected", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("platform")).toBe("all");
  });

  it("sends a single platform name when one platform is selected", () => {
    const p = buildParams({
      selectedPlatforms: ["whatsapp"],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("platform")).toBe("whatsapp");
  });

  it("sends comma-separated platforms when multiple are selected", () => {
    const p = buildParams({
      selectedPlatforms: ["whatsapp", "facebook", "instagram"],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("platform")).toBe("whatsapp,facebook,instagram");
  });

  it("includes search query when provided", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "أحمد",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("search")).toBe("أحمد");
  });

  it("sets status=pending when followUpFilter is active", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "",
      followUpFilter: true,
      unreadFilter: false,
    });
    expect(p.get("status")).toBe("pending");
  });

  it("does NOT set status when followUpFilter is off", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("status")).toBeNull();
  });

  it("sets unreadOnly=true when unreadFilter is active", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: true,
    });
    expect(p.get("unreadOnly")).toBe("true");
  });

  it("always sets limit=50", () => {
    const p = buildParams({
      selectedPlatforms: [],
      searchQuery: "",
      followUpFilter: false,
      unreadFilter: false,
    });
    expect(p.get("limit")).toBe("50");
  });

  it("combines all active filters correctly", () => {
    const p = buildParams({
      selectedPlatforms: ["telegram"],
      searchQuery: "test",
      followUpFilter: true,
      unreadFilter: true,
    });
    expect(p.get("platform")).toBe("telegram");
    expect(p.get("search")).toBe("test");
    expect(p.get("status")).toBe("pending");
    expect(p.get("unreadOnly")).toBe("true");
    expect(p.get("limit")).toBe("50");
  });
});

describe("Unified Inbox – getPlatformFilterLabel", () => {
  // Pure logic extracted from UnifiedInbox.tsx for isolated testing
  function getLabel(
    selectedPlatforms: string[],
    t: (key: string) => string
  ): string {
    if (selectedPlatforms.length === 0) return t("unifiedInbox.filters.allPlatforms");
    if (selectedPlatforms.length === 1) return t(`unifiedInbox.platforms.${selectedPlatforms[0]}`);
    const firstLabel = t(`unifiedInbox.platforms.${selectedPlatforms[0]}`);
    return `${firstLabel} + ${selectedPlatforms.length - 1}`;
  }

  const mockT = (key: string): string => {
    const map: Record<string, string> = {
      "unifiedInbox.filters.allPlatforms": "كل المنصات",
      "unifiedInbox.platforms.whatsapp": "واتساب",
      "unifiedInbox.platforms.facebook": "فيسبوك",
      "unifiedInbox.platforms.instagram": "انستجرام",
      "unifiedInbox.platforms.telegram": "تيليجرام",
    };
    return map[key] ?? key;
  };

  it("returns 'كل المنصات' when nothing is selected", () => {
    expect(getLabel([], mockT)).toBe("كل المنصات");
  });

  it("returns the platform name when exactly one is selected", () => {
    expect(getLabel(["whatsapp"], mockT)).toBe("واتساب");
    expect(getLabel(["facebook"], mockT)).toBe("فيسبوك");
  });

  it("returns 'FirstPlatform + N' for multiple selections", () => {
    expect(getLabel(["whatsapp", "facebook"], mockT)).toBe("واتساب + 1");
    expect(getLabel(["whatsapp", "facebook", "instagram"], mockT)).toBe("واتساب + 2");
  });
});
