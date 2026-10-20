// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TicketNewTab } from "./TicketNewTab";

describe("TicketNewTab", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    code: "ORD-999",
    setCode: vi.fn(),
    categories: [
      { id: 1, name: "استفسار عام" },
      { id: 2, name: "تأخير التسليم" },
    ],
    selectedCategoryId: 1,
    setSelectedCategoryId: vi.fn(),
    loadingCategories: false,
    priority: "medium" as const,
    setPriority: vi.fn(),
    content: "",
    setContent: vi.fn(),
    imageFile: null,
    setImageFile: vi.fn(),
    submitting: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    onClose: vi.fn(),
  };

  it("renders form fields and handles input changes", () => {
    const setContent = vi.fn();
    render(<TicketNewTab {...defaultProps} setContent={setContent} />);

    expect(screen.getByDisplayValue("ORD-999")).toBeInTheDocument();
    expect(screen.getByText("استفسار عام")).toBeInTheDocument();
    expect(screen.getByText("عادية / متوسطة")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/اكتب تفاصيل استفسارك أو مشكلتك/i);
    fireEvent.change(textarea, { target: { value: "طلب لم يصل بعد" } });
    expect(setContent).toHaveBeenCalledWith("طلب لم يصل بعد");
  });

  it("disables submit button when content is empty", () => {
    render(<TicketNewTab {...defaultProps} content="" />);

    const submitBtn = screen.getByRole("button", { name: "إرسال التذكرة" });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button and calls onSubmit when content is present", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<TicketNewTab {...defaultProps} content="ملاحظة هامة" onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole("button", { name: "إرسال التذكرة" });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalled();
  });
});
