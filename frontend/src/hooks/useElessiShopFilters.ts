import { useCallback, useState } from "react";

export type ElessiViewMode = "grid" | "list";

export interface UseElessiShopFiltersOptions {
  initialView?: ElessiViewMode;
}

export interface UseElessiShopFiltersResult {
  viewMode: ElessiViewMode;
  selectedSize: string | null;
  selectedColor: string | null;
  setViewMode: (mode: ElessiViewMode) => void;
  handleSizeSelect: (size: string) => void;
  handleColorSelect: (colorId: string) => void;
}

export const useElessiShopFilters = (
  options: Readonly<UseElessiShopFiltersOptions> = {},
): UseElessiShopFiltersResult => {
  const { initialView = "grid" } = options;
  const [viewMode, setViewMode] = useState<ElessiViewMode>(initialView);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleSizeSelect = useCallback((size: string) => {
    setSelectedSize((previous) => (previous === size ? null : size));
  }, []);

  const handleColorSelect = useCallback((colorId: string) => {
    setSelectedColor((previous) => (previous === colorId ? null : colorId));
  }, []);

  return {
    viewMode,
    selectedSize,
    selectedColor,
    setViewMode,
    handleSizeSelect,
    handleColorSelect,
  };
};
