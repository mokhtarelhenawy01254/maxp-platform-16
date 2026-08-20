import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickStatusChange from "../QuickStatusChange";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockImplementation((url: string) => {
      const code = decodeURIComponent(url.split("/orders-enhanced/")[1] || "");
      return Promise.resolve({
        data: {
          success: true,
          data: {
            id: "order-" + code,
            orderNumber: code,
            status: "PENDING",
            customerName: "╪╣┘à┘è┘ä ╪¬╪¼╪▒┘è╪¿┘è",
            customerPhone: "01000000000",
            total: 250,
            currency: "EGP",
          },
        },
      });
    }),
    post: jest.fn().mockResolvedValue({
      data: { success: true, data: { status: "PENDING" } },
    }),
  },
}));

jest.mock("../../../services/orderWorkflowService", () => ({
  getStatuses: jest.fn().mockResolvedValue([
    { id: "s1", code: "PENDING", name: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒" },
    { id: "s2", code: "CONFIRMED", name: "┘à╪ñ┘â╪»" },
  ]),
  getConfig: jest.fn().mockResolvedValue({ data: { enabled: false } }),
}));

jest.mock("../../../utils/statusRegistry", () => ({
  getStatusDisplay: () => ({
    colorClass: "bg-gray-100 text-gray-700",
    labelKey: "status.pending",
    label: "PENDING",
  }),
  getSystemStatusOptions: () => [{ code: "PENDING", label: "Pending" }],
}));

import { apiClient } from "../../../services/apiClient";

const searchFor = (code: string) => {
  fireEvent.change(screen.getByPlaceholderText("quickStatus.orderCodePlaceholder"), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole("button", { name: "quickStatus.search" }));
};

describe("QuickStatusChange duplicate blocking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads an order on the first search without any duplicate modal", async () => {
    render(<QuickStatusChange />);
    searchFor("ORD-TEST-1");
    expect((await screen.findAllByText("ORD-TEST-1")).length).toBeGreaterThan(0);
    expect(screen.queryByText("quickStatus.duplicateTitle")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("opens a blocking modal when the same code is entered twice and disables the work buttons", async () => {
    render(<QuickStatusChange />);
    searchFor("ORD-TEST-1");
    await screen.findAllByText("ORD-TEST-1");

    searchFor("ORD-TEST-1");
    expect(await screen.findByText("quickStatus.duplicateTitle")).toBeInTheDocument();
    expect(screen.getByText("quickStatus.duplicateBlockedNote")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "quickStatus.duplicateAcknowledge" })).toBeInTheDocument();

    // While the modal is open, the work controls are disabled so the order cannot be processed
    expect(screen.getByRole("button", { name: "quickStatus.search" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "quickStatus.change" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "quickStatus.clear" })).toBeDisabled();
  });

  it("keeps the order blocked after the modal is acknowledged", async () => {
    render(<QuickStatusChange />);
    searchFor("ORD-TEST-1");
    await screen.findAllByText("ORD-TEST-1");

    searchFor("ORD-TEST-1");
    await screen.findByText("quickStatus.duplicateTitle");
    fireEvent.click(screen.getByRole("button", { name: "quickStatus.duplicateAcknowledge" }));
    expect(screen.queryByText("quickStatus.duplicateTitle")).not.toBeInTheDocument();

    // Re-entering the same blocked code is rejected without a new API call
    searchFor("ORD-TEST-1");
    expect(await screen.findByText("quickStatus.orderBlocked")).toBeInTheDocument();
    expect(screen.queryByText("╪╣┘à┘è┘ä ╪¬╪¼╪▒┘è╪¿┘è")).not.toBeInTheDocument();
    // API was hit exactly twice (first legit search + second search that detected the duplicate),
    // and the blocked re-entry above must NOT have triggered another call
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("still allows working on other orders after a block", async () => {
    render(<QuickStatusChange />);
    searchFor("ORD-TEST-1");
    await screen.findAllByText("ORD-TEST-1");

    searchFor("ORD-TEST-1");
    await screen.findByText("quickStatus.duplicateTitle");
    fireEvent.click(screen.getByRole("button", { name: "quickStatus.duplicateAcknowledge" }));

    searchFor("ORD-TEST-2");
    expect((await screen.findAllByText("ORD-TEST-2")).length).toBeGreaterThan(0);
    expect(screen.queryByText("quickStatus.duplicateTitle")).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/orders-enhanced/ORD-TEST-2");
  });
});
