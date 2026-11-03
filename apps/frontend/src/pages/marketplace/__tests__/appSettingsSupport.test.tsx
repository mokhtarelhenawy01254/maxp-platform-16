// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { supportsAppSettings } from "../../../config/appSettingsSupport";

afterEach(() => cleanup());

describe("appSettingsSupport", () => {
  describe("supportsAppSettings", () => {
    it("returns true for all five supported apps", () => {
      const supportedApps = [
        "internal-courier-fleet",
        "conversion-suite",
        "ugc-reviews-pro",
        "commerce-advanced",
        "upsell-center",
      ];

      for (const slug of supportedApps) {
        expect(supportsAppSettings(slug)).toBe(true);
      }
    });

    it("returns false for unsupported apps like competitor-analysis", () => {
      const unsupportedApps = [
        "competitor-analysis",
        "whatsapp-business",
        "facebook-leads",
        "quantity-offers-pro",
        "random-custom-app",
      ];

      for (const slug of unsupportedApps) {
        expect(supportsAppSettings(slug)).toBe(false);
      }
    });

    it("returns false for falsy or empty inputs", () => {
      expect(supportsAppSettings("")).toBe(false);
      expect(supportsAppSettings(null)).toBe(false);
      expect(supportsAppSettings(undefined)).toBe(false);
    });
  });

  describe("conditional rendering based on appSettings support", () => {
    it("renders settings button only when app is supported in card / table logic", () => {
      const TestCardAction = ({ slug }: { slug: string }) => (
        <div>
          {supportsAppSettings(slug) && (
            <button data-testid="settings-btn">إعدادات الأداة</button>
          )}
          <button data-testid="open-btn">فتح التطبيق</button>
        </div>
      );

      const { rerender } = render(<TestCardAction slug="competitor-analysis" />);
      expect(screen.queryByTestId("settings-btn")).not.toBeInTheDocument();
      expect(screen.getByTestId("open-btn")).toBeInTheDocument();

      rerender(<TestCardAction slug="conversion-suite" />);
      expect(screen.getByTestId("settings-btn")).toBeInTheDocument();
      expect(screen.getByTestId("open-btn")).toBeInTheDocument();

      rerender(<TestCardAction slug="internal-courier-fleet" />);
      expect(screen.getByTestId("settings-btn")).toBeInTheDocument();
    });

    it("swaps settings button with 'فتح التطبيق' in drawer logic when app is unsupported", () => {
      const TestDrawerActions = ({ slug }: { slug: string }) => (
        <div>
          {supportsAppSettings(slug) ? (
            <button data-testid="drawer-settings-btn">الإعدادات</button>
          ) : (
            <button data-testid="drawer-open-btn">فتح التطبيق</button>
          )}
          <button data-testid="drawer-uninstall-btn">إلغاء التفعيل</button>
        </div>
      );

      const { rerender } = render(<TestDrawerActions slug="competitor-analysis" />);
      expect(screen.queryByTestId("drawer-settings-btn")).not.toBeInTheDocument();
      expect(screen.getByTestId("drawer-open-btn")).toBeInTheDocument();
      expect(screen.getByText("فتح التطبيق")).toBeInTheDocument();

      rerender(<TestDrawerActions slug="conversion-suite" />);
      expect(screen.getByTestId("drawer-settings-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("drawer-open-btn")).not.toBeInTheDocument();
      expect(screen.getByText("الإعدادات")).toBeInTheDocument();
    });
  });
});
