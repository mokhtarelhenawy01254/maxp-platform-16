# Booking Service Detail Modal

**Date:** 2026-07-06

## Change

Added `ServiceDetailModal` component to `BookingManagementPage.tsx` with a new "عرض" (view) button on each service card.

## What It Does

- Clicking "عرض" on a service opens a modal showing:
  - Service name, description, active status
  - List of branches offering the service, with per-branch package pricing
  - Creation date and service ID
- Replaced `EyeIcon` on the clone button with `TrashIcon` (was using wrong icon)

## Files

- `apps/frontend/src/pages/admin/BookingManagementPage.tsx` — new modal component and view button
