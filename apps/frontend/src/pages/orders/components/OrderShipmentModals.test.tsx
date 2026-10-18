import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderShipmentModals } from "./OrderShipmentModals";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderShipmentModals", () => {
  it("renders cancellation modal when showCancelShipmentModal is true", () => {
    const cancelShipment = jest.fn().mockResolvedValue(true);
    const setShowCancelShipmentModal = jest.fn();

    render(
      <OrderShipmentModals
        showCancelShipmentModal={true}
        setShowCancelShipmentModal={setShowCancelShipmentModal}
        showUnlinkShipmentModal={false}
        setShowUnlinkShipmentModal={jest.fn()}
        showRecreateShipmentModal={false}
        setShowRecreateShipmentModal={jest.fn()}
        cancelShipment={cancelShipment}
        unlinkShipment={jest.fn().mockResolvedValue(true)}
        handleRecreateShipment={jest.fn().mockResolvedValue(undefined)}
        turboLoading={false}
      />
    );

    expect(screen.getByText("إلغاء الشحنة")).toBeInTheDocument();
    expect(screen.getByText("هل أنت متأكد من إلغاء هذه الشحنة لدى شركة الشحن؟")).toBeInTheDocument();
  });

  it("renders unlink modal when showUnlinkShipmentModal is true", () => {
    render(
      <OrderShipmentModals
        showCancelShipmentModal={false}
        setShowCancelShipmentModal={jest.fn()}
        showUnlinkShipmentModal={true}
        setShowUnlinkShipmentModal={jest.fn()}
        showRecreateShipmentModal={false}
        setShowRecreateShipmentModal={jest.fn()}
        cancelShipment={jest.fn().mockResolvedValue(true)}
        unlinkShipment={jest.fn().mockResolvedValue(true)}
        handleRecreateShipment={jest.fn().mockResolvedValue(undefined)}
        turboLoading={false}
      />
    );

    expect(screen.getByText("إلغاء ربط شحنة تيربو")).toBeInTheDocument();
    expect(screen.getByText("هل أنت متأكد من فك ارتباط هذه الشحنة بهذا الطلب؟")).toBeInTheDocument();
  });

  it("renders recreate modal when showRecreateShipmentModal is true", () => {
    render(
      <OrderShipmentModals
        showCancelShipmentModal={false}
        setShowCancelShipmentModal={jest.fn()}
        showUnlinkShipmentModal={false}
        setShowUnlinkShipmentModal={jest.fn()}
        showRecreateShipmentModal={true}
        setShowRecreateShipmentModal={jest.fn()}
        cancelShipment={jest.fn().mockResolvedValue(true)}
        unlinkShipment={jest.fn().mockResolvedValue(true)}
        handleRecreateShipment={jest.fn().mockResolvedValue(undefined)}
        turboLoading={false}
      />
    );

    expect(screen.getByText("إعادة إنشاء الشحنة")).toBeInTheDocument();
    expect(screen.getByText("سيتم إنشاء شحنة جديدة وتحديث بيانات التتبع.")).toBeInTheDocument();
  });
});
