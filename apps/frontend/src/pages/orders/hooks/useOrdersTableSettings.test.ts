import { renderHook, act } from "@testing-library/react";
import { useOrdersTableSettings } from "./useOrdersTableSettings";
import { ORDER_TABLE_COLUMNS } from "../utils/ordersTableHelpers";

describe("useOrdersTableSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default comfortable density and full columns when no config is passed", () => {
    const { result } = renderHook(() => useOrdersTableSettings());

    expect(result.current.tableDensity).toBe("comfortable");
    expect(result.current.columnsToRender).toEqual(ORDER_TABLE_COLUMNS);
    expect(result.current.tableColumnCount).toBe(ORDER_TABLE_COLUMNS.length);
  });

  it("adds 1 to tableColumnCount when canSelectOrders is true", () => {
    const { result } = renderHook(() =>
      useOrdersTableSettings({ canSelectOrders: true }),
    );

    expect(result.current.tableColumnCount).toBe(ORDER_TABLE_COLUMNS.length + 1);
  });

  it("updates tableDensity and persists to localStorage via changeTableDensity", () => {
    const { result } = renderHook(() => useOrdersTableSettings());

    act(() => {
      result.current.changeTableDensity("compact");
    });

    expect(result.current.tableDensity).toBe("compact");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("orders:table-density", "compact");
  });

  it("normalizes and updates visible columns when company settings change", () => {
    const initialColumns = ["orderNumber", "customer", "status"];
    const { result, rerender } = renderHook(
      ({ companyCols }) =>
        useOrdersTableSettings({
          companyOrdersTableColumns: companyCols,
          canSelectOrders: false,
        }),
      {
        initialProps: { companyCols: initialColumns },
      },
    );

    expect(result.current.visibleColumns).toEqual(initialColumns);
    expect(result.current.columnsToRender).toEqual(initialColumns);
    expect(result.current.tableColumnCount).toBe(3);

    const updatedColumns = ["orderNumber", "amount"];
    rerender({ companyCols: updatedColumns });

    expect(result.current.visibleColumns).toEqual(updatedColumns);
    expect(result.current.columnsToRender).toEqual(updatedColumns);
    expect(result.current.tableColumnCount).toBe(2);
  });
});
