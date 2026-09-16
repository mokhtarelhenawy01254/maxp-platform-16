// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import BeforeAfterSlider from "../sections/BeforeAfterSlider";

describe("BeforeAfterSlider", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultSection = {
    id: "ba-1",
    type: "BEFORE_AFTER",
  };

  const defaultSettings = {
    title: "مقارنة قبل وبعد",
    beforeImage: "https://example.com/before.jpg",
    afterImage: "https://example.com/after.jpg",
    beforeLabel: "قبل الاستخدام",
    afterLabel: "بعد الاستخدام",
  };

  it("renders with isolated direction: ltr on the stage to prevent RTL inverted mouse movements", () => {
    render(<BeforeAfterSlider section={defaultSection} settings={defaultSettings} />);

    const sliderStage = screen.getByLabelText("مقبض المقارنة").parentElement;
    expect(sliderStage).not.toBeNull();
    expect(sliderStage?.style.direction).toBe("ltr");

    // Labels maintain proper Arabic direction
    const beforeLabel = screen.getByText("قبل الاستخدام");
    const afterLabel = screen.getByText("بعد الاستخدام");
    expect(beforeLabel.style.direction).toBe("rtl");
    expect(afterLabel.style.direction).toBe("rtl");
  });

  it("accurately updates position during pointer dragging without RTL reversal", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 300,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    render(<BeforeAfterSlider section={defaultSection} settings={defaultSettings} />);

    const sliderStage = screen.getByLabelText("مقبض المقارنة").parentElement!;
    sliderStage.setPointerCapture = vi.fn();
    sliderStage.releasePointerCapture = vi.fn();

    // Pointer down at 150px (30%)
    const downEvent = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperty(downEvent, "clientX", { value: 150 });
    Object.defineProperty(downEvent, "pointerId", { value: 1 });
    fireEvent(sliderStage, downEvent);

    const rangeInput = screen.getByLabelText("مقبض المقارنة") as HTMLInputElement;
    expect(rangeInput.value).toBe("30");

    // Pointer drag to 400px (80%)
    const moveEvent = new MouseEvent("pointermove", { bubbles: true, cancelable: true });
    Object.defineProperty(moveEvent, "clientX", { value: 400 });
    Object.defineProperty(moveEvent, "pointerId", { value: 1 });
    fireEvent(sliderStage, moveEvent);
    expect(rangeInput.value).toBe("80");

    // Pointer up
    const upEvent = new MouseEvent("pointerup", { bubbles: true, cancelable: true });
    Object.defineProperty(upEvent, "pointerId", { value: 1 });
    fireEvent(sliderStage, upEvent);
  });
});
