# Facebook Inbox: Labeled Products Button + Compact Product/Image Grid

## Problem

The Facebook inbox composer already had a product picker, but it was exposed only as a small unlabeled bag icon that users easily missed. Users wanted an obvious button next to the message input that shows all store products together with their images in a small, at-a-glance format, then lets them send the product's images as a message to the customer ΓÇö instead of keeping product photos on their own device.

## Changes

- `frontend/src/components/facebook-inbox/MessageInput/MessageInput.tsx`
  - Replaced the icon-only product picker button with a clearly labeled `╪º┘ä┘à┘å╪¬╪¼╪º╪¬` chip button (bag icon + text) rendered next to the message input tools row when `onOpenProductPicker` is provided.
- `frontend/src/components/facebook-inbox/ProductImagePicker/ProductImagePickerModal.tsx`
  - Each product card in the catalog grid now also renders a row of small thumbnails (up to 4) of all of the product's images (`buildProductImages`), with a `+N` overflow indicator, so images are visible directly in the products list without opening the product.
  - Selecting a product now pre-selects all of its images (previously none were selected), so the user immediately sees exactly which images will be sent as a message and can uncheck any they do not want.
  - Updated the hint bar text for the new default-selected behavior.
  - Made the catalog grid more compact: 3/4/5 columns (mobile/tablet/desktop), fixed-height media (`h-20`/`h-24`) instead of full `aspect-square` cards, smaller padding, text and thumbnail sizes so more products fit on screen at once.

## Behavior After Change

1. User opens a Facebook conversation and clicks the `╪º┘ä┘à┘å╪¬╪¼╪º╪¬` button in the composer.
2. The modal lists all store products (searchable, paginated) with their images shown as small thumbnails on each card.
3. Clicking a product shows its images with all of them selected by default.
4. User clicks `╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪╡┘ê╪▒` (images only) or `╪╡┘ê╪▒ + ╪º╪│┘à ┘ê╪│╪╣╪▒` (adds product name and price text) and the images are sent to the customer through the existing `/conversations/:id/send-existing-image` flow.

## Verification

- `eslint` on both changed files reports no new issues (only pre-existing `any`-typing warnings elsewhere in the same files).
- `tsc --noEmit` reports no errors in the two changed files.
