import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../LandingPage";

jest.mock("../../utils/platformSiteMetaPixel", () => ({
  trackPlatformSiteLead: jest.fn(),
}));

const renderLandingPage = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LandingPage />
    </MemoryRouter>,
  );

describe("LandingPage hero console tabs", () => {
  it("switches the hero console content when the top buttons are clicked", async () => {
    const user = userEvent.setup();

    renderLandingPage();

    const liveTab = screen.getByRole("tab", { name: /Live Operations/i });
    const enterpriseTab = screen.getByRole("tab", {
      name: /Enterprise Grade/i,
    });

    expect(liveTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText(
        "المبيعات والعمليات والموظفون والمحادثات في لوحة تنفيذ واحدة.",
      ),
    ).toBeInTheDocument();

    await user.click(enterpriseTab);

    expect(enterpriseTab).toHaveAttribute("aria-selected", "true");
    expect(liveTab).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByText(
        "حوكمة، صلاحيات، وتكاملات تجعل التوسع أسرع وأكثر أمانًا من أول فريق حتى التشغيل الكامل.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Governance Layer")).toBeInTheDocument();
    expect(screen.getByText("ضبط الصلاحيات")).toBeInTheDocument();

    await user.click(liveTab);

    expect(liveTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("Platform Suite").length).toBeGreaterThan(0);
    expect(screen.getByText("Automation Timeline")).toBeInTheDocument();
  });
});
