import { render, screen, fireEvent } from "@testing-library/react";
import { AlertBanner } from "../components/AlertBanner";

describe("AlertBanner", () => {
  it("returns null when both counts are zero", () => {
    const { container } = render(<AlertBanner urgentEscalationDue={0} myDueToday={0} onOpenView={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows urgent escalation message when urgentEscalationDue > 0", () => {
    render(<AlertBanner urgentEscalationDue={3} myDueToday={0} onOpenView={jest.fn()} />);
    expect(screen.getByText(/تحتاج تصعيدًا عاجلًا/)).toBeInTheDocument();
  });

  it("shows my due today message when only myDueToday > 0", () => {
    render(<AlertBanner urgentEscalationDue={0} myDueToday={5} onOpenView={jest.fn()} />);
    expect(screen.getByText(/متابعة مستحقة اليوم/)).toBeInTheDocument();
  });

  it("prioritizes urgent escalation over myDueToday", () => {
    render(<AlertBanner urgentEscalationDue={2} myDueToday={5} onOpenView={jest.fn()} />);
    expect(screen.getByText(/تحتاج تصعيدًا عاجلًا/)).toBeInTheDocument();
  });

  it("calls onOpenView with ESCALATION_DUE on urgent", () => {
    const onOpenView = jest.fn();
    render(<AlertBanner urgentEscalationDue={1} myDueToday={0} onOpenView={onOpenView} />);
    fireEvent.click(screen.getByText("فتح التصعيد"));
    expect(onOpenView).toHaveBeenCalledWith("ESCALATION_DUE");
  });

  it("calls onOpenView with MY_TODAY when myDueToday", () => {
    const onOpenView = jest.fn();
    render(<AlertBanner urgentEscalationDue={0} myDueToday={2} onOpenView={onOpenView} />);
    fireEvent.click(screen.getByText("فتح متابعتي اليوم"));
    expect(onOpenView).toHaveBeenCalledWith("MY_TODAY");
  });
});
