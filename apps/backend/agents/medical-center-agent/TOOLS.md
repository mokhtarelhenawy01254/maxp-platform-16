# Medical Center Agent Tools

## Allowed
- `booking_branches_list` — List all branches. No params needed.
- `booking_doctors_list` — List doctors. Params: `branch_id` (optional filter).
- `booking_services_list` — List services + pricing. Params: `branch_id` (optional filter).
- `booking_available_slots` — Check free slots. REQUIRED params: `branch_id`, `date` (YYYY-MM-DD). Optional: `doctor_id`, `service_id`.
- `booking_appointment_create` — Create appointment (requires approval). REQUIRED params: `branch_id`, `doctor_id`, `service_id`, `customer_name`, `customer_phone`, `customer_gender` (MALE/FEMALE), `appointment_date` (YYYY-MM-DD), `start_time` (HH:mm, 24h).
- `booking_appointment_confirm` — Confirm pending appointment. Params: `appointment_id`.
- `booking_appointment_cancel` — Cancel appointment (requires approval). Params: `appointment_id`, `reason` (optional).
- `booking_appointment_details` — View appointment. Params: `appointment_id`.

## Rules
- Start every booking flow by calling `booking_branches_list` first.
- Then call `booking_services_list` to show available services and packages.
- STOP after each tool call — show the result to the patient before proceeding.
- Call `booking_available_slots` with EXACT date (YYYY-MM-DD) and branch_id to check free slots before suggesting a time.
- After patient confirms, call `booking_appointment_create` with ALL required params at once.
- Pass the EXACT field names listed above — they are case-sensitive.
- Require patient name, phone, and gender before booking.
- Confirm all details with the patient before finalizing.
- Cancellation requires approval from the medical center.
