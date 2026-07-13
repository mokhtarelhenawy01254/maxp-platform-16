# Orders Page Workspace Navigation Button - 2026-05-24

## Summary

Added a prominent navigation button in the orders page header that links to the Agent Workspace (`/orders/workspace`), placed next to the existing "All Orders" filter button.

## What changed

- Added `useNavigate` hook and `BriefcaseIcon` import to `frontend/src/pages/orders/Orders.tsx`
- Added a gradient-styled button (`from-blue-600 to-indigo-600`) with `BriefcaseIcon` and "مساحة العمل" label
- The button sits between the "All Orders" filter and the "Trash" filter in the page header
- Responsive text: shows "مساحة العمل" on `sm:` screens and above, "العمل" on smaller screens
- Includes hover effects (`scale-[1.02]`, deeper gradient, larger shadow) and active press (`scale-[0.98]`)
- Full dark mode support matching the existing button system

## Design decisions

- Used a gradient style (not a filter toggle style) to visually distinguish navigation from filtering
- Matched existing button sizing (`min-w-[126px]`, `rounded-[16px]`, `px-4 py-2.5`, `text-sm font-semibold`)
- The route `/orders/workspace` already existed; this only adds the UI entry point
