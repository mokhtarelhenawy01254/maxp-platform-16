import React from "react";
import { render, screen } from "@testing-library/react";
import { PreparationQueueTableSection } from "./PreparationQueueTableSection";

jest.mock("./PreparationSelectionBar", () => ({
  PreparationSelectionBar: () => <div data-testid="mock-selection-bar">Mock Selection Bar</div>,
}));

jest.mock("./PreparationOrdersContainer", () => ({
  PreparationOrdersContainer: () => <div data-testid="mock-orders-container">Mock Orders Container</div>,
}));

describe("PreparationQueueTableSection", () => {
  it("renders both selection bar and orders container within a styled section", () => {
    const { container } = render(
      <PreparationQueueTableSection
        selectionBarProps={{} as any}
        ordersContainerProps={{} as any}
      />,
    );

    expect(screen.getByTestId("mock-selection-bar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-orders-container")).toBeInTheDocument();
    expect(container.querySelector("section")).toHaveClass("rounded-xl");
  });
});
