import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketNewTab } from "./TicketNewTab";

describe("TicketNewTab", () => {
  const defaultProps = {
    code: "ORD-999",
    setCode: jest.fn(),
    categories: [
      { id: 1, name: "استفسار عام" },
      { id: 2, name: "تأخير التسليم" },
    ],
    selectedCategoryId: 1,
    setSelectedCategoryId: jest.fn(),
    loadingCategories: false,
    priority: "medium" as const,
    setPriority: jest.fn(),
    content: "",
    setContent: jest.fn(),
    imageFile: null,
    setImageFile: jest.fn(),
    submitting: false,
    onSubmit: jest.fn((e) => e.preventDefault()),
    onClose: jest.fn(),
  };

  it("renders form fields and handles input changes", () => {
    const setContent = jest.fn();
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

    const submitBtn = screen.getByText("إرسال التذكرة").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button and calls onSubmit when content is present", () => {
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(<TicketNewTab {...defaultProps} content="ملاحظة هامة" onSubmit={onSubmit} />);

    const submitBtn = screen.getByText("إرسال التذكرة").closest("button");
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn!);
    expect(onSubmit).toHaveBeenCalled();
  });
});
