import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
        onOpenNewTab={jest.fn()}
        onOpenDetail={jest.fn()}
      />
    );

    expect(screen.getByText("جاري البحث عن تذاكر هذا الطلب...")).toBeInTheDocument();
  });

  it("shows empty state when no tickets exist and handles open new tab", () => {
    const onOpenNewTab = jest.fn();
    render(
      <TicketListTab
        loadingTickets={false}
        existingTickets={[]}
        onOpenNewTab={onOpenNewTab}
        onOpenDetail={jest.fn()}
      />
    );

    expect(screen.getByText("لا توجد تذاكر مسجلة لهذا الطلب حتى الآن")).toBeInTheDocument();
    const newBtn = screen.getByText("فتح تذكرة الآن");
    fireEvent.click(newBtn);
    expect(onOpenNewTab).toHaveBeenCalledTimes(1);
  });

  it("renders existing tickets list and calls onOpenDetail when clicked", () => {
    const onOpenDetail = jest.fn();
    render(
      <TicketListTab
        loadingTickets={false}
        existingTickets={mockTickets}
        onOpenNewTab={jest.fn()}
        onOpenDetail={onOpenDetail}
      />
    );

    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("TRK-555")).toBeInTheDocument();
    expect(screen.getByText("مشكلة في التوصيل")).toBeInTheDocument();

    const item = screen.getByText("عرض المحادثة");
    fireEvent.click(item);
    expect(onOpenDetail).toHaveBeenCalledWith(mockTickets[0]);
  });
});
