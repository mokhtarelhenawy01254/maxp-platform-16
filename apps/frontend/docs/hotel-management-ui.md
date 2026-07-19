# Hotel Management UI

## What Changed
- Added a new admin page at `/admin/hotel` for managing hotel properties, room types, rooms, reservations, folio items, and seasonal room rates.

## Files
- `apps/frontend/src/pages/admin/HotelManagementPage.tsx` — main 5-tab management page.
- `apps/frontend/src/pages/admin/hotel/shared.ts` — API helpers and TypeScript types.
- `apps/frontend/src/pages/admin/hotel/Modal.tsx` — shared modal wrapper.
- `apps/frontend/src/pages/admin/hotel/PropertyModal.tsx` — add/edit hotel property.
- `apps/frontend/src/pages/admin/hotel/RoomTypeModal.tsx` — add/edit room type.
- `apps/frontend/src/pages/admin/hotel/RoomModal.tsx` — add/edit individual room.
- `apps/frontend/src/pages/admin/hotel/ReservationModal.tsx` — create reservation with availability check and multi-room selection.
- `apps/frontend/src/pages/admin/hotel/FolioModal.tsx` — add extra service charge to a reservation.
- `apps/frontend/src/pages/admin/hotel/RateModal.tsx` — add seasonal/custom room rate.

## How It Works
1. Choose the hotel from the top select box.
2. Switch tabs to manage room types, rooms, reservations, or folio/rates.
3. Click the plus button in each tab to open the matching modal.
4. The reservation workflow supports: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT, plus CANCELLED.
5. Folio items can be added while a reservation is confirmed or checked in; they are listed under the reservation card.

## Layout
- The page uses full-width layout (`min-h-screen`) without a centered max-width container so it starts immediately after the sidebar and fills the available admin content area.
- RTL-first Arabic UI, dark-mode compatible via Tailwind `dark:` classes.

## Related Backend
- Backend routes under `/api/v1/hotel/` (`apps/backend/routes/hotelRoutes.js`).
- Models in `apps/backend/prisma/schema/hotel.prisma`.

## QA Notes
- 2026-07-14: Backend API smoke-tested end-to-end (13/13 passed).
- 2026-07-14: Browser smoke test confirmed page renders, tabs switch, and all modals open after fixing a Rules-of-Hooks issue by extracting modals to top-level components.
- 2026-07-15: Reservation modal UX improved — dates default to today/tomorrow, availability results are clickable and auto-fill the selected room type + effective nightly rate.
