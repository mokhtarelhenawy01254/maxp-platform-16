import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import OrderSourceCard from "./OrderSourceCard";

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDateTime: (date: string) => date,
  }),
}));

describe("OrderSourceCard", () => {
  const renderCard = (order: any) =>
    render(
      <BrowserRouter>
        <OrderSourceCard order={order} />
      </BrowserRouter>
    );

  it("renders correctly for storefront orders without crashing", () => {
    const order = {
      createdAt: "2026-09-12T05:40:54.191Z",
      extractionMethod: "storefront",
      sourceType: "storefront",
      metadata: {
        attribution: {
          channel: "storefront",
          platform: "facebook",
        },
      },
    };

    renderCard(order);
    expect(screen.getByText("مصدر الطلب")).toBeInTheDocument();
    expect(screen.getByText(/المتجر الإلكتروني/)).toBeInTheDocument();
  });

  it("renders correctly when sourceType is undefined (storefront via extractionMethod)", () => {
    const order = {
      createdAt: "2026-09-12T05:40:54.191Z",
      extractionMethod: "storefront",
    };

    renderCard(order);
    expect(screen.getByText(/المتجر الإلكتروني/)).toBeInTheDocument();
  });

  it("renders correctly for manual orders", () => {
    const order = {
      createdAt: "2026-09-12T05:40:54.191Z",
      extractionMethod: "manual",
      sourceType: "manual",
      createdByName: "أحمد",
    };

    renderCard(order);
    expect(screen.getByText(/طلب يدوي/)).toBeInTheDocument();
    expect(screen.getByText("أحمد")).toBeInTheDocument();
  });

  it("renders correctly for ai_conversation orders", () => {
    const order = {
      createdAt: "2026-09-12T05:40:54.191Z",
      conversationId: "conv-123",
      conversation: {
        id: "conv-123",
        channel: "WHATSAPP",
      },
      sourceType: "ai_conversation",
    };

    renderCard(order);
    expect(screen.getByText(/محادثة تلقائية/)).toBeInTheDocument();
    expect(screen.getByText("واتساب")).toBeInTheDocument();
    expect(screen.getByText("عرض المحادثة")).toBeInTheDocument();
  });

  it("renders correctly when source is unknown", () => {
    const order = {
      createdAt: "2026-09-12T05:40:54.191Z",
    };

    renderCard(order);
    expect(screen.getByText(/غير محدد/)).toBeInTheDocument();
  });
});
