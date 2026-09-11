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

describe("LandingPage Next-Gen Enterprise Living OS", () => {
  it("renders cockpit headline, systems showcase, and switches active system", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    // Verify main cockpit headline
    expect(
      screen.getByText(/ودّع تشتت 6 برامج وشيتات إكسيل/i),
    ).toBeInTheDocument();

    // Verify 4-layer architecture matrix exists
    expect(
      screen.getByText(/4 طبقات تشغيلية مترابطة/i),
    ).toBeInTheDocument();

    // Verify systems showcase tabs exist
    const whatsappTab = screen.getByRole("button", { name: /01\. واتساب والسوشيال الذكي/i });
    const shippingTab = screen.getByRole("button", { name: /02\. الكول سنتر والشحن الفوري/i });
    expect(whatsappTab).toBeInTheDocument();
    expect(shippingTab).toBeInTheDocument();

    // Click shipping tab and verify story changes
    await user.click(shippingTab);
    expect(
      screen.getByText(/بوالص الشحن بضغطة زر/i),
    ).toBeInTheDocument();

    // Verify live playground exists
    expect(
      screen.getByText(/ملعب التجربة الحية/i),
    ).toBeInTheDocument();

    // Verify industry profiles section exists
    expect(
      screen.getByText(/حلول مفصلة حسب نشاطك/i),
    ).toBeInTheDocument();
  });
});
