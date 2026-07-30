import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";
import { ModalFooter } from "../ModalFooter";
import { MiniStat } from "../MiniStat";
import { MetricCard } from "../MetricCard";
import { CheckCircle2 } from 'lucide-react';

describe("StatusBadge", () => {
  it("renders active state", () => {
    const { container } = render(<StatusBadge isActive={true} />);
    expect(container.textContent).toContain("نشطة");
  });
  it("renders inactive state", () => {
    const { container } = render(<StatusBadge isActive={false} />);
    expect(container.textContent).toContain("متوقفة");
  });
});

describe("MiniStat", () => {
  it("renders label, value, and helper", () => {
    render(<MiniStat label="الرصيد" value="١٠٠٠" helper="آخر تحديث اليوم" />);
    expect(screen.getByText("الرصيد")).toBeInTheDocument();
    expect(screen.getByText("١٠٠٠")).toBeInTheDocument();
    expect(screen.getByText("آخر تحديث اليوم")).toBeInTheDocument();
  });
});

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard icon={CheckCircle2} label="مستخدمون" value="٥٠" />);
    expect(screen.getByText("مستخدمون")).toBeInTheDocument();
    expect(screen.getByText("٥٠")).toBeInTheDocument();
  });
});

describe("ModalFooter", () => {
  it("renders confirm and cancel buttons", () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    render(<ModalFooter loading={false} onCancel={onCancel} onConfirm={() => { onConfirm(); }} confirmLabel="حفظ" confirmIcon={CheckCircle2} />);
    fireEvent.click(screen.getByText("إلغاء"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("حفظ"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
  it("disables confirm when loading", () => {
    render(<ModalFooter loading={true} onCancel={() => {}} onConfirm={() => {}} confirmLabel="حفظ" confirmIcon={CheckCircle2} />);
    expect(screen.getByText("حفظ").closest("button")).toBeDisabled();
  });
});
