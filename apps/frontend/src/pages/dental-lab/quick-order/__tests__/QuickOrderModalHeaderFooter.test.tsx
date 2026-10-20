// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QuickOrderModalHeader } from "../components/QuickOrderModalHeader";
import { QuickOrderModalFooter } from "../components/QuickOrderModalFooter";
import type { DentalLabDoctor } from "../../shared";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("QuickOrderModalHeader", () => {
  it("renders title, draft restored badge, and triggers clearDraft and onCancel", () => {
    const clearDraft = vi.fn();
    const onCancel = vi.fn();

    render(
      <QuickOrderModalHeader
        draftRestored={true}
        clearDraft={clearDraft}
        submitting={false}
        submittingAndPrint={false}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("الطلب السريع لأمر الشغل")).toBeInTheDocument();
    expect(screen.getByText("مسودة مسترجعة")).toBeInTheDocument();

    const clearDraftBtn = screen.getByLabelText("تفريغ المسودة");
    fireEvent.click(clearDraftBtn);
    expect(clearDraft).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByLabelText("إغلاق");
    fireEvent.click(closeBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("QuickOrderModalFooter", () => {
  it("renders step 1 navigation with validation", () => {
    const setStep = vi.fn();
    const onCancel = vi.fn();

    render(
      <QuickOrderModalFooter
        step={1}
        setStep={setStep}
        selectedDoctor={null}
        selectedServiceIds={[]}
        patientName=""
        submitting={false}
        submittingAndPrint={false}
        onCancel={onCancel}
        submitOrder={vi.fn()}
      />
    );

    expect(screen.queryByText("السابق")).not.toBeInTheDocument();
    expect(screen.getByText("إلغاء")).toBeInTheDocument();

    const nextBtn = screen.getByText("التالي");
    fireEvent.click(nextBtn);
    expect(setStep).not.toHaveBeenCalled(); // validation prevents advance

    fireEvent.click(screen.getByText("إلغاء"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders step 3 action buttons and triggers submit callbacks", () => {
    const submitOrder = vi.fn();
    const setStep = vi.fn();

    render(
      <QuickOrderModalFooter
        step={3}
        setStep={setStep}
        selectedDoctor={{ id: "doc-1", name: "د. طارق" } as DentalLabDoctor}
        selectedServiceIds={["wt-1"]}
        patientName="أحمد علي"
        submitting={false}
        submittingAndPrint={false}
        onCancel={vi.fn()}
        submitOrder={submitOrder}
      />
    );

    expect(screen.getByText("السابق")).toBeInTheDocument();
    expect(screen.getByText("حفظ وطباعة الباركود")).toBeInTheDocument();
    expect(screen.getByText("حفظ أمر الشغل")).toBeInTheDocument();

    fireEvent.click(screen.getByText("السابق"));
    expect(setStep).toHaveBeenCalled();

    fireEvent.click(screen.getByText("حفظ وطباعة الباركود"));
    expect(submitOrder).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText("حفظ أمر الشغل"));
    expect(submitOrder).toHaveBeenCalledWith(false);
  });
});
