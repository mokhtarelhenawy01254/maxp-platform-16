import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import OrderActivityLog from "./OrderActivityLog";
import { OrderDetailsType } from "../types";
import { apiClient } from "../../../services/apiClient";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "orderDetails.activityLog") return "سجل النشاط";
      if (key === "orderDetails.allActivities") return "كل الأنشطة";
      if (key === "orderDetails.statusChanges") return "تغييرات الحالة";
      if (key === "orderDetails.productChanges") return "تعديلات المنتجات";
      if (key === "orderDetails.customerChanges") return "بيانات العميل";
      if (key === "orderDetails.notes") return "الملاحظات";
      if (key === "orderDetails.system") return "النظام";
      if (key === "orderDetails.statusChangeTo") {
        return `Status changed to ${params?.status || ""}`;
      }
      if (key === "orderDetails.statusReasonLine") {
        return `Reason: ${params?.reason || ""}`;
      }
      if (key === "orderDetails.noEventsYet") {
        return params?.defaultValue || "مفيش أحداث مسجلة لهذا الأوردر";
      }
      if (key === "orderDetails.lastCheckedAt") {
        return params?.defaultValue || `آخر فحص: ${params?.time || ""}`;
      }
      return key;
    },
  }),
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const baseOrder: OrderDetailsType = {
  id: "ord-tl-1",
  orderNumber: "ORD-397979-898",
  customerName: "عميل تجريبي",
  status: "PROCESSING",
  paymentStatus: "COMPLETED",
  paymentMethod: "CREDIT_CARD",
  items: [],
  subtotal: 835,
  tax: 0,
  shipping: 0,
  total: 835,
  currency: "EGP",
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-10T12:00:00.000Z",
};

describe("OrderActivityLog timeline integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads server timeline, merges optimistic notes without duplicates, and preserves exact count across reload", async () => {
    const timelineEvents = [
      {
        id: "pay-1",
        eventKey: "synthetic:payment:ord-tl-1:TX-1",
        type: "payment",
        action: "order.payment.succeeded",
        source: "synthetic",
        actor: { id: null, name: "Kashier Gateway", type: "system" },
        at: "2026-11-10T10:05:00.000Z",
        title: "تم الدفع إلكترونياً بنجاح (TX-1)",
        meta: {},
      },
      {
        id: "note-1",
        eventKey: "order_note:note-1",
        type: "note",
        action: "order.note.created",
        source: "order_note",
        actor: { id: "u1", name: "سارة", type: "user" },
        at: "2026-11-10T10:10:00.000Z",
        title: "ملاحظة محفوظة",
        meta: { noteId: "note-1", content: "ملاحظة محفوظة" },
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: timelineEvents,
        total: 2,
        meta: { checkedAt: "2026-11-10T12:05:00.000Z" },
      },
    });

    const orderWithNotes: OrderDetailsType = {
      ...baseOrder,
      orderNotes: [
        {
          id: "note-1",
          content: "ملاحظة محفوظة",
          authorId: "u1",
          authorName: "سارة",
          createdAt: "2026-11-10T10:10:00.000Z",
        },
        {
          id: "temp-opt-1",
          content: "ملاحظة فورية",
          authorId: "u1",
          authorName: "سارة",
          createdAt: "2026-11-10T10:12:00.000Z",
        },
      ],
    };

    const { unmount } = render(
      <OrderActivityLog
        order={orderWithNotes}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("تم الدفع إلكترونياً بنجاح (TX-1)")).toBeInTheDocument();
    });
    expect(screen.getAllByText("ملاحظة محفوظة")).toHaveLength(1);
    expect(screen.getByText("ملاحظة فورية")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    const firstRenderItems = screen.getAllByRole("listitem").length;
    expect(firstRenderItems).toBe(3);

    // Simulate page reload (unmount + remount fetching same server events)
    unmount();
    render(
      <OrderActivityLog
        order={orderWithNotes}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("تم الدفع إلكترونياً بنجاح (TX-1)")).toBeInTheDocument();
    });
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(firstRenderItems);
  });

  it("renders explicit empty-state with lastCheckedAt when timeline returns zero events", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        total: 0,
        meta: { checkedAt: "2026-11-12T14:00:00.000Z" },
      },
    });

    render(
      <OrderActivityLog
        order={{ ...baseOrder, statusHistory: [], orderNotes: [] }}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("order-activity-empty")).toHaveTextContent(
        "مفيش أحداث مسجلة لهذا الأوردر — آخر فحص: 2026-11-12T14:00:00.000Z"
      );
    });
  });

  it("falls back to prop statusHistory when timeline fetch fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(
      <OrderActivityLog
        order={{
          ...baseOrder,
          statusHistory: [
            {
              id: "sh-fallback",
              status: "CONFIRMED",
              reason: "تأكيد من الفولباك",
              createdAt: "2026-11-10T10:00:00.000Z",
              userName: "Agent",
            },
          ],
        }}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });
    expect(screen.getByText(/تأكيد من الفولباك/)).toBeInTheDocument();
  });
});
