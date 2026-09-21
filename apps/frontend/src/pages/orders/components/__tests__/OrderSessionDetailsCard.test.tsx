import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrderSessionDetailsCard from "../OrderSessionDetailsCard";
import { OrderSessionDetailsData, CustomerFirstOrderInfo } from "../../types";

jest.mock("../../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
    formatDateTime: (d: string) => d,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "orders.sessionDetails": "تفاصيل الجلسة",
        "orders.clientIp": "عنوان IP العميل",
        "orders.ipLocation": "المحافظة والمدينة",
        "orders.trafficSource": "مصدر الزيارة",
        "orders.pagesVisited": "مسار الصفحات التي زارها العميل",
        "orders.browseDuration": "الوقت المستغرق في التصفح والشراء",
        "orders.totalSessions": "عدد الجلسات الإجمالي",
        "orders.firstSeenAt": "أول زيارة للمتجر",
        "orders.firstOrderCustomer": "أول طلب للعميل في المتجر",
        "orders.returningCustomer": "عميل سابق لديه طلبات سابقة",
      };
      return translations[key] || key;
    },
  }),
}));

describe("OrderSessionDetailsCard", () => {
  const mockSessionDetails: OrderSessionDetailsData = {
    ip: "156.204.10.20",
    ipGovernorate: "الإسكندرية",
    ipCity: "Alexandria",
    ipCountry: "EG",
    trafficSource: {
      source: "facebook",
      medium: "cpc",
      campaignName: "حملة الصيف",
      referrer: "https://l.facebook.com/",
    },
    pagesVisited: [
      { path: "/", title: "الصفحة الرئيسية", timestamp: "2026-09-21T10:00:00.000Z" },
      { path: "/product/swan-shoe", title: "حذاء سوان الفاخر", timestamp: "2026-09-21T10:02:00.000Z" },
      { path: "/checkout", title: "إتمام الشراء", timestamp: "2026-09-21T10:04:00.000Z" },
    ],
    durationSeconds: 240,
    sessionCount: 3,
    firstSeenAt: "2026-09-10T08:00:00.000Z",
  };

  const mockFirstOrderInfo: CustomerFirstOrderInfo = {
    isFirstOrder: true,
    totalOrdersCount: 0,
  };

  it("renders session details with IP, location, duration, and first order badge", () => {
    render(
      <OrderSessionDetailsCard
        sessionDetails={mockSessionDetails}
        firstOrderInfo={mockFirstOrderInfo}
      />
    );

    // IP rendered
    expect(screen.getByText("156.204.10.20")).toBeInTheDocument();
    // First order badge
    expect(screen.getByText("عميل جديد")).toBeInTheDocument();
    expect(screen.getByText(/هذا هو أول طلب للعميل على المتجر/)).toBeInTheDocument();
    // Traffic Source rendered
    expect(screen.getByText("إعلان فيسبوك (Facebook Ads)")).toBeInTheDocument();
    // Pages visited path rendered
    expect(screen.getByText("حذاء سوان الفاخر")).toBeInTheDocument();
  });

  it("renders returning customer badge when customer has previous orders", () => {
    const returningInfo: CustomerFirstOrderInfo = {
      isFirstOrder: false,
      firstOrderNumber: "ORD-1000",
      firstOrderAt: "2026-01-01T10:00:00.000Z",
      totalOrdersCount: 3,
    };

    render(
      <OrderSessionDetailsCard
        sessionDetails={mockSessionDetails}
        firstOrderInfo={returningInfo}
      />
    );

    expect(screen.getByText(/عميل متكرر/)).toBeInTheDocument();
    expect(screen.getByText("#ORD-1000")).toBeInTheDocument();
    expect(screen.getByText("3 طلبات")).toBeInTheDocument();
  });
});
