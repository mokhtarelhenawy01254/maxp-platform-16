import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SubscriptionSuccess from "../SubscriptionSuccess";

const renderWithQuery = (query: string) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/subscription", search: query }]}>
      <SubscriptionSuccess />
    </MemoryRouter>,
  );

describe("SubscriptionSuccess", () => {
  it("shows the success state when status=success", async () => {
    renderWithQuery("?status=success&billingId=bill-1");

    expect(await screen.findByText("باقة AI + Inbox مفعّلة!")).toBeInTheDocument();
    expect(screen.getByText(/تم إتمام الاشتراك وتفعيل الباقة بنجاح/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ابدأ الآن/ })).toBeInTheDocument();
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
