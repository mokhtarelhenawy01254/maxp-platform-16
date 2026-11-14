import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OrderStatusAlertBell } from "../components/OrderStatusAlertBell";

const mockNavigate = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockToast = vi.fn();

const socketHandlers: Record<string, ((data: any) => void)[]> = {};

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../services/api", () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock("../../../hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: null,
    isConnected: true,
    isReconnecting: false,
    connectionError: null,
    emit: vi.fn(),
    on: (event: string, handler: (data: any) => void) => {
      socketHandlers[event] = socketHandlers[event] || [];
      socketHandlers[event].push(handler);
    },
    off: (event: string, handler: (data: any) => void) => {
      socketHandlers[event] = (socketHandlers[event] || []).filter((h) => h !== handler);
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

describe("OrderStatusAlertBell", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((k) => {
      delete socketHandlers[k];
    });
    mockGet.mockResolvedValue({
      data: {
        success: true,
        unreadCount: 1,
        notifications: [
          {
            id: "notif-101",
            title: "🔔 تنبيه تغيير حالة الطلب #ORD-101",
            message: "الطلب #ORD-101 تغيّر من قيد التجهيز إلى تم الشحن",
            isRead: false,
            data: {
              orderNumber: "ORD-101",
              url: "/orders/ORD-101",
              oldStatusLabel: "قيد التجهيز",
              newStatusLabel: "تم الشحن",
              formattedTime: "12/11/2026 06:00 م",
            },
          },
        ],
      },
    });
    mockPost.mockResolvedValue({ data: { success: true } });
  });

  it("loads recent status alerts and navigates to the order when clicked", async () => {
    render(<OrderStatusAlertBell />);

    await waitFor(() => {
      expect(screen.getByTestId("order-status-alert-unread-badge")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByTestId("order-status-alert-bell-btn"));

    const dropdown = screen.getByTestId("order-status-alert-dropdown");
    expect(dropdown).toHaveTextContent("#ORD-101");

    fireEvent.click(screen.getByText("🔔 تنبيه تغيير حالة الطلب #ORD-101"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/notifications/notif-101/read");
      expect(mockNavigate).toHaveBeenCalledWith("/orders/ORD-101");
    });
  });

  it("shows clickable toast and updates unread count on realtime order:status_alert", async () => {
    render(<OrderStatusAlertBell />);

    await waitFor(() => {
      expect(screen.getByTestId("order-status-alert-unread-badge")).toHaveTextContent("1");
    });

    act(() => {
      const handlers = socketHandlers["order:status_alert"] || [];
      handlers.forEach((fn) =>
        fn({
          id: "notif-202",
          title: "🔔 تنبيه تغيير حالة الطلب #ORD-202",
          message: "الطلب #ORD-202 تغيّر من مؤكد إلى تم الشحن",
          orderNumber: "ORD-202",
          oldStatusLabel: "مؤكد",
          newStatusLabel: "تم الشحن",
          changedByName: "أحمد",
          url: "/orders/ORD-202",
        }),
      );
    });

    expect(screen.getByTestId("order-status-alert-unread-badge")).toHaveTextContent("2");
    expect(mockToast).toHaveBeenCalledWith(
      "🔔 تنبيه تغيير حالة الطلب #ORD-202",
      expect.objectContaining({
        action: expect.objectContaining({ label: "فتح الطلب" }),
      }),
    );

    const toastConfig = mockToast.mock.calls[0][1];
    await act(async () => {
      toastConfig.action.onClick();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/orders/ORD-202");
  });
});
