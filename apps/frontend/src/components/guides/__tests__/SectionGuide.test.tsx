import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SectionGuide } from "../SectionGuide";

const translations: Record<string, string> = {
  "common.close": "Close",
  "guides.help": "Open page guide",
  "guides.general.title": "Quick Guide For This Page",
  "guides.general.description": "Use this guide to understand the current page.",
  "guides.general.step1": "Start with the page title.",
  "guides.general.step2": "Check filters or tabs.",
  "guides.general.step3": "Open related settings when needed.",
  "guides.orders.title": "Orders Guide",
  "guides.orders.description": "Track orders and update statuses.",
  "guides.orders.step1": "Use search and filters.",
  "guides.orders.step2": "Open an order.",
  "guides.orders.step3": "Update the status carefully.",
  "guides.orders.step4": "Use reports or printing.",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] || key,
  }),
}));

jest.mock("@/components/ui/button", () => {
  const React = require("react");

  return {
    Button: React.forwardRef(
      (
        {
          children,
          size: _size,
          variant: _variant,
          ...props
        }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
          size?: string;
          variant?: string;
        },
        ref: React.Ref<HTMLButtonElement>,
      ) => (
        <button ref={ref} type="button" {...props}>
          {children}
        </button>
      ),
    ),
  };
});

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

const renderGuideAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SectionGuide />
    </MemoryRouter>,
  );

describe("SectionGuide", () => {
  it("opens the matching guide for registered routes", () => {
    renderGuideAt("/orders");

    fireEvent.click(screen.getByRole("button", { name: "Open page guide" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Orders Guide")).toBeInTheDocument();
    expect(screen.getByText("Use search and filters.")).toBeInTheDocument();
  });

  it("falls back to a general guide for unregistered routes", () => {
    renderGuideAt("/inventory");

    fireEvent.click(screen.getByRole("button", { name: "Open page guide" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Quick Guide For This Page")).toBeInTheDocument();
    expect(screen.getByText("Start with the page title.")).toBeInTheDocument();
  });
});
