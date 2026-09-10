import React from "react";
import { render, screen } from "@testing-library/react";
import { BulkActionBar } from "../components/BulkActionBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "orders.bulkActionsBar": "شريط الإجراءات المجمعة",
        "orders.ordersSelected": "تم تحديد طلب",
        "orders.bulkActionsHint": "إجراءات جماعية",
        "orders.deselect": "إلغاء التحديد",
        "orders.updateStatus": "تحديث الحالة...",
        "orders.printInvoices": "طباعة الفواتير",
        "orders.createTurboShipments": "إنشاء شحنات Turbo",
        "orders.trash": "سلة المهملات",
      };
      return translations[key] || key;
    },
  }),
}));

describe("BulkActionBar carrier button conditional rendering", () => {
  const baseProps = {
    count: 2,
    statuses: [{ code: "confirmed", name: "مؤكد" }],
    isTrashView: false,
    busy: false,
    printing: false,
    onClearSelection: jest.fn(),
    onStatusChange: jest.fn(),
    onPrintInvoices: jest.fn(),
    onDelete: jest.fn(),
  };

  it("does not render any shipping buttons when no shipping callbacks are provided", () => {
    render(<BulkActionBar {...baseProps} />);

    expect(screen.queryByText(/Turbo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/QP Express/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bosta/i)).not.toBeInTheDocument();
    expect(screen.getByText("طباعة الفواتير")).toBeInTheDocument();
  });

  it("renders only Turbo button when only onCreateTurboShipments is provided", () => {
    render(
      <BulkActionBar
        {...baseProps}
        onCreateTurboShipments={jest.fn()}
      />,
    );

    expect(screen.getByText(/Turbo/i)).toBeInTheDocument();
    expect(screen.queryByText(/QP Express/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bosta/i)).not.toBeInTheDocument();
  });

  it("renders only QP Express button when only onCreateQpExpressShipments is provided", () => {
    render(
      <BulkActionBar
        {...baseProps}
        onCreateQpExpressShipments={jest.fn()}
      />,
    );

    expect(screen.queryByText(/Turbo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/QP Express/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bosta/i)).not.toBeInTheDocument();
  });

  it("renders only Bosta button when only onCreateBostaShipments is provided", () => {
    render(
      <BulkActionBar
        {...baseProps}
        onCreateBostaShipments={jest.fn()}
      />,
    );

    expect(screen.queryByText(/Turbo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/QP Express/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Bosta/i)).toBeInTheDocument();
  });

  it("renders all three buttons when all three are provided", () => {
    render(
      <BulkActionBar
        {...baseProps}
        onCreateTurboShipments={jest.fn()}
        onCreateQpExpressShipments={jest.fn()}
        onCreateBostaShipments={jest.fn()}
      />,
    );

    expect(screen.getByText(/Turbo/i)).toBeInTheDocument();
    expect(screen.getByText(/QP Express/i)).toBeInTheDocument();
    expect(screen.getByText(/Bosta/i)).toBeInTheDocument();
  });
});
