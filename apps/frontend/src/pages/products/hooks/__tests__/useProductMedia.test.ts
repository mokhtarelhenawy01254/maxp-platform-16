import { act, renderHook } from "@testing-library/react";
import { useProductMedia } from "../useProductMedia";
import * as apiHelpers from "../../../../utils/apiHelpers";

jest.mock("../../../../utils/apiHelpers", () => ({
  uploadFiles: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock("../../../../utils/imageUrl", () => ({
  normalizeImagePath: (value: string) => value,
}));

describe("useProductMedia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes images from the local draft without deleting the shared upload", async () => {
    const { result } = renderHook(() =>
      useProductMedia([
        "/uploads/products/original-1.webp",
        "/uploads/products/original-2.webp",
      ])
    );

    await act(async () => {
      await result.current.removeUploadedImage("/uploads/products/original-1.webp");
    });

    expect(result.current.uploadedImages).toEqual([
      "/uploads/products/original-2.webp",
    ]);
    expect(apiHelpers.deleteFile).not.toHaveBeenCalled();
  });
});
