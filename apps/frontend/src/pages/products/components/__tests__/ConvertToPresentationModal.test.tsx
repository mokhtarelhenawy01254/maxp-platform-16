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
    name: "╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è",
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
          { id: "target-1", name: "╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è", sku: "SKU-1", price: 150, mainImage: "/img1.png" },
          { id: "current-1", name: "╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪¡╪º┘ä┘è", sku: "SKU-CURRENT" },
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
        displayCurrency="╪¼.┘à"
        onClose={onClose}
        onConvert={onConvert}
        onSuccess={onSuccess}
      />,
    );

  it("renders explainer, warning, and a disabled confirm button", () => {
    renderModal();

    expect(
      screen.getByText(/╪¡┘ê┘æ┘ä ┘ç╪░╪º ╪º┘ä┘à┘å╪¬╪¼ \(╪º┘ä┘à┘â╪▒╪▒\) ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘ç╪░╪º ╪º┘ä┘à┘å╪¬╪¼/),
    ).toBeInTheDocument();
    expect(screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪¬╪¡┘ê┘è┘ä")).toBeDisabled();
  });

  it("excludes the current product from the result list", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è")).toBeInTheDocument();
    });
    expect(screen.queryByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪¡╪º┘ä┘è")).not.toBeInTheDocument();
    expect(screen.queryByText("SKU-CURRENT")).not.toBeInTheDocument();
  });

  it("selects a target, then submits and notifies success", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è"));
    expect(screen.getByText(/╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è ╪º┘ä┘à╪¡╪»╪»/)).toBeInTheDocument();

    const confirmButton = screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪¬╪¡┘ê┘è┘ä").closest("button");
    expect(confirmButton).not.toBeNull();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(onConvert).toHaveBeenCalledWith("target-1");
      expect(onSuccess).toHaveBeenCalledWith(convertResult);
    });
  });

  it("shows the API error message inline on failure", async () => {
    onConvert.mockRejectedValue(new Error("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»"));
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è"));
    fireEvent.click(screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪¬╪¡┘ê┘è┘ä"));

    await waitFor(() => {
      expect(screen.getByText("╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes via the cancel button", () => {
    renderModal();
    fireEvent.click(screen.getByText("╪Ñ┘ä╪║╪º╪í"));
    expect(onClose).toHaveBeenCalled();
  });
});
