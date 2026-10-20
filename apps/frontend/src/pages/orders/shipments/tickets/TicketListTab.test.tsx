// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TicketListTab } from "./TicketListTab";
import type { OrderTicketItem } from "./ticketTypes";

describe("TicketListTab", () => {
  const mockTickets: OrderTicketItem[] = [
    {
      id: 101,
      code: "TRK-555",
      status: "open",
      subject: "مشكلة في التوصيل",
      created_at: "2026-10-18T10:00:00.000Z",
    },
  ];

  it("shows loading spinner when loadingTickets is true", () => {
    render(
      <TicketListTab
        loadingTickets={true}
        existingTickets={[]}
        onOpenNewTab={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    expect(screen.getByText("جاري البحث عن تذاكر هذا الطلب...")).toBeInTheDocument();
  });

  it("shows empty state when no tickets exist and handles open new tab", () => {
    const onOpenNewTab = vi.fn();
    render(
      <TicketListTab
        loadingTickets={false}
        existingTickets={[]}
        onOpenNewTab={onOpenNewTab}
        onOpenDetail={vi.fn()}
      />
    );

    expect(screen.getByText("لا توجد تذاكر مسجلة لهذا الطلب حتى الآن")).toBeInTheDocument();
    const newBtn = screen.getByText("فتح تذكرة الآن");
    fireEvent.click(newBtn);
    expect(onOpenNewTab).toHaveBeenCalledTimes(1);
  });

  it("renders existing tickets list and calls onOpenDetail when clicked", () => {
    const onOpenDetail = vi.fn();
    render(
      <TicketListTab
        loadingTickets={false}
        existingTickets={mockTickets}
        onOpenNewTab={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    );

    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("TRK-555")).toBeInTheDocument();
    expect(screen.getByText("مشكلة في التوصيل")).toBeInTheDocument();

    const ticketCard = screen.getByText("#101").closest("div");
    fireEvent.click(ticketCard!);
    expect(onOpenDetail).toHaveBeenCalledWith(mockTickets[0]);
  });
});
