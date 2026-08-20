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

    expect(await screen.findByText("╪¿╪º┘é╪⌐ AI + Inbox ┘à┘ü╪╣┘æ┘ä╪⌐!")).toBeInTheDocument();
    expect(screen.getByText(/╪¬┘à ╪Ñ╪¬┘à╪º┘à ╪º┘ä╪º╪┤╪¬╪▒╪º┘â ┘ê╪¬┘ü╪╣┘è┘ä ╪º┘ä╪¿╪º┘é╪⌐ ╪¿┘å╪¼╪º╪¡/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /╪º╪¿╪»╪ú ╪º┘ä╪ó┘å/ })).toBeInTheDocument();
  });

  it("shows the success state when Kashier appends a CAPTURED paymentStatus", async () => {
    renderWithQuery("?status=success&paymentStatus=CAPTURED&billingId=bill-2");

    expect(await screen.findByText("╪¿╪º┘é╪⌐ AI + Inbox ┘à┘ü╪╣┘æ┘ä╪⌐!")).toBeInTheDocument();
  });

  it("shows the failure state when the payment failed", async () => {
    renderWithQuery("?status=failed&billingId=bill-3");

    expect(await screen.findByText("┘ä┘à ┘è┘â╪¬┘à┘ä ╪º┘ä╪»┘ü╪╣")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /╪Ñ╪╣╪º╪»╪⌐ ┘à╪¡╪º┘ê┘ä╪⌐ ╪º┘ä╪»┘ü╪╣/ })).toBeInTheDocument();
  });

  it("falls back to the pending state when no status is present", async () => {
    renderWithQuery("?billingId=bill-4");

    expect(await screen.findByText("╪¼╪º╪▒┘ì ┘à╪¬╪º╪¿╪╣╪⌐ ╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪»┘ü╪╣")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /┘à╪¬╪º╪¿╪╣╪⌐ ┘ä╪╡┘å╪»┘ê┘é ╪º┘ä┘ê╪º╪▒╪»/ })).toBeInTheDocument();
  });
});
