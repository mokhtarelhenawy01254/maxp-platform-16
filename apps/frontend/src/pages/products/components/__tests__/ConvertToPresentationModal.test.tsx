import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ConvertToPresentationModal } from "../ConvertToPresentationModal";
import type { ConvertPresentationResult } from "../../hooks/useProductPresentations";

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../../utils/imageUrl", () => ({
  getImageUrl: (value: string) => value,
}));

import { apiClient } from "../../../../services/apiClient";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const convertResult: ConvertPresentationResult = {
  presentation: {
    id: "pres-1",
    name: "المنتج الأصلي",
    slug: "original",
    images: [],
    isActive: true,
    sortOrder: 0,
  },
  targetProductId: "target-1",
  presentationSlug: "original/pres-1",
  movedOrderItems: 3,
  mergedStock: true,
};

describe("ConvertToPresentationModal", () => {
  const onConvert = jest.fn();
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: "target-1", name: "المنتج الأصلي", sku: "SKU-1", price: 150, mainImage: "/img1.png" },
          { id: "current-1", name: "المنتج الحالي", sku: "SKU-CURRENT" },
        ],
      },
    });
    onConvert.mockResolvedValue(convertResult);
  });

  const renderModal = () =>
    render(
      <ConvertToPresentationModal
        open
        currentProductId="current-1"
        displayCurrency="ج.م"
        onClose={onClose}
        onConvert={onConvert}
        onSuccess={onSuccess}
      />,
    );

  it("renders explainer, warning, and a disabled confirm button", () => {
    renderModal();

    expect(
      screen.getByText(/حوّل هذا المنتج \(المكرر\) إلى عرض تقديمي/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/الطلبات القديمة المرتبطة بهذا المنتج/),
    ).toBeInTheDocument();
    expect(screen.getByText("تأكيد التحويل")).toBeDisabled();
  });

  it("excludes the current product from the result list", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("المنتج الأصلي")).toBeInTheDocument();
    });
    expect(screen.queryByText("المنتج الحالي")).not.toBeInTheDocument();
    expect(screen.queryByText("SKU-CURRENT")).not.toBeInTheDocument();
  });

  it("selects a target, then submits and notifies success", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("المنتج الأصلي")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("المنتج الأصلي"));
    expect(screen.getByText(/المنتج الأصلي المحدد/)).toBeInTheDocument();

    const confirmButton = screen.getByText("تأكيد التحويل").closest("button");
    expect(confirmButton).not.toBeNull();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(onConvert).toHaveBeenCalledWith("target-1");
      expect(onSuccess).toHaveBeenCalledWith(convertResult);
    });
  });

  it("shows the API error message inline on failure", async () => {
    onConvert.mockRejectedValue(new Error("المنتج الأصلي غير موجود"));
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("المنتج الأصلي")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("المنتج الأصلي"));
    fireEvent.click(screen.getByText("تأكيد التحويل"));

    await waitFor(() => {
      expect(screen.getByText("المنتج الأصلي غير موجود")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes via the cancel button", () => {
    renderModal();
    fireEvent.click(screen.getByText("إلغاء"));
    expect(onClose).toHaveBeenCalled();
  });
});
