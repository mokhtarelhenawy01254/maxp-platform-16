import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import ReturnManagementPage from "../ReturnManagementPage";
import { returnService } from "../../../services/returnService";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/returnService", () => ({
  returnService: {
    getRequests: jest.fn(),
    getSettings: jest.fn(),
    getCategories: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../ReturnDetailsModal", () => () => <div data-testid="mock-return-details-modal">Modal Opened</div>);

const mockRequests = [
  {
    id: "req-1",
    order: { orderNumber: "ORD-1001", currency: "EGP" },
    customer: { firstName: "أحمد", lastName: "علي", phone: "01012345678", customerRating: "EXCELLENT", successScore: 95.5 },
    reason: { reason: "مقاس غير مناسب", category: { name: "مقاسات" } },
    responsibleParty: "CUSTOMER",
    trackingNumber: "TRK-9901",
    refundAmount: 500,
    shippingReturnCost: 50,
    settlementAmount: 450,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "req-2",
    order: { orderNumber: "ORD-1002", currency: "EGP" },
    customer: { firstName: "سارة", lastName: "محمود", phone: "01198765432", customerRating: "GOOD", successScore: 88.0 },
    reason: { reason: "منتج به عيب", category: { name: "جودة" } },
    responsibleParty: "STORE",
    trackingNumber: "TRK-9902",
    refundAmount: 750,
    shippingReturnCost: 60,
    settlementAmount: 690,
    createdAt: "2026-01-02T00:00:00Z",
  },
];

describe("ReturnManagementPage Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (returnService.getRequests as jest.Mock).mockResolvedValue({
      data: { data: mockRequests, total: 2, totalPages: 1 },
    });
    (returnService.getSettings as jest.Mock).mockResolvedValue({
      data: { reviewDisplayConfig: null },
    });
    (returnService.getCategories as jest.Mock).mockResolvedValue({
      data: [{ defaultRole: "CUSTOMER", name: "العميل" }, { defaultRole: "STORE", name: "المتجر" }],
    });
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [] },
    });
  });

  it("renders returns telemetry bar and requests table cleanly", async () => {
    render(
      <BrowserRouter>
        <ReturnManagementPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ORD-1001")).toBeInTheDocument();
      expect(screen.getByText("ORD-1002")).toBeInTheDocument();
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
      expect(screen.getByText("سارة محمود")).toBeInTheDocument();
    });

    expect(screen.getByText("إجمالي المرتجعات")).toBeInTheDocument();
    expect(screen.getAllByText("بانتظار المراجعة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("تمت المراجعة").length).toBeGreaterThan(0);
  });

  it("switches review tab between pending and reviewed", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ReturnManagementPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    });

    const reviewedBtn = screen.getByRole("button", { name: /تمت المراجعة/ });
    await user.click(reviewedBtn);

    await waitFor(() => {
      expect(returnService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ isReviewed: "true" })
      );
    });
  });

  it("opens ReturnDetailsModal on clicking show button", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ReturnManagementPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole("button", { name: /عرض/ });
    await user.click(viewButtons[0]);

    expect(screen.getByTestId("mock-return-details-modal")).toBeInTheDocument();
  });
});
