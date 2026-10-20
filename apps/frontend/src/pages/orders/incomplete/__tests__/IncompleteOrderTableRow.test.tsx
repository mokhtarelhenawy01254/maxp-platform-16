// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IncompleteOrderTableRow } from "../IncompleteOrderTableRow";
import { IncompleteOrderCustomerCell } from "../IncompleteOrderCustomerCell";
import { IncompleteOrderStatusCell } from "../IncompleteOrderStatusCell";
import { IncompleteOrderTableRowActions } from "../IncompleteOrderTableRowActions";
import type { IncompleteOrder } from "../incompleteUtils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; name?: string; total?: string }) => {
      if (opts?.defaultValue) return opts.defaultValue;
      return key;
    },
    i18n: { language: "ar" },
  }),
}));

afterEach(() => {
  cleanup();
});

describe("IncompleteOrderCustomerCell", () => {
  it("renders customer name, cartId truncated, and governorate", () => {
    render(
      <table>
        <tbody>
          <tr>
            <IncompleteOrderCustomerCell
              name="أحمد محمود"
              cartId="cart-abc-123456789"
              governorate="القاهرة"
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText("أحمد محمود")).toBeInTheDocument();
    expect(screen.getByText("cart-abc-123...")).toBeInTheDocument();
    expect(screen.getByText("القاهرة")).toBeInTheDocument();
  });
});

describe("IncompleteOrderStatusCell", () => {
  it("renders status badge and urgent expiry when provided", () => {
    render(
      <table>
        <tbody>
          <tr>
            <IncompleteOrderStatusCell
              status="active"
              expiry={{ label: "ينتهي قريباً", urgent: true }}
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText("ينتهي قريباً")).toBeInTheDocument();
  });
});

describe("IncompleteOrderTableRowActions", () => {
  const dummyOrder: IncompleteOrder = {
    cartId: "cart-12345",
    total: 300,
    itemsCount: 1,
    status: "active",
    createdAt: "2026-10-20T10:00:00Z",
    checkoutData: {
      phone: "01012345678",
      name: "سامي علي",
    },
  };

  it("triggers actions callback handlers", () => {
    const onConfirmConvert = vi.fn();
    const onOpenContactModal = vi.fn();
    const onOpenCancelModal = vi.fn();
    const onCopyCartId = vi.fn();

    render(
      <MemoryRouter>
        <table>
          <tbody>
            <tr>
              <IncompleteOrderTableRowActions
                order={dummyOrder}
                phone="01012345678"
                whatsappUrl="https://wa.me/01012345678"
                isConverting={false}
                isCopied={false}
                onCopyCartId={onCopyCartId}
                onConfirmConvert={onConfirmConvert}
                onOpenContactModal={onOpenContactModal}
                onOpenCancelModal={onOpenCancelModal}
              />
            </tr>
          </tbody>
        </table>
      </MemoryRouter>,
    );

    const convertBtn = screen.getByTitle("orders.incompleteQuickConvert");
    fireEvent.click(convertBtn);
    expect(onConfirmConvert).toHaveBeenCalledWith("cart-12345");

    const contactBtn = screen.getByTitle("orders.incompleteLogContact");
    fireEvent.click(contactBtn);
    expect(onOpenContactModal).toHaveBeenCalledWith("cart-12345");

    const cancelBtn = screen.getByTitle("orders.incompleteCancelOrder");
    fireEvent.click(cancelBtn);
    expect(onOpenCancelModal).toHaveBeenCalledWith(dummyOrder);

    const copyBtn = screen.getByTitle("orders.incompleteCopyId");
    fireEvent.click(copyBtn);
    expect(onCopyCartId).toHaveBeenCalled();
  });
});

describe("IncompleteOrderTableRow", () => {
  const dummyOrder: IncompleteOrder = {
    cartId: "cart-full-row-123",
    total: 450,
    status: "active",
    itemsCount: 2,
    createdAt: "2026-10-20T10:00:00Z",
    checkoutData: {
      phone: "01298765432",
      name: "عمرو خالد",
      governorate: "الإسكندرية",
    },
    abandonReason: {
      code: "shipping_cost",
    },
  };

  it("renders full row and navigates on row click", () => {
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <IncompleteOrderTableRow
              order={dummyOrder}
              idx={0}
              canShowAttribution={false}
              convertingCartId={null}
              copiedId={null}
              onCopyCartId={vi.fn()}
              onConfirmConvert={vi.fn()}
              onOpenContactModal={vi.fn()}
              onOpenCancelModal={vi.fn()}
            />
          </tbody>
        </table>
      </MemoryRouter>,
    );

    expect(screen.getByText("عمرو خالد")).toBeInTheDocument();
    expect(screen.getByText("01298765432")).toBeInTheDocument();
    expect(screen.getByText(/٤٥٠|450/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
