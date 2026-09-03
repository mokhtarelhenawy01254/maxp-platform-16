# WhatsApp Mobile Dropdown Viewport Clamping & Alignment Fix

**Date:** 2026-09-03  
**Status:** Completed  
**Components:**
- `apps/frontend/src/components/ui/dropdown-menu.tsx`
- `apps/frontend/src/components/ui/select.tsx`
- `apps/frontend/src/components/ui/combobox.tsx`

---

## 1. Problem Description
On mobile devices in RTL mode (Arabic interface), clicking the action trigger (three vertical dots menu) in the WhatsApp header rendered the dropdown menu off-screen to the left, leaving only a thin slice of the menu icons visible.

### Root Cause
The fallback positioning logic inside `DropdownMenuContent`, `SelectContent`, and `ComboboxContent` unconditionally calculated:
```ts
const left = isRtl ? triggerRect.right - menuRect.width : triggerRect.left;
```
1. It ignored the `align` prop (`start`, `end`, `center`).
2. In RTL mode, when a trigger was located near the left edge of the screen (such as the WhatsApp mobile header where `triggerRect.right` is ~44px and `menuRect.width` is ~208px), the resulting coordinate was negative (~ -164px).
3. There was no viewport clamping.

---

## 2. Solution Implemented
1. **Respect Alignment:**
   - Supported `start`, `end`, and `center` alignments with `alignOffset`.
   - In WhatsApp mobile header with RTL, `align="start"` correctly anchors to `triggerRect.left + alignOffset`.
2. **Viewport Clamping:**
   - Added horizontal clamping ensuring `clampedLeft` stays within `[8px, viewportWidth - menuRect.width - 8px]`.
   - Added vertical clamping and flip logic if the menu would overflow top/bottom.
   - Added `max-w-[calc(100vw-16px)]` so popup width never exceeds the screen.
3. **Consistency:**
   - Applied the identical fix to `dropdown-menu.tsx`, `select.tsx`, and `combobox.tsx`.
