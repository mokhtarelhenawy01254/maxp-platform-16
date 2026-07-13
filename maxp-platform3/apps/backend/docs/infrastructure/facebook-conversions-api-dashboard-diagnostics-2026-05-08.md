# Facebook Conversions API Dashboard Diagnostics - 2026-05-08

## Scope

Worker B upgraded the frontend `ConversionApiDashboard` diagnostics surface. The integration pass then wired the missing backend CAPI diagnostic fields through to Meta.

## What Changed

- Removed hardcoded CAPI KPI values from the dashboard.
- Session KPIs now come from real send attempts:
  - successful frontend calls,
  - failed frontend calls,
  - success rate,
  - Meta `events_received` from the backend response.
- Recent event history now shows:
  - event name,
  - local diagnostic event ID,
  - pixel ID,
  - status,
  - Meta `events_received`,
  - `fbtrace_id`,
  - Meta response messages,
  - failure reason.
- The send form now exposes and sends supported browser/click identifiers:
  - `_fbp` as `userData.fbp`,
  - `_fbc` as `userData.fbc`.
- The dashboard now forwards:
  - `eventId` for browser/server deduplication,
  - `testEventCode` for Meta Events Manager test-mode validation.

## Backend Contract Observed

`POST /api/v1/facebook-ads/conversions` accepts:

- `pixelId`
- `eventName`
- `eventId`
- `eventTime`
- `testEventCode`
- `eventSourceUrl`
- `userData`
- `customData`
- `actionSource`

The controller forwards those fields into `FacebookAdsService.sendConversionEvent`. The service maps `eventId` to Meta's `event_id` inside the event object and maps `testEventCode` to the top-level `test_event_code` request field.

## Operational Notes

The dashboard displays every local send attempt with `events_received`, `fbtrace_id`, messages, and errors. A test event code still needs to be copied from Meta Events Manager by an operator when they want the event to appear in the Test Events tab.

## Verification

Focused frontend coverage was added for:

- CAPI payload construction,
- `_fbp` / `_fbc` inclusion,
- non-commerce event payload cleanup,
- Meta/backend response normalization,
- session KPI derivation.
- Backend controller forwarding for `eventId` and `testEventCode`.
- Service-level Meta payload mapping for `event_id` and `test_event_code`.
