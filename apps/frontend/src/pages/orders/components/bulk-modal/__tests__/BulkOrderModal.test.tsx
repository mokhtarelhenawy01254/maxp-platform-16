// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BulkOrderModal } from "../../../components/BulkOrderModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

vi.mock("../../../../../services/apiClient", () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { success: true, data: { id: "bulk-new" } } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

afterEach(() => {
  cleanup();
});

describe("BulkOrderModal", () => {
  const defaultProps = {
    item: null,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  it("renders modal form fields and upload dropzone", () => {
    render(<BulkOrderModal {...defaultProps} />);

    expect(screen.getByText("orders.bulkCreateTitle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("orders.bulkNamePlaceholder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("orders.bulkDescriptionPlaceholder")).toBeInTheDocument();
    expect(screen.getByText("orders.bulkUploadFile")).toBeInTheDocument();
  });

  it("triggers onClose when cancel button is clicked", () => {
    render(<BulkOrderModal {...defaultProps} />);

    const cancelBtn = screen.getByText("orders.bulkCancel");
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows error when saving with empty name", async () => {
    render(<BulkOrderModal {...defaultProps} />);

    const saveBtn = screen.getByText("orders.bulkSave");
    fireEvent.click(saveBtn);

    expect(screen.getByText("orders.bulkNamePlaceholder")).toBeInTheDocument();
  });
});
