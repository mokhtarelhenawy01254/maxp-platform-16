import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PartialDeliveryModal from "./PartialDeliveryModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number) => `${amount} ج.م`,
    isLoading: false,
    error: null,
  }),
}));

const mockOrder = {
  orderNumber: "ORD-001",
  currency: "EGP",
  items: [
    {
      id: "item-1",
      name: "فستان شيفون",
      price: "450",
      quantity: 3,
      total: 1350,
      productColor: "أسود",
      productSize: "M",
      metadata: {},
    },
    {
      id: "item-2",
      name: "حذاء رياضي",
      price: "300",
      quantity: 2,
      total: 600,
      productColor: "أبيض",
      metadata: {},
    },
  ],
};

describe("PartialDeliveryModal", () => {
  it("renders correctly when open", () => {
    render(
      <PartialDeliveryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        order={mockOrder}
      />,
    );

    expect(screen.getByText("orders.partialDeliveryTitle")).toBeInTheDocument();
    expect(screen.getByText("فستان شيفون")).toBeInTheDocument();
    expect(screen.getByText("حذاء رياضي")).toBeInTheDocument();
    expect(screen.getByText("orders.partialDeliveryAction")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <PartialDeliveryModal
        isOpen={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        order={mockOrder}
      />,
    );

    // The Dialog portal is always mounted, but the content should not be visible.
    expect(screen.queryByText("orders.partialDeliveryTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("orders.partialDeliveryAction")).not.toBeInTheDocument();
  });

  it("shows default delivered quantities equal to item quantities", () => {
    render(
      <PartialDeliveryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        order={mockOrder}
      />,
    );

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(Number(inputs[0].value)).toBe(3);
    expect(Number(inputs[1].value)).toBe(2);
  });

  it("splits items into delivered and returned when quantities are reduced", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <PartialDeliveryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        order={mockOrder}
      />,
    );

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "2" } });

    fireEvent.click(screen.getByText("orders.partialDeliveryAction"));

    await screen.findByText("orders.partialDeliveryAction");

    expect(onConfirm).toHaveBeenCalledTimes(1);

    const [deliveredItems, returnedItems] = onConfirm.mock.calls[0];
    expect(deliveredItems).toHaveLength(2);
    expect(deliveredItems[0].quantity).toBe(2);
    expect(deliveredItems[1].quantity).toBe(2);

    expect(returnedItems).toHaveLength(1);
    expect(returnedItems[0].name).toBe("فستان شيفون");
    expect(returnedItems[0].quantity).toBe(1);
  });

  it("shows returned count warning when any item has reduced quantity", () => {
    render(
      <PartialDeliveryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        order={mockOrder}
      />,
    );

    expect(screen.getAllByText(/orders\.partialDeliveryComplete/)).toHaveLength(2);

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "1" } });

    expect(screen.getByText("orders.partialDeliveryReturned")).toBeInTheDocument();
    expect(screen.getByText(/orders\.partialDeliveryComplete/)).toBeInTheDocument();
  });

  it("disables confirm button when all quantities are zero", () => {
    render(
      <PartialDeliveryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        order={mockOrder}
      />,
    );

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "0" } });
    fireEvent.change(inputs[1], { target: { value: "0" } });

    const confirmBtn = screen.getByText("orders.partialDeliveryAction");
    expect(confirmBtn).toBeDisabled();
  });
});
