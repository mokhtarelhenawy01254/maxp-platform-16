// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CreateTicketModal } from "../CreateTicketModal";

// Mock apiClient to prevent network calls
vi.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CreateTicketModal (Batch 370)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders modal header, tabs, and customer footer when open", () => {
    const handleClose = vi.fn();
    render(
      <CreateTicketModal
        isOpen={true}
        onClose={handleClose}
        orderNumber="ORD-5544"
        customerName="عمرو دياب"
      />
    );

    expect(screen.getByText("تذاكر الدعم والمتابعة")).toBeInTheDocument();
    expect(screen.getByText("طلب #ORD-5544")).toBeInTheDocument();
    expect(screen.getByText("العميل: عمرو دياب")).toBeInTheDocument();
    expect(screen.getByText("فتح تذكرة جديدة")).toBeInTheDocument();

    const closeFooterBtn = screen.getByRole("button", { name: "إغلاق" });
    fireEvent.click(closeFooterBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <CreateTicketModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
