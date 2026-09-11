import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../../LandingPage";

describe("LandingPage Component", () => {
  it("renders main landing hero and headline correctly", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LandingPage />
      </MemoryRouter>
    );

    // Headline check
    expect(screen.getByText(/وداعاً لتشتت 10 أنظمة/i)).toBeInTheDocument();
    expect(screen.getByText(/نظام واحد ذكي/i)).toBeInTheDocument();

    // CTA check
    expect(screen.getAllByText(/ابدأ تشغيل شركتك مجاناً/i)[0]).toBeInTheDocument();

    // Bento Grid check
    expect(screen.getByText(/منظومة تشغيل متكاملة/i)).toBeInTheDocument();

    // Comparison check
    expect(screen.getByText(/لماذا يختار التجار ورواد الأعمال/i)).toBeInTheDocument();

    // ROI Calculator check
    expect(screen.getByText(/حاسبة العائد الاستثماري التفاعلية/i)).toBeInTheDocument();

    // FAQ check
    expect(screen.getAllByText(/الأسئلة الشائعة/i)[0]).toBeInTheDocument();
  });
});
