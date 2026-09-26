// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ChannelRoutingPage from "../ChannelRoutingPage";

// Mock i18next
const mockLanguage = { current: "ar" };
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "aiHub.channelRouting.title": "توجيه القنوات",
        "aiHub.channelRouting.subtitle": "حدد الوكيل المسؤول عن الرد على كل قناة تواصل",
        "aiHub.channelRouting.save": "حفظ",
        "aiHub.channelRouting.reset": "تراجع",
        "aiHub.channelRouting.agentPause": "إيقاف مؤقت",
        "aiHub.channelRouting.resumeBody": "الوكيل يعمل",
        "aiHub.channelRouting.cardTitle": "القنوات",
        "aiHub.channelRouting.cardDesc": "الوصف",
        "aiHub.channelRouting.channel": "القناة",
        "aiHub.channelRouting.agent": "الوكيل",
        "aiHub.channelRouting.reply": "الرد",
        "aiHub.channelRouting.toolStatus": "الحالة",
        "aiHub.channelRouting.selectPlaceholder": "اختر وكيلاً...",
        "aiHub.channelRouting.noRouting": "بدون توجيه",
        "aiHub.channelRouting.active": "مفعل",
        "aiHub.channelRouting.inactive": "معطل",
        "aiHub.channelRouting.autoReply": "رد تلقائي",
        "aiHub.channelRouting.comingSoon": "قريباً",
        "aiHub.channelRouting.saved": "تم الحفظ",
      };
      return translations[key] || key;
    },
    i18n: {
      get language() {
        return mockLanguage.current;
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: () => ({ Authorization: "Bearer test-token" }),
  },
}));

vi.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (path: string) => `http://localhost:5000/api${path.startsWith("/") ? path : `/${path}`}`,
}));

describe("ChannelRoutingPage - Executive Assistant (Dashboard) Channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "ar";
  });

  afterEach(() => {
    cleanup();
  });

  const setupFetchMock = (agents: any[] = []) => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/agent-manager/agents")) {
        return {
          ok: true,
          json: async () => ({ success: true, agents }),
        };
      }
      if (urlStr.includes("/agent-manager/auto-reply")) {
        return {
          ok: true,
          json: async () => ({ success: true, autoReplyEnabled: true }),
        };
      }
      if (urlStr.includes("/agent-manager/channel-reply")) {
        return {
          ok: true,
          json: async () => ({ success: true, channels: {} }),
        };
      }
      if (urlStr.includes("/agent-manager/pause")) {
        return {
          ok: true,
          json: async () => ({ success: true, paused: false, pauseReason: null }),
        };
      }
      if (urlStr.includes("/agent-manager/whatsapp-sessions")) {
        return {
          ok: true,
          json: async () => ({ success: true, sessions: [] }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
      };
    }) as any;
  };

  it("renders DASHBOARD row with Arabic label, description, and empty agent alert when no agent is assigned", async () => {
    mockLanguage.current = "ar";
    setupFetchMock([
      { id: "agent-1", name: "وكيل خدمة العملاء", role: "CUSTOMER_SUPPORT", status: "ACTIVE", allowedChannels: ["MESSENGER"], allowedTools: [] },
    ]);

    render(<ChannelRoutingPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("المساعد التنفيذي (لوحة التحكم)")).toBeInTheDocument();
    });

    // Check description
    expect(
      screen.getByText("الوكيل اللي بتربطه هنا هو نفسه اللي بيرد في المساعد التنفيذي (Ctrl+J)")
    ).toBeInTheDocument();

    // Check alert for empty agent
    expect(
      screen.getByText("مفيش وكيل متعيّن — الرد الافتراضي: المساعد التنفيذي لإدارة المتجر (كريم)")
    ).toBeInTheDocument();
  });

  it("does NOT show the empty agent alert when an agent is assigned to DASHBOARD", async () => {
    mockLanguage.current = "ar";
    setupFetchMock([
      {
        id: "agent-exec",
        name: "كريم التنفيذي",
        role: "EXECUTIVE",
        status: "ACTIVE",
        allowedChannels: ["DASHBOARD"],
        allowedTools: [],
      },
    ]);

    render(<ChannelRoutingPage />);

    await waitFor(() => {
      expect(screen.getByText("المساعد التنفيذي (لوحة التحكم)")).toBeInTheDocument();
    });

    // Description is still visible
    expect(
      screen.getByText("الوكيل اللي بتربطه هنا هو نفسه اللي بيرد في المساعد التنفيذي (Ctrl+J)")
    ).toBeInTheDocument();

    // Alert should NOT be in the document
    expect(
      screen.queryByText("مفيش وكيل متعيّن — الرد الافتراضي: المساعد التنفيذي لإدارة المتجر (كريم)")
    ).not.toBeInTheDocument();
  });

  it("renders English label, description, and alert when language is en", async () => {
    mockLanguage.current = "en";
    setupFetchMock([
      { id: "agent-1", name: "Support Agent", role: "SUPPORT", status: "ACTIVE", allowedChannels: [], allowedTools: [] },
    ]);

    render(<ChannelRoutingPage />);

    await waitFor(() => {
      expect(screen.getByText("Executive Assistant (Dashboard)")).toBeInTheDocument();
    });

    expect(
      screen.getByText("The agent you link here is the one responding in Executive Assistant (Ctrl+J)")
    ).toBeInTheDocument();

    expect(
      screen.getByText("No agent assigned — Default responder: Executive Store Assistant (Karim)")
    ).toBeInTheDocument();
  });

  it("keeps all 8 channels in table", async () => {
    mockLanguage.current = "ar";
    setupFetchMock([]);

    render(<ChannelRoutingPage />);

    await waitFor(() => {
      expect(screen.getByText("المساعد التنفيذي (لوحة التحكم)")).toBeInTheDocument();
    });

    // All channels are present
    expect(screen.getByText("ماسنجر (Messenger)")).toBeInTheDocument();
    expect(screen.getByText("واتساب (WhatsApp)")).toBeInTheDocument();
    expect(screen.getByText("انستغرام (Instagram)")).toBeInTheDocument();
    expect(screen.getByText("تيليجرام (Telegram)")).toBeInTheDocument();
    expect(screen.getByText("شات الموقع (Web Chat)")).toBeInTheDocument();
    expect(screen.getByText("المساعد التنفيذي (لوحة التحكم)")).toBeInTheDocument();
    expect(screen.getByText("استوديو التسويق الذكي (Marketing Studio)")).toBeInTheDocument();
    expect(screen.getByText("استوديو المنتجات والمخزون الذكي (Inventory Studio)")).toBeInTheDocument();
  });

  it("verifies the exact sequence order of the 8 channels", async () => {
    mockLanguage.current = "ar";
    setupFetchMock([]);

    const { container } = render(<ChannelRoutingPage />);

    await waitFor(() => {
      expect(screen.getByText("المساعد التنفيذي (لوحة التحكم)")).toBeInTheDocument();
    });

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(8);

    const channelTexts = Array.from(rows).map((row) => {
      const cell = row.querySelector("td");
      return cell?.textContent || "";
    });

    expect(channelTexts[0]).toContain("ماسنجر");
    expect(channelTexts[1]).toContain("واتساب");
    expect(channelTexts[2]).toContain("انستغرام");
    expect(channelTexts[3]).toContain("تيليجرام");
    expect(channelTexts[4]).toContain("شات الموقع");
    expect(channelTexts[5]).toContain("المساعد التنفيذي (لوحة التحكم)");
    expect(channelTexts[6]).toContain("استوديو التسويق");
    expect(channelTexts[7]).toContain("استوديو المنتجات والمخزون");
  });
});
