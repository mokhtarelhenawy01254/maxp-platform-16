import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../../LandingPage";

jest.mock("../../../utils/platformSiteMetaPixel", () => ({
  trackPlatformSiteLead: jest.fn(),
}));

describe("LandingPage Component", () => {
  it("renders main landing hero and headline correctly", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LandingPage />
      </MemoryRouter>
    );

    // Headline check
    expect(screen.getByText(/من أول رنة واتساب/i)).toBeInTheDocument();
    expect(screen.getByText(/يسمّع في خزنتك/i)).toBeInTheDocument();

    // CTA check
    expect(screen.getAllByText(/ابدأ تجربة نشاطك مجاناً/i)[0]).toBeInTheDocument();

    // 6 Systems Slider check
    expect(screen.getByText(/6 أنظمة في مكان واحد/i)).toBeInTheDocument();
    expect(screen.getAllByText(/واتساب والسوشيال الذكي/i)[0]).toBeInTheDocument();

    // 24h Order Flow check
    expect(screen.getByText(/دورة حياة الأوردر/i)).toBeInTheDocument();

    // ROI Calculator check
    expect(screen.getByText(/احسب كم ستوفر شهرياً/i)).toBeInTheDocument();

    // FAQ check
    expect(screen.getAllByText(/الأسئلة الشائعة/i)[0]).toBeInTheDocument();
  });
});
