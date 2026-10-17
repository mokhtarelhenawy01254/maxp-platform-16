jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PreparationOrdersTable from "../components/PreparationOrdersTable";
import type { PreparationOrder } from "../types";

// Mock i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${key} (${opts.count})`;
      return key;
    },
  }),
}));

const mockOrder: PreparationOrder = {
  orderNumber: "ORD-1001",
  customerName: "Ahmed Ali",
  customerPhone: "01012345678",
  city: "Cairo",
  governorate: "Cairo",
  totalUnits: 3,
  totalValue: 450,
  stage: "PREPARING",
  normalizedStatus: "preparing",
  isReady: true,
  missingItemsCount: 0,
  createdAt: "2026-10-17T10:00:00Z",
  printCount: 1,
  printedAt: "2026-10-17T11:00:00Z",
  turboTrackingNumber: "TRB-9988",
  shipments: [],
  sourceType: "manual",
  items: [
    {
      id: "item-1",
      sku: "SKU-A",
      productName: "T-Shirt",
      quantity: 3,
      unitPrice: 150,
    },
  ],
  itemInsights: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "T-Shirt",
      displayName: "T-Shirt",
      required: 3,
      available: 5,
      shortage: 0,
      transfers: [],
    },
  ],
  metadata: {},
};

const defaultProps = {
  orders: [mockOrder],
  statusSelections: {},
  statusOptions: [{ code: "PREPARING", fallbackName: "قيد التجهيز" }],
  statusLabelMap: new Map([["PREPARING", "قيد التجهيز"]]),
  selectedSet: new Set<string>(),
  rowUpdatingId: null,
  shortageSavingOrderId: null,
  problemHoldSavingOrderId: null,
  selectedWarehouseId: "wh-1",
  enabledQcChecks: [],
  qcChecklistState: {},
  shortageHoldDrafts: {},
  problemHoldDrafts: {},
  transferingItemKey: null,
  printingOrderNumber: null,
  preparationSettings: {
    startingStatus: "PREPARING",
    handoffStatus: "PACKAGED",
    enableQcChecklist: false,
    batchSize: 20,
    defaultWarehouseId: "wh-1",
  },
  visibleColumns: [
    "customer",
    "units",
    "value",
    "status",
    "problem",
    "warehouse",
    "readiness",
    "printStatus",
    "shippingCode",
  ] as any[],
  formatPrice: (v: number) => `${v} EGP`,
  formatDate: (v: string) => v,
  onToggleSelection: jest.fn(),
  onQuickTransfer: jest.fn(),
  onShortageFieldChange: jest.fn(),
  onSaveShortageHoldDetails: jest.fn().mockResolvedValue(true),
  onQcCheckToggle: jest.fn(),
  onStatusSelectionChange: jest.fn(),
  onSingleStatusUpdate: jest.fn(),
  onMarkAsShortageHold: jest.fn(),
  onReleaseShortageHold: jest.fn(),
  onMarkAsShortageFailed: jest.fn(),
  onHoldAsProblem: jest.fn(),
  onReleaseProblemHold: jest.fn(),
  onEditProblemReason: jest.fn(),
  onPrintPreparationSlip: jest.fn(),
};

describe("PreparationOrdersTable Component", () => {
  it("renders order row with customer name and tabular unit figures", () => {
    render(
      <BrowserRouter>
        <PreparationOrdersTable {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText("#ORD-1001")).toBeInTheDocument();
    expect(screen.getByText("Ahmed Ali")).toBeInTheDocument();
    expect(screen.getByText("01012345678")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("450 EGP")).toBeInTheDocument();
  });

  it("handles selection checkbox toggle", () => {
    render(
      <BrowserRouter>
        <PreparationOrdersTable {...defaultProps} />
      </BrowserRouter>
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onToggleSelection).toHaveBeenCalledWith("ORD-1001");
  });

  it("toggles expanded details drawer when clicking details button", () => {
    render(
      <BrowserRouter>
        <PreparationOrdersTable {...defaultProps} />
      </BrowserRouter>
    );

    const detailsBtn = screen.getByText("preparation.table.details");
    fireEvent.click(detailsBtn);

    // After expanding, items list or actions should appear
    expect(screen.getByText(/T-Shirt/i)).toBeInTheDocument();
  });
});
