# Service Request Module

New module for managing creative service requests (music, design, video, etc.).

## Models
- `Service`: Predefined services catalog (name, description, icon, category, price)
- `ServiceOrder`: Customer requests (customerName, phone, description, referenceFiles, status)

## Statuses
NEW → IN_PROGRESS → COMPLETED / CANCELLED

## API
- `GET/POST/PUT/DELETE /api/v1/services` — service CRUD (authenticated)
- `GET/PUT/DELETE /api/v1/service-orders` — order management (authenticated)
- `GET /api/v1/service-orders/:id` — order details (authenticated)
- `POST /api/v1/service-orders` — public & admin order creation
- `PUT /api/v1/service-orders/:id/status` — update order status

## Upload
- `POST /upload/service-file` — audio/image/video up to 100MB
- `MediaUploadZone`: audio player preview, video preview, image lightbox, file tags

## Frontend
- `/admin/services` — manage services
- `/admin/service-orders` — manage orders (stats KPIs, search, status tabs, create order modal)
- `/admin/service-orders/:id` — dedicated order details page (audio/video player, notes, assignment, WhatsApp action)
- `/request-service` — public request form with rich media uploader

## Marketplace
- `service-request-app` (99 EGP/month, 14-day trial)
