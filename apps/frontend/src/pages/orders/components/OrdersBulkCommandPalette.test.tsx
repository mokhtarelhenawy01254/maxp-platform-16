import React from "react";
import { render } from "@testing-library/react";
import { OrdersBulkCommandPalette } from "./OrdersBulkCommandPalette";

jest.mock("../../../components/common/CommandPalette", () => ({
  CommandPalette: ({ extraCommands, showTrigger }: any) => (
    <div data-testid="mock-command-palette" data-show-trigger={showTrigger}>
      {extraCommands?.map((cmd: any) => (
        <button
          key={cmd.id}
          data-testid={`cmd-${cmd.id}`}
          onClick={cmd.onSelect}
        >
          {cmd.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  }),
}));

describe("OrdersBulkCommandPalette", () => {
  const defaultProps = {
    hasActiveTurbo: false,
    hasActiveQpExpress: false,
    hasActiveBosta: false,
    handleBulkPrintInvoices: jest.fn(),
    handleBulkCreateTurboShipments: jest.fn(),
    handleBulkCreateQpExpressShipments: jest.fn(),
    handleBulkCreateBostaShipments: jest.fn(),
    handleBulkDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic commands (print and delete) when no carriers are active", () => {
    const { getByTestId, queryByTestId } = render(
      <OrdersBulkCommandPalette {...defaultProps} />
    );

    expect(getByTestId("cmd-bulk-print")).toBeInTheDocument();
    expect(getByTestId("cmd-bulk-delete")).toBeInTheDocument();
    expect(queryByTestId("cmd-bulk-turbo")).not.toBeInTheDocument();
    expect(queryByTestId("cmd-bulk-qpexpress")).not.toBeInTheDocument();
    expect(queryByTestId("cmd-bulk-bosta")).not.toBeInTheDocument();
  });

  it("renders carrier-specific commands when active", () => {
    const { getByTestId } = render(
      <OrdersBulkCommandPalette
        {...defaultProps}
        hasActiveTurbo={true}
        hasActiveQpExpress={true}
        hasActiveBosta={true}
      />
    );

    expect(getByTestId("cmd-bulk-turbo")).toBeInTheDocument();
    expect(getByTestId("cmd-bulk-qpexpress")).toBeInTheDocument();
    expect(getByTestId("cmd-bulk-bosta")).toBeInTheDocument();
  });

  it("calls appropriate handler when command is triggered", () => {
    const { getByTestId } = render(
      <OrdersBulkCommandPalette
        {...defaultProps}
        hasActiveTurbo={true}
      />
    );

    getByTestId("cmd-bulk-print").click();
    expect(defaultProps.handleBulkPrintInvoices).toHaveBeenCalledTimes(1);

    getByTestId("cmd-bulk-turbo").click();
    expect(defaultProps.handleBulkCreateTurboShipments).toHaveBeenCalledTimes(1);

    getByTestId("cmd-bulk-delete").click();
    expect(defaultProps.handleBulkDelete).toHaveBeenCalledTimes(1);
  });
});
