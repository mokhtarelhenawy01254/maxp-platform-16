# Medical Center Agent Tools

## Read Tools (listing)
- `booking_branches_list` — List all branches. No params needed.
- `booking_doctors_list` — List doctors. Params: `branch_id` (optional filter).
- `booking_services_list` — List services + pricing. Params: `branch_id` (optional filter).
- `booking_available_slots` — Check free slots. Params: `branch_id`, `date` (YYYY-MM-DD). `doctor_id` and `service_id` optional.
- `booking_appointment_details` — View appointment. Params: `appointment_id`.

## Draft Tools (write — multi-turn booking flow)
- `booking_draft_start` — Start new booking. Returns `draft_id`. No params.
- `booking_draft_set_field` — Set ONE field in draft. Params: `draft_id`, `field` (name), `value`. Valid fields: branchId, doctorId, serviceId, customerName, customerPhone, customerGender (MALE/FEMALE), appointmentDate (YYYY-MM-DD), startTime (HH:mm), notes.
- `booking_draft_get` — View draft state. Params: `draft_id`.
- `booking_draft_finalize` — Create appointment from draft. Params: `draft_id`. Requires: customerName, customerPhone, appointmentDate, startTime filled.

## Legacy Tools (fallback only)
- `booking_appointment_create` — One-shot booking (if draft tools fail). Put ALL patient info in `patient_info` field.
- `booking_appointment_confirm` — Confirm pending appointment. Params: `appointment_id`.
- `booking_appointment_cancel` — Cancel appointment (requires approval). Params: `appointment_id`, `reason`.

## Handoff
- `agent_handoff_to` — Escalate to human support.

## CRITICAL: Multi-Turn Booking Flow
Call ONE tool per response. After each `booking_draft_set_field`, tell patient what's saved and ask for the next piece of info. Fields: branchId → serviceId → doctorId (optional) → appointmentDate → startTime → customerName → customerPhone. Then finalize.
