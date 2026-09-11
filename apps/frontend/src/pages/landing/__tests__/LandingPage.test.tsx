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
    expect(screen.getByText(/كل مبيعاتك، مخازنك/i)).toBeInTheDocument();
    expect(screen.getByText(/في نظام تشغيل واحد/i)).toBeInTheDocument();

    // CTA check
    expect(screen.getAllByText(/ابدأ تجربة نشاطك مجاناً/i)[0]).toBeInTheDocument();

    // Bento Grid check
    expect(screen.getByText(/أدوات متصلة ببعضها/i)).toBeInTheDocument();

    // Comparison check
    expect(screen.getByText(/الفرق بين إطفاء حرائق التشغيل/i)).toBeInTheDocument();

    // ROI Calculator check
    expect(screen.getByText(/احسب كم ستوفر شهرياً/i)).toBeInTheDocument();

    // FAQ check
    expect(screen.getAllByText(/الأسئلة الشائعة/i)[0]).toBeInTheDocument();
  });
});
