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

describe("LandingPage open-canvas Egyptian commercial OS", () => {
  it("renders headline, 6-systems slider, and switches active system story", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    // Verify main hook
    expect(
      screen.getByText(/من أول رنة واتساب/i),
    ).toBeInTheDocument();

    // Verify systems slider tabs exist
    const whatsappTab = screen.getByRole("button", { name: /واتساب والسوشيال الذكي/i });
    const shippingTab = screen.getByRole("button", { name: /الكول سنتر والشحن الفوري/i });
    expect(whatsappTab).toBeInTheDocument();
    expect(shippingTab).toBeInTheDocument();

    // Click shipping tab and verify story changes
    await user.click(shippingTab);
    expect(
      screen.getByText(/بوالص الشحن بضغطة زر/i),
    ).toBeInTheDocument();
  });
});
