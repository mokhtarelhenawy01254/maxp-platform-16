// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SidebarSettingsProvider,
  invalidateSidebarSettingsCache,
  useSidebarSettings,
} from "../SidebarSettingsContext";
import { apiClient } from "../../services/apiClient";

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const Probe: React.FC<{ onValue: (val: ReturnType<typeof useSidebarSettings>) => void }> = ({
  onValue,
}) => {
  const ctx = useSidebarSettings();
  React.useEffect(() => {
    onValue(ctx);
  }, [ctx, onValue]);
  return null;
};

describe("SidebarSettingsContext education session caching", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSidebarSettingsCache();
    sessionStorage.clear();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/user/settings") {
        return Promise.resolve({ data: { success: true, data: { sidebarLayout: null } } });
      }
      if (url === "/settings/sidebar") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              settings: [],
              educationSettings: {
                systemTitle: "النظام التعليمي",
                tabs: [{ id: "teachers", key: "/admin/education/teachers", labelAr: "المدرسين", order: 0, visible: true }],
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  it("loads /settings/sidebar once per company session and reuses cache across remounts without fetching on every render", async () => {
    const seen: any[] = [];
    const { unmount } = render(
      <SidebarSettingsProvider companyId="comp-A">
        <Probe onValue={(v) => seen.push(v)} />
      </SidebarSettingsProvider>,
    );

    await waitFor(() => {
      expect(seen.some((s) => s.educationSettings?.systemTitle === "النظام التعليمي")).toBe(true);
    });

    const sidebarFetchesAfterFirst = (apiClient.get as any).mock.calls.filter(
      (c: any[]) => c[0] === "/settings/sidebar",
    ).length;
    expect(sidebarFetchesAfterFirst).toBe(1);

    // Remounting for the same companyId uses session cache (no extra /settings/sidebar call)
    unmount();
    const seen2: any[] = [];
    render(
      <SidebarSettingsProvider companyId="comp-A">
        <Probe onValue={(v) => seen2.push(v)} />
      </SidebarSettingsProvider>,
    );

    expect(seen2[0]?.educationSettings?.systemTitle).toBe("النظام التعليمي");
    const sidebarFetchesAfterSecond = (apiClient.get as any).mock.calls.filter(
      (c: any[]) => c[0] === "/settings/sidebar",
    ).length;
    expect(sidebarFetchesAfterSecond).toBe(1);
  });

  it("invalidates cache and refetches on education-settings-updated and company:switched events", async () => {
    const seen: any[] = [];
    render(
      <SidebarSettingsProvider companyId="comp-B">
        <Probe onValue={(v) => seen.push(v)} />
      </SidebarSettingsProvider>,
    );

    await waitFor(() => {
      expect(seen.some((s) => s.educationSettings?.systemTitle === "النظام التعليمي")).toBe(true);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("education-settings-updated", {
          detail: {
            systemTitle: "أكاديمية المطورين",
            tabs: [{ id: "teachers", key: "/admin/education/teachers", labelAr: "المدربين", order: 0, visible: true }],
          },
        }),
      );
    });

    await waitFor(() => {
      expect(seen[seen.length - 1]?.educationSettings?.systemTitle).toBe("أكاديمية المطورين");
    });

    const fetchesAfterUpdate = (apiClient.get as any).mock.calls.filter(
      (c: any[]) => c[0] === "/settings/sidebar",
    ).length;
    expect(fetchesAfterUpdate).toBe(2);

    act(() => {
      window.dispatchEvent(new CustomEvent("company:switched", { detail: { companyId: "comp-C" } }));
    });

    await waitFor(() => {
      const fetchesAfterSwitch = (apiClient.get as any).mock.calls.filter(
        (c: any[]) => c[0] === "/settings/sidebar",
      ).length;
      expect(fetchesAfterSwitch).toBe(3);
    });
  });
});
