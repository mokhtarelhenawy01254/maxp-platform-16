# Service Request Module

New module for managing creative service requests (music, design, video, etc.).

## Models
- `Service`: Predefined services catalog (name, description, icon, category, price)
- `ServiceOrder`: Customer requests (customerName, phone, description, referenceFiles, status)

## Statuses
NEW → IN_PROGRESS → COMPLETED / CANCELLED

## API
- `GET/POST/PUT/DELETE /api/v1/services` — service CRUD (authenticated)
- `GET/PUT /api/v1/service-orders` — order management (authenticated)
- `POST /api/v1/service-orders` — public order creation (no auth)

## Upload
- `POST /upload/service-file` — audio/image/video up to 100MB

## Frontend
- `/admin/services` — manage services
- `/admin/service-orders` — manage orders
- `/request-service` — public request form

## Marketplace
- `service-request-app` (99 EGP/month, 14-day trial)
