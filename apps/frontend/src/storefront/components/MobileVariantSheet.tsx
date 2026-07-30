import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Star, X } from 'lucide-react';
import type { ProductVariant } from "../hooks/useProducts";
import VariantSelector from "./VariantSelector";
import QuantitySelector from "./QuantitySelector";

interface MobileVariantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "cart" | "checkout";
  productName: string;
  imageUrl?: string | null;
  displayPrice: string;
  selectedOptionSummary?: string;
  variants: ProductVariant[];
  selectedAttributes: Record<string, string>;
  onVariantChange: (attributes: Record<string, string>) => void;
  variantSettings?: {
    styles?: Record<string, unknown> | null;
    attributeImages?: Record<string, unknown> | null;
    attributeColors?: Record<string, unknown> | null;
  } | null;
  quantity: number;
  onQuantityChange: (value: number) => void;
  primaryActionText: string;
  onPrimaryAction: () => void;
  sizeGuideText?: string;
  onOpenSizeGuide?: () => void;
  availabilityText?: string;
  prefersArabicCopy?: boolean;
  bulkSavingsOffers?: Array<{
    id: string;
    label: string;
    unitPriceText: string;
    helperText?: string;
    quantity: number;
    isSelected?: boolean;
  }>;
  onSelectBulkSavingsOffer?: (quantity: number) => void;
}

const MobileVariantSheet: React.FC<MobileVariantSheetProps> = ({
  open,
  onOpenChange,
  mode,
  productName,
  imageUrl,
  displayPrice,
  selectedOptionSummary,
  variants,
  selectedAttributes,
  onVariantChange,
  variantSettings,
  quantity,
  onQuantityChange,
  primaryActionText,
  onPrimaryAction,
  sizeGuideText,
  onOpenSizeGuide,
  availabilityText,
  prefersArabicCopy = true,
  bulkSavingsOffers = [],
  onSelectBulkSavingsOffer,
}) => {
  const handlePrimaryAction = () => {
    onOpenChange(false);
    onPrimaryAction();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[88] bg-[#2d211e]/58 backdrop-blur-[3px] md:hidden" />
        <Dialog.Content className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] z-[89] mx-auto flex max-h-[78vh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-[1.55rem] border border-[#ddd1c5] bg-[rgba(255,252,248,0.985)] shadow-[0_34px_90px_-46px_rgba(91,57,40,0.48)] md:hidden">
          <Dialog.Title className="sr-only">
            {prefersArabicCopy ? "اختيار المقاس واللون" : "Choose size and color"}
          </Dialog.Title>

          <div className="px-4 pt-3">
            <div className="mx-auto h-1.5 w-14 rounded-full bg-[#dccfc4]" aria-hidden="true" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <div className="mx-auto max-w-md space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center overflow-hidden rounded-[0.35rem] border border-[#ede2d7] bg-white">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-black text-[#8f5c44]">
                      {productName.slice(0, 1)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-[1.55rem] font-black leading-none text-[#2d211e]">
                    {displayPrice}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6f5a54]">
                    {productName}
                  </p>
                  {selectedOptionSummary ? (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8f5c44]">
                      {selectedOptionSummary}
                    </p>
                  ) : null}
                </div>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#8d7469] transition-colors hover:text-[#2d211e]"
                    aria-label={prefersArabicCopy ? "إغلاق" : "Close"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="border-t border-[#efe3d8] pt-4">
                <VariantSelector
                  variants={variants}
                  selectedAttributes={selectedAttributes}
                  onChange={onVariantChange}
                  density="compact"
                  variantSettings={variantSettings}
                />
              </div>

              {availabilityText || onOpenSizeGuide ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#efe3d8] pt-3">
                  <p className="text-[11px] font-bold text-[#8f5c44]">
                    {availabilityText || ""}
                  </p>
                  {onOpenSizeGuide ? (
                    <button
                      type="button"
                      onClick={onOpenSizeGuide}
                      className="text-[11px] font-black text-[#7a5c4a] underline-offset-4 transition-colors hover:text-[#2d211e] hover:underline"
                    >
                      {sizeGuideText ||
                        (prefersArabicCopy ? "دليل المقاسات" : "Size guide")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {bulkSavingsOffers.length > 1 ? (
                <div className="border-t border-[#efe3d8] pt-3">
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#4a433e]">
                    <Sparkles className="h-3.5 w-3.5 text-[#987d68]" />
                    <span>
                      {prefersArabicCopy
                        ? "توفير الكميات"
                        : "Bulk Savings (Buy more save more)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {bulkSavingsOffers.map((offer) => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => onSelectBulkSavingsOffer?.(offer.quantity)}
                        className={`rounded-[0.35rem] border px-2 py-2 text-center transition-colors ${
                          offer.isSelected
                            ? "border-[#7cb800] bg-[#fbfff0] text-[#2d211e] shadow-[0_8px_26px_-20px_rgba(124,184,0,0.55)]"
                            : "border-[#e7ddd3] bg-white text-[#56453b] hover:border-[#cab39d]"
                        }`}
                      >
                        <div className="text-[11px] font-black uppercase tracking-[0.06em]">
                          {offer.label}
                        </div>
                        <div className="mt-1 text-[11px] font-medium leading-4">
                          {offer.unitPriceText}
                        </div>
                        {offer.helperText ? (
                          <div className="mt-0.5 text-[10px] leading-4 text-[#8d7469]">
                            {offer.helperText}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-[#efe3d8] pt-4">
                <div className="flex items-center gap-3">
                  <QuantitySelector value={quantity} onChange={onQuantityChange} />
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className={`h-12 w-full rounded-[0.95rem] px-4 text-sm font-black uppercase tracking-[0.14em] transition-transform hover:opacity-95 active:scale-[0.98] ${
                        mode === "checkout"
                          ? "bg-[#78aa00] text-white hover:bg-[#6d9a01]"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {primaryActionText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MobileVariantSheet;
