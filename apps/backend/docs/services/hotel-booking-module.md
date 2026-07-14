# Hotel Booking Module

## What Changed
- Added a complete hotel/accommodation booking module.
- A hotel can have multiple properties, each with room types, individual rooms, reservations, folio charges, and seasonal rates.

## Data Models
- `HotelProperty` — hotel building/branch (name, address, city, phone, check-in/out times, amenities).
- `HotelRoomType` — category (e.g. Single, Double, Suite) with base price and capacity.
- `HotelRoom` — individual room with status tracking.
- `HotelReservation` — booking with check-in/out dates, guest info, total amount.
- `HotelReservationRoom` — join table supporting multiple rooms per reservation.
- `HotelFolioItem` — extra charges during stay (restaurant, spa, tours, laundry, etc.).
- `HotelRoomRate` — seasonal/custom pricing by date range.

## Enums
- `HotelRoomStatus`: AVAILABLE, OCCUPIED, MAINTENANCE, CLEANING, RESERVED
- `HotelReservationStatus`: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
- `HotelFolioItemType`: RESTAURANT, SPA, TOUR, LAUNDRY, MINIBAR, PARKING, OTHER

## API Endpoints (`/api/v1/hotel`)
- Properties: GET/POST/PUT/DELETE
- Room types: GET/POST/PUT/DELETE
- Rooms: GET/POST/PUT/DELETE, PATCH status
- Reservations: GET/POST/PUT/PATCH status
- Folio: GET/POST/DELETE per reservation
- Rates: GET/POST/PUT/DELETE
- Availability: GET `/properties/:id/availability`

## Key Behaviors
- `POST /reservations` creates the reservation and assigns rooms transactionally.
- If `roomId` is omitted for a reservation line item, the backend auto-assigns the first available room of that type.
- Status transitions automatically update room status:
  - `CHECKED_IN` → assigned rooms become OCCUPIED
  - `CHECKED_OUT` or `CANCELLED` → assigned rooms become AVAILABLE
- Folio items are added to active reservations and automatically update `totalAmount`.
- Availability endpoint returns available room types with effective pricing (base price + overlapping seasonal rate if any).

## AI Agent
- New agent: `hotel-agent` (`apps/backend/agents/hotel-agent/`).
- Role: `HOTEL`.
- Tools: `hotel_info`, `hotel_check_availability`, `hotel_reserve`, `hotel_cancel_reservation`, `hotel_my_reservations`, `agent_handoff_to`, `knowledge_search`.
- Tool implementations in `apps/ai-service/src/tools/hotel_tools.py` and `apps/ai-service/src/tools/definitions/hotel.py`.
- `apps/ai-service/src/tools/role_tools.yaml` maps the `HOTEL` role to these tools.

## Marketplace
- Added `hotel-app` in `apps/backend/scripts/marketplaceSeed.js`.
- Price: 249 EGP/month, 14-day trial.
- Sidebar entry is gated by the `hotel-app` app slug.

## Migration
- SQL migration is ready at `apps/backend/prisma/migrations/add_hotel_module.sql`.
- **Important:** All camelCase Prisma field names must be quoted in raw SQL, e.g. `"companyId"`, `"propertyId"`, `"checkIn"`, `"checkOut"`.

## QA Results
- 2026-07-14: Backend end-to-end smoke test passed 13/13 scenarios (create property, room types, rooms, availability, reservation, confirm, check-in, folio, checkout, cancel, list, maintenance status).
- 2026-07-14: Frontend page renders, tabs switch, modals open after fixing a Rules-of-Hooks issue by extracting modals to top-level components.

## Files
- `apps/backend/prisma/schema/hotel.prisma`
- `apps/backend/controller/hotelController.js`
- `apps/backend/routes/hotelRoutes.js`
- `apps/backend/server.js`
- `apps/backend/scripts/marketplaceSeed.js`
- `apps/backend/agents/hotel-agent/*`
- `apps/ai-service/src/tools/hotel_tools.py`
- `apps/ai-service/src/tools/definitions/hotel.py`
- `apps/ai-service/src/tools/role_tools.yaml`
- `apps/frontend/src/pages/admin/HotelManagementPage.tsx`
- `apps/frontend/src/pages/admin/hotel/*.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/config/sidebar.ts`
- `apps/frontend/src/locales/ar.ts`
- `apps/frontend/src/locales/en.ts`

## Known Limitations / Next Phase
- No online guest check-in form yet.
- No OTA channel manager (Booking.com, Expedia).
- No payment/deposit integration specific to hotels.
