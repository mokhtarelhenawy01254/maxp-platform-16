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
    expect(screen.getByText(/ودّع تشتت 6 برامج وشيتات إكسيل/i)).toBeInTheDocument();
    expect(screen.getByText(/كل نشاطك التجاري في شاشة تشغيل واحدة/i)).toBeInTheDocument();

    // CTA check
    expect(screen.getAllByText(/ابدأ تجربتك المجانية الآن/i)[0]).toBeInTheDocument();

    // Architecture Matrix check
    expect(screen.getByText(/4 طبقات تشغيلية مترابطة/i)).toBeInTheDocument();

    // 6 Systems Showcase check
    expect(screen.getAllByText(/01\. واتساب والسوشيال الذكي/i)[0]).toBeInTheDocument();

    // Live Playground check
    expect(screen.getByText(/ملعب التجربة الحية/i)).toBeInTheDocument();

    // Industry Profiles check
    expect(screen.getByText(/حلول مفصلة حسب نشاطك/i)).toBeInTheDocument();

    // 24h Order Flow check
    expect(screen.getByText(/دورة حياة الأوردر/i)).toBeInTheDocument();

    // ROI Calculator check
    expect(screen.getByText(/احسب كم ستوفر شهرياً/i)).toBeInTheDocument();

    // FAQ check
    expect(screen.getAllByText(/الأسئلة الشائعة/i)[0]).toBeInTheDocument();
  });
});
