// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ShippingCompanyLogo } from "../components/ShippingCompanyLogo";

afterEach(() => cleanup());

describe("ShippingCompanyLogo Component", () => {
  it("renders official SVG brand logo for TURBO", () => {
    const company = {
      name: "تربو ون كوريير",
      providerKey: "TURBO",
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const img = screen.getByTestId("shipping-company-logo") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("/brands/turbo.svg");
    expect(img.getAttribute("alt")).toBe("تربو ون كوريير");
    expect(img.getAttribute("width")).toBe("40");
    expect(img.getAttribute("height")).toBe("40");
  });

  it("renders official SVG brand logo for BOSTA", () => {
    const company = {
      name: "Bosta Logistics",
      providerKey: "BOSTA",
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const img = screen.getByTestId("shipping-company-logo") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("/brands/bosta.svg");
  });

  it("renders official SVG brand logo for QP_EXPRESS", () => {
    const company = {
      name: "QP Express Egypt",
      providerKey: "QP_EXPRESS",
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const img = screen.getByTestId("shipping-company-logo") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("/brands/qp_express.svg");
  });

  it("prioritizes custom logoUrl from settings for custom carriers", () => {
    const company = {
      name: "أسطول المناديب السريع",
      providerKey: "MANUAL",
      settings: JSON.stringify({ logoUrl: "https://cdn.example.com/custom-logo.webp" }),
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const img = screen.getByTestId("shipping-company-logo") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/custom-logo.webp");
  });

  it("falls back to company initials without broken image when logo fails to load (onError)", () => {
    const company = {
      name: "تربو مصر",
      providerKey: "TURBO",
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const img = screen.getByTestId("shipping-company-logo");
    expect(img).toBeInTheDocument();

    // Trigger onError
    fireEvent.error(img);

    // Image is replaced by fallback avatar with initials
    expect(screen.queryByTestId("shipping-company-logo")).not.toBeInTheDocument();
    const fallback = screen.getByTestId("shipping-company-logo-fallback");
    expect(fallback).toBeInTheDocument();
    // initials = first letter of each of the first two words ("تربو مصر" -> "تم")
    expect(fallback.textContent).toContain("تم");
  });

  it("renders initials fallback immediately if carrier has no logo and no known providerKey", () => {
    const company = {
      name: "شركة التوصيل الفوري",
      providerKey: "MANUAL",
    };

    render(<ShippingCompanyLogo company={company} size={40} />);
    const fallback = screen.getByTestId("shipping-company-logo-fallback");
    expect(fallback).toBeInTheDocument();
    // initials = first letter of each of the first two words ("شركة التوصيل الفوري" -> "شا")
    expect(fallback.textContent).toContain("شا");
  });
});
