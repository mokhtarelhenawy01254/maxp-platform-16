import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DispatchCarrierModal } from "./DispatchCarrierModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("DispatchCarrierModal", () => {
  const mockCarriers = [
    {
      id: "carrier-1",
      name: "كيو بي إكسبريس",
      providerKey: "QP_EXPRESS",
      isActive: true,
    },
    {
      id: "carrier-2",
      name: "تربو",
      providerKey: "TURBO",
      isActive: true,
    },
  ];

  it("renders when isOpen is true (using open/isOpen backwards compat)", () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <MemoryRouter>
        <DispatchCarrierModal
          isOpen={true}
          onClose={handleClose}
          ordersCount={5}
          carriers={mockCarriers}
          onConfirm={handleConfirm}
          loading={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("شحن وتجهيز الطلبات")).toBeInTheDocument();
    expect(screen.getByText("كيو بي إكسبريس")).toBeInTheDocument();
    expect(screen.getByText("تربو")).toBeInTheDocument();
  });

  it("selects carrier and confirms dispatch", () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <MemoryRouter>
        <DispatchCarrierModal
          isOpen={true}
          onClose={handleClose}
          ordersCount={5}
          carriers={mockCarriers}
          onConfirm={handleConfirm}
          loading={false}
        />
      </MemoryRouter>
    );

    const turboOption = screen.getByText("تربو");
    fireEvent.click(turboOption);

    const confirmBtn = screen.getByRole("button", { name: /تأكيد وشحن عبر تربو/i });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "carrier-2",
        name: "تربو",
        providerKey: "TURBO",
      })
    );
  });

  it("shows fallback warning when no carriers are available", () => {
    render(
      <MemoryRouter>
        <DispatchCarrierModal
          isOpen={true}
          onClose={jest.fn()}
          ordersCount={2}
          carriers={[]}
          onConfirm={jest.fn()}
          loading={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("لا توجد شركة شحن مفعلة حالياً")).toBeInTheDocument();
  });
});
