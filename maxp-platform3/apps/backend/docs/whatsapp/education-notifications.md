# Education WhatsApp Notifications

## Endpoints
`POST /api/v1/education/notifications/test` — Send test notification
`GET /api/v1/education/notifications/funnel` — Funnel stats
`GET /api/v1/education/notifications/logs` — Recent notification log

## Events
- `enrollment_created` — parent & teacher notified
- `session_scheduled` — parent notified of new session time
- `session_confirmed` — parent notified that session happened + hours deducted
- `session_cancelled` — parent notified of cancellation
- `session_reminder` — TBD: reminder before session
- `low_hours` — TBD: enrollment remaining hours low
- `expiring_soon` — TBD: enrollment about to expire

## Templates
Arabic/English pairs per event, auto-detects customer/teacher phone.
