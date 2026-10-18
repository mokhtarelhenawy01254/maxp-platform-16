import React from "react";
import { render, screen } from "@testing-library/react";
import { PreparationAlertBanners } from "./PreparationAlertBanners";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("PreparationAlertBanners", () => {
  it("renders disabled settings banner when preparationSettingsEnabled is false", () => {
    render(
      <PreparationAlertBanners
        preparationSettingsEnabled={false}
        allOverdueShortageFollowUpCount={0}
        allOverdueProblemFollowUpCount={0}
      />
    );

    expect(screen.getByText("إعدادات التجهيز غير مفعلة")).toBeInTheDocument();
  });

  it("renders overdue shortage follow-up banner when count > 0", () => {
    render(
      <PreparationAlertBanners
        preparationSettingsEnabled={true}
        allOverdueShortageFollowUpCount={5}
        allOverdueProblemFollowUpCount={0}
      />
    );

    expect(screen.getByText("يوجد 5 طلب متأخر في متابعة النواقص")).toBeInTheDocument();
  });

  it("renders overdue problem follow-up banner when count > 0", () => {
    render(
      <PreparationAlertBanners
        preparationSettingsEnabled={true}
        allOverdueShortageFollowUpCount={0}
        allOverdueProblemFollowUpCount={3}
      />
    );

    expect(screen.getByText("يوجد 3 طلب متأخر في حل المشكلات")).toBeInTheDocument();
  });
});
