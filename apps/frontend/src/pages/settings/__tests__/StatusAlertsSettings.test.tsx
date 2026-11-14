import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import StatusAlertsSettings from "../StatusAlertsSettings";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock("../../../services/api", () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
const mockToastInfo = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
    warning: (...args: any[]) => mockToastWarning(...args),
    info: (...args: any[]) => mockToastInfo(...args),
  },
}));

describe("StatusAlertsSettings", () => {
  const defaultMeta = {
    statuses: [
      { code: "SHIPPED", name: "تم الشحن", color: "#6366F1", isTerminal: false },
      { code: "DELIVERED", name: "تم التوصيل", color: "#10B981", isTerminal: true },
    ],
    teamUsers: [
      {
        id: "user-owner",
        name: "أحمد المالك",
        email: "owner@company.com",
        phone: "201012345678",
        role: "OWNER",
      },
      {
        id: "user-mgr",
        name: "سارة مديرة",
        email: "mgr@company.com",
        phone: "201087654321",
        role: "MANAGER",
      },
    ],
    channelStatus: {
      inApp: { available: true },
      whatsapp: { available: true, phoneNumber: "201000000001" },
      telegram: { available: true, mode: "BOT" },
    },
  };

  const baseSettings = {
    enabled: true,
    statuses: ["SHIPPED"],
    channels: { inApp: true, whatsapp: true, telegram: false },
    recipients: {
      roles: ["OWNER", "COMPANY_ADMIN", "MANAGER"],
      userIds: [],
      phones: [],
      telegramChatIds: [],
    },
    windowMinutes: 5,
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: baseSettings,
        meta: defaultMeta,
      },
    });
    mockPut.mockImplementation(async (_url: string, body: any) => ({
      data: {
        success: true,
        data: { ...body, updatedAt: "2026-11-12T10:00:00.000Z" },
      },
    }));
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          inApp: true,
          whatsapp: { success: true, reason: null },
          telegram: { success: true, reason: null },
        },
      },
    });
  });

  it("loads settings + meta, saves status toggle immediately, and shows saved badge", async () => {
    render(<StatusAlertsSettings />);

    await waitFor(() => {
      expect(screen.getByText("تم الشحن")).toBeInTheDocument();
      expect(screen.getByText("تم التوصيل")).toBeInTheDocument();
    });

    const deliveredBtn = screen.getByRole("checkbox", { name: /DELIVERED/i });
    expect(deliveredBtn).toHaveAttribute("aria-checked", "false");

    fireEvent.click(deliveredBtn);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/order-status-alerts",
        expect.objectContaining({
          statuses: ["SHIPPED", "DELIVERED"],
        }),
      );
      expect(screen.getByTestId("status-alert-saved-badge")).toBeInTheDocument();
    });
  });

  it("supports Telegram channel toggle, Telegram Chat IDs, and specific team users", async () => {
    render(<StatusAlertsSettings />);

    await waitFor(() => {
      expect(screen.getByText("أحمد المالك")).toBeInTheDocument();
    });

    const tgCheckbox = screen.getByTestId("channel-telegram-checkbox");
    fireEvent.click(tgCheckbox);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/order-status-alerts",
        expect.objectContaining({
          channels: expect.objectContaining({ telegram: true }),
        }),
      );
    });

    const chatInput = screen.getByPlaceholderText(/123456789/i);
    fireEvent.change(chatInput, { target: { value: "-100998877" } });
    fireEvent.click(screen.getByRole("button", { name: /إضافة معرّف/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenLastCalledWith(
        "/order-status-alerts",
        expect.objectContaining({
          recipients: expect.objectContaining({
            telegramChatIds: ["-100998877"],
          }),
        }),
      );
    });
  });

  it("detects normalized duplicate WhatsApp numbers before submitting", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...baseSettings,
          recipients: {
            ...baseSettings.recipients,
            phones: ["201012345678"],
          },
        },
        meta: defaultMeta,
      },
    });

    render(<StatusAlertsSettings />);

    await waitFor(() => {
      expect(screen.getByText("201012345678")).toBeInTheDocument();
    });

    const phoneInput = screen.getByPlaceholderText(/201012345678/i);
    fireEvent.change(phoneInput, { target: { value: "2010 1234-5678" } });
    fireEvent.click(screen.getByRole("button", { name: /إضافة رقم/i }));

    expect(mockToastInfo).toHaveBeenCalledWith("هذا الرقم مضاف بالفعل");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("triggers 'جرّب التنبيه' and renders multi-channel feedback banner", async () => {
    render(<StatusAlertsSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("send-test-alert-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("send-test-alert-btn"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/order-status-alerts/test",
        expect.objectContaining({
          statuses: ["SHIPPED"],
        }),
      );
      expect(screen.getByTestId("test-alert-result-banner")).toBeInTheDocument();
    });
  });
});
