// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { fetchJson } from "../api";
import { useEducationSettingsController } from "../useEducationSettingsController";

vi.mock("../api", () => ({
  api: (path: string) => `mock:${path}`,
  fetchJson: vi.fn(),
}));

vi.mock("../../../contexts/SidebarSettingsContext", () => ({
  useSidebarSettings: () => ({ refreshSettings: vi.fn() }),
}));

const tabFixture = (
  overrides: Partial<{
    id: string;
    locked: boolean;
    visible: boolean;
    defaultLabelAr: string;
    defaultLabelEn: string;
    labelAr: string;
    labelEn: string;
    order: number;
    iconName: string;
  }> = {},
) => ({
  id: overrides.id ?? "dashboard",
  key: overrides.id ?? "dashboard",
  defaultLabelAr: overrides.defaultLabelAr ?? "لوحة التحكم",
  defaultLabelEn: overrides.defaultLabelEn ?? "Dashboard",
  labelAr: overrides.labelAr ?? overrides.defaultLabelAr ?? "لوحة التحكم",
  labelEn: overrides.labelEn ?? overrides.defaultLabelEn ?? "Dashboard",
  order: overrides.order ?? 0,
  visible: overrides.visible ?? true,
  locked: overrides.locked ?? false,
  iconName: overrides.iconName ?? "Layers",
});

const settingsFixture = {
  systemTitle: "النظام التعليمي",
  systemTitleEn: "Education System",
  educationMode: "COURSES",
  enableSubjects: false,
  enableDemoDay: false,
  pushFirstSaveWhatsApp: true,
  companySlug: "test-edu",
  publicCode: "EDU1",
  customDomain: null,
  tabs: [
    tabFixture({ id: "dashboard", locked: true, visible: true, order: 0 }),
    tabFixture({
      id: "subjects",
      defaultLabelAr: "المواد الدراسية",
      defaultLabelEn: "Subjects",
      labelAr: "المواد الدراسية",
      labelEn: "Subjects",
      visible: false,
      order: 1,
      iconName: "BookOpen",
    }),
    tabFixture({
      id: "demo-day",
      defaultLabelAr: "الديمو داي",
      defaultLabelEn: "Demo Day",
      labelAr: "الديمو داي",
      labelEn: "Demo Day",
      visible: true,
      order: 2,
      iconName: "Presentation",
    }),
    tabFixture({
      id: "packages",
      defaultLabelAr: "الباقات",
      defaultLabelEn: "Packages",
      labelAr: "الباقات",
      labelEn: "Packages",
      visible: true,
      order: 3,
      iconName: "Gift",
    }),
  ],
};

describe("useEducationSettingsController", () => {
  let putCalls: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    putCalls = [];
    (fetchJson as ReturnType<typeof vi.fn>).mockImplementation(
      async (_url: string, init?: { method?: string; body?: string }) => {
        if (init?.method === "PUT") {
          putCalls.push(JSON.parse(init.body!));
          return {};
        }
        return JSON.parse(JSON.stringify(settingsFixture));
      },
    );
  });

  afterEach(() => {
    cleanup();
  });

  async function setup() {
    const { result } = renderHook(() => useEducationSettingsController());
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
  }

  it("loads settings, starts clean (not dirty), subjects hidden follows enableSubjects", async () => {
    const result = await setup();
    expect(result.current.educationMode).toBe("COURSES");
    expect(result.current.enableDemoDay).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.tabs[0]!.locked).toBe(true);
  });

  it("save PUT matches legacy payload shape: no enableDemoDay key, subjects follows flag, locked stays visible, trims and falls back to defaults", async () => {
    const result = await setup();
    act(() => {
      result.current.updateLabel(3, "ar", "  الباقات المعدلة  ");
      result.current.updateLabel(0, "en", "   ");
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(putCalls).toHaveLength(1);
    const body = putCalls[0]!;
    expect(body).not.toHaveProperty("enableDemoDay");
    expect(body.educationMode).toBe("COURSES");
    expect(body.enableSubjects).toBe(false);
    expect(body.pushFirstSaveWhatsApp).toBe(true);
    expect(body.tabs).toHaveLength(4);

    const locked = body.tabs.find((t: any) => t.id === "dashboard");
    expect(locked.visible).toBe(true); // locked stays visible
    expect(locked.labelEn).toBe("Dashboard"); // blank falls back to default

    const subjects = body.tabs.find((t: any) => t.id === "subjects");
    expect(subjects.visible).toBe(false); // follows enableSubjects=false
    expect(subjects.order).toBe(1);

    const packages = body.tabs.find((t: any) => t.id === "packages");
    expect(packages.labelAr).toBe("الباقات المعدلة"); // trimmed
    expect(packages.visible).toBe(true);

    // savedSnap updated after save → not dirty anymore
    expect(result.current.isDirty).toBe(false);
  });

  it("demo day toggle PUT includes enableDemoDay:true and demo-day visibility (legacy parity)", async () => {
    const result = await setup();
    await act(async () => {
      await result.current.handleToggleDemoDay(true);
    });
    expect(putCalls).toHaveLength(1);
    const body = putCalls[0]!;
    expect(body.enableDemoDay).toBe(true);
    const demo = body.tabs.find((t: any) => t.id === "demo-day");
    expect(demo.visible).toBe(true);
    expect(result.current.enableDemoDay).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it("mode change with dirty state is gated: pendingMode set first, then confirmed save carries labels + enableSubjects", async () => {
    const result = await setup();
    act(() => {
      result.current.updateLabel(0, "ar", "لوحة معدلة");
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.handleModeChange("ACADEMIC");
    });
    expect(result.current.pendingMode).toBe("ACADEMIC");
    expect(putCalls).toHaveLength(0); // gated — no implicit save

    await act(async () => {
      await result.current.confirmPendingMode();
    });
    expect(result.current.pendingMode).toBe(null);
    expect(putCalls).toHaveLength(1);
    const body = putCalls[0]!;
    expect(body.educationMode).toBe("ACADEMIC");
    expect(body.enableSubjects).toBe(true);
    const subjects = body.tabs.find((t: any) => t.id === "subjects");
    expect(subjects.visible).toBe(true);
    const dashboard = body.tabs.find((t: any) => t.id === "dashboard");
    expect(dashboard.labelAr).toBe("لوحة معدلة"); // saved together
  });

  it("clean mode change saves immediately without dialog", async () => {
    const result = await setup();
    act(() => {
      result.current.handleModeChange("ACADEMIC");
    });
    expect(result.current.pendingMode).toBe(null);
    await waitFor(() => expect(putCalls.length).toBe(1));
    expect(putCalls[0]!.educationMode).toBe("ACADEMIC");
  });

  it("moveTabTo reorders and reassigns order indexes", async () => {
    const result = await setup();
    act(() => {
      result.current.moveTabTo(0, 2);
    });
    const ids = result.current.tabs.map((t: any) => t.id);
    expect(ids).toEqual(["subjects", "demo-day", "dashboard", "packages"]);
    expect(result.current.tabs.map((t: any) => t.order)).toEqual([0, 1, 2, 3]);
    expect(result.current.tabs[2]!.id).toBe("dashboard");
  });

  it("preset implies its mode: academy preset on ACADEMIC fixture triggers gated COURSES switch via confirm", async () => {
    // start from ACADEMIC fixture
    (fetchJson as ReturnType<typeof vi.fn>).mockImplementation(
      async (_url: string, init?: { method?: string; body?: string }) => {
        if (init?.method === "PUT") {
          putCalls.push(JSON.parse(init.body!));
          return {};
        }
        const data = JSON.parse(JSON.stringify(settingsFixture));
        data.educationMode = "ACADEMIC";
        data.enableSubjects = true;
        return data;
      },
    );
    const result = await setup();
    expect(result.current.educationMode).toBe("ACADEMIC");

    const academyPreset = {
      id: "academy",
      mode: "COURSES",
      systemTitle: "أكاديمية التدريب والتطوير",
      systemTitleEn: "Training Academy",
      labels: { packages: { ar: "البرامج والحقائب", en: "Training Programs" } },
    } as any;

    act(() => {
      result.current.applyPreset(academyPreset);
    });
    // labels applied → implied mode switch is always gated behind pendingMode
    // (fresh unsaved labels must be saved together with the mode switch)
    expect(result.current.systemTitle).toBe("أكاديمية التدريب والتطوير");
    expect(result.current.pendingMode).toBe("COURSES");
    expect(putCalls).toHaveLength(0);

    await act(async () => {
      await result.current.confirmPendingMode();
    });
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0]!.educationMode).toBe("COURSES");
    expect(putCalls[0].enableSubjects).toBe(false);
    const packages = putCalls[0]!.tabs.find((t: any) => t.id === "packages");
    expect(packages.labelAr).toBe("البرامج والحقائب"); // preset labels saved together
  });

  it("discardChanges reverts to last saved snapshot", async () => {
    const result = await setup();
    act(() => {
      result.current.updateLabel(3, "ar", "مؤقت");
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.discardChanges();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.tabs[3]!.labelAr).toBe("الباقات");
  });
});
