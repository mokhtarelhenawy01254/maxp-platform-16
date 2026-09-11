/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FacebookAdsModuleNav from "../FacebookAdsModuleNav";

describe("FacebookAdsModuleNav", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the primary navigation compact and exposes routed Meta Ads tools in the launcher", () => {
    render(
      <MemoryRouter initialEntries={["/advertising/facebook-ads"]}>
        <FacebookAdsModuleNav selectedAdAccountId="act_123" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /مركز التحكم/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /إعلانات AI/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /الأدوات/i }));

    const launcher = screen.getByRole("region", { name: "التحسين والقرارات" });
    expect(within(launcher).getByRole("link", { name: /قواعد الأتمتة/i })).toHaveAttribute(
      "href",
      "/advertising/facebook-ads/automation-rules?adAccountId=act_123",
    );

    expect(
      screen.getByRole("link", { name: /تقارير القرار/i }),
    ).toHaveAttribute(
      "href",
      "/advertising/facebook-ads/decision-reports?adAccountId=act_123",
    );
    expect(screen.getByRole("link", { name: /نماذج العملاء/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Conversions API/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /الجماهير المحفوظة/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /معاينة الإعلان/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DCO/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /الإسناد/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Advantage\+/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /الكتالوجات/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /A\/B Tests/i })).toBeInTheDocument();
  });

  it("preserves an ad account from the current URL when no prop is supplied", () => {
    render(
      <MemoryRouter
        initialEntries={["/advertising/facebook-ads/ad-library?adAccountId=act_999"]}
      >
        <FacebookAdsModuleNav />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /الأدوات/i }));

    expect(screen.getByRole("link", { name: /الإسناد/i })).toHaveAttribute(
      "href",
      "/advertising/facebook-ads/attribution?adAccountId=act_999",
    );
  });
});
