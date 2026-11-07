import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SubscriptionSuccess from "../SubscriptionSuccess";
import * as platformPixelModule from "../../../utils/platformSiteMetaPixel";

const renderWithQuery = (query: string) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/subscription", search: query }]}>
      <SubscriptionSuccess />
    </MemoryRouter>,
  );

describe("SubscriptionSuccess", () => {
  let trackPurchaseSpy: jest.SpyInstance;
  const sessionStore = new Map<string, string>();

  beforeEach(() => {
    sessionStore.clear();
    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => sessionStore.get(key) ?? null);
    (window.sessionStorage.setItem as jest.Mock).mockImplementation((key: string, val: string) => {
      sessionStore.set(key, String(val));
    });
    (window.sessionStorage.removeItem as jest.Mock).mockImplementation((key: string) => sessionStore.delete(key));
    (window.sessionStorage.clear as jest.Mock).mockImplementation(() => sessionStore.clear());
    trackPurchaseSpy = jest.spyOn(platformPixelModule, "trackPlatformSitePurchase").mockImplementation();
  });

  afterEach(() => {
    trackPurchaseSpy.mockRestore();
  });

  it("shows the success state but does not invent a 999 purchase value when amount is missing", async () => {
    renderWithQuery("?status=success&bundle=store-complete-bundle&billingId=bill-1");

    expect(await screen.findByText("باقة المتجر الكاملة مفعّلة!")).toBeInTheDocument();
    expect(screen.getByText(/تم إتمام الاشتراك وتفعيل الـ 17 أداة بنجاح/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ابدأ الآن/ })).toBeInTheDocument();

    expect(trackPurchaseSpy).not.toHaveBeenCalled();
  });

  it("uses the actual amount from query params when available", async () => {
    renderWithQuery("?status=success&bundle=store-complete-bundle&billingId=bill-2&amount=1499");

    await screen.findByText("باقة المتجر الكاملة مفعّلة!");
    expect(trackPurchaseSpy).toHaveBeenCalledWith("subscription_success", expect.objectContaining({
      value: 1499,
      currency: "EGP",
      eventID: "purchase_bill-2",
    }));
  });

  it("does not track twice if already tracked in sessionStorage (refresh prevention)", async () => {
    const { unmount } = renderWithQuery("?status=success&bundle=store-complete-bundle&billingId=bill-repeat&amount=999");
    await screen.findByText("باقة المتجر الكاملة مفعّلة!");
    expect(trackPurchaseSpy).toHaveBeenCalledTimes(1);

    unmount();

    // Re-render simulates page refresh with same billingId
    renderWithQuery("?status=success&bundle=store-complete-bundle&billingId=bill-repeat&amount=999");
    expect(trackPurchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("does not fire trackPlatformSitePurchase when payment failed", async () => {
    renderWithQuery("?status=failed&billingId=bill-fail");

    await screen.findByText("لم يكتمل الدفع");
    expect(trackPurchaseSpy).not.toHaveBeenCalled();
  });

  it("shows the success state when Kashier appends a CAPTURED paymentStatus", async () => {
    renderWithQuery("?status=success&paymentStatus=CAPTURED&billingId=bill-2");

    expect(await screen.findByText("باقة AI + Inbox مفعّلة!")).toBeInTheDocument();
  });

  it("shows the failure state when the payment failed", async () => {
    renderWithQuery("?status=failed&billingId=bill-3");

    expect(await screen.findByText("لم يكتمل الدفع")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إعادة محاولة الدفع/ })).toBeInTheDocument();
  });

  it("falls back to the pending state when no status is present", async () => {
    renderWithQuery("?billingId=bill-4");

    expect(await screen.findByText("جارٍ متابعة عملية الدفع")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /متابعة لصندوق الوارد/ })).toBeInTheDocument();
  });
});
