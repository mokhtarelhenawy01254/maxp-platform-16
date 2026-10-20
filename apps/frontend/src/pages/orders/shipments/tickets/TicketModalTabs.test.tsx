// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TicketModalTabs } from "./TicketModalTabs";

describe("TicketModalTabs", () => {
  it("renders tabs and triggers tab switching", () => {
    const setActiveTab = vi.fn();
    const { rerender } = render(
      <TicketModalTabs
        activeTab="new"
        setActiveTab={setActiveTab}
        existingTicketsCount={3}
      />
    );

    expect(screen.getByText("فتح تذكرة جديدة")).toBeInTheDocument();
    expect(screen.getByText("تذاكر هذا الطلب")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    const listTabBtn = screen.getByText("تذاكر هذا الطلب").closest("button");
    fireEvent.click(listTabBtn!);
    expect(setActiveTab).toHaveBeenCalledWith("list");

    rerender(
      <TicketModalTabs
        activeTab="detail"
        setActiveTab={setActiveTab}
        existingTicketsCount={3}
      />
    );

    const backBtn = screen.getByText("العودة للقائمة");
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(setActiveTab).toHaveBeenCalledWith("list");
  });
});
