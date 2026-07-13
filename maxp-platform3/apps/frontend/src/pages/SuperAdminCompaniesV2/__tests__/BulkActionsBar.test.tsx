import { render, screen, fireEvent } from "@testing-library/react";
import { BulkActionsBar } from "../components/BulkActionsBar";

describe("BulkActionsBar", () => {
  const handlers = {
    onActivate: jest.fn(),
    onDeactivate: jest.fn(),
    onDelete: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("returns null when selectedCount is 0", () => {
    const { container } = render(<BulkActionsBar selectedCount={0} {...handlers} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows selected count", () => {
    render(<BulkActionsBar selectedCount={3} {...handlers} />);
    expect(screen.getByText("تم تحديد 3 شركة")).toBeInTheDocument();
  });

  it("calls onActivate when activate button clicked", () => {
    render(<BulkActionsBar selectedCount={2} {...handlers} />);
    fireEvent.click(screen.getByText("تفعيل"));
    expect(handlers.onActivate).toHaveBeenCalledTimes(1);
  });

  it("calls onDeactivate when deactivate button clicked", () => {
    render(<BulkActionsBar selectedCount={2} {...handlers} />);
    fireEvent.click(screen.getByText("تعطيل"));
    expect(handlers.onDeactivate).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button clicked", () => {
    render(<BulkActionsBar selectedCount={2} {...handlers} />);
    fireEvent.click(screen.getByText("حذف"));
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onClear when clear button clicked", () => {
    render(<BulkActionsBar selectedCount={2} {...handlers} />);
    fireEvent.click(screen.getByText("مسح التحديد"));
    expect(handlers.onClear).toHaveBeenCalledTimes(1);
  });
});
