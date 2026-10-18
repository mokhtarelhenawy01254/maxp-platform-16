import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketDetailTab } from "./TicketDetailTab";
import type { OrderTicketItem } from "./ticketTypes";

describe("TicketDetailTab", () => {
  const mockTicket: OrderTicketItem = {
    id: 101,
    status: "in_progress",
    subject: "تأخر المندوب",
    messages: [
      { id: 1, is_client_message: true, content: "أرجو المتابعة", created_at: "2026-10-18T10:05:00Z" },
      { id: 2, is_client_message: false, content: "تم التواصل مع المندوب", created_at: "2026-10-18T10:15:00Z" },
    ],
  };

  const defaultProps = {
    ticketDetail: mockTicket,
    loadingDetail: false,
    onRefreshDetail: jest.fn(),
    replyContent: "",
    setReplyContent: jest.fn(),
    replyImage: null,
    setReplyImage: jest.fn(),
    sendingReply: false,
    onSendReply: jest.fn((e) => e.preventDefault()),
  };

  it("renders ticket header, messages thread, and reply input", () => {
    render(<TicketDetailTab {...defaultProps} />);

    expect(screen.getByText("تذكرة #101")).toBeInTheDocument();
    expect(screen.getByText("قيد المعالجة")).toBeInTheDocument();
    expect(screen.getByText("تأخر المندوب")).toBeInTheDocument();
    expect(screen.getByText("أرجو المتابعة")).toBeInTheDocument();
    expect(screen.getByText("تم التواصل مع المندوب")).toBeInTheDocument();
  });

  it("calls setReplyContent when typing reply", () => {
    const setReplyContent = jest.fn();
    render(<TicketDetailTab {...defaultProps} setReplyContent={setReplyContent} />);

    const input = screen.getByPlaceholderText(/اكتب رداً على التذكرة/i);
    fireEvent.change(input, { target: { value: "شكراً لكم" } });
    expect(setReplyContent).toHaveBeenCalledWith("شكراً لكم");
  });

  it("calls onRefreshDetail when clicking refresh button", () => {
    const onRefreshDetail = jest.fn();
    render(<TicketDetailTab {...defaultProps} onRefreshDetail={onRefreshDetail} />);

    const refreshBtn = screen.getByRole("button", { name: /تحديث/i });
    fireEvent.click(refreshBtn);
    expect(onRefreshDetail).toHaveBeenCalledTimes(1);
  });
});
