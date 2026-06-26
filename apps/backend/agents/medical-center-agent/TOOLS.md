# Medical Center Agent Tools

## Allowed
- `booking_branches_list` — List all branches. No params needed.
- `booking_doctors_list` — List doctors. Params: `branch_id` (optional filter).
- `booking_services_list` — List services + pricing. Params: `branch_id` (optional filter).
- `booking_available_slots` — Check free slots. REQUIRED params: `branch_id`, `date` (YYYY-MM-DD). Optional: `doctor_id`, `service_id`.
- `booking_appointment_create` — Create appointment. Put ALL patient info in `patient_info` like: `"محمد عبدالله, 01234567890, ذكر"`. Other fields (branch_id, doctor_id, service_id, appointment_date, start_time) are optional and will be auto-filled.
- `booking_appointment_confirm` — Confirm pending appointment. Params: `appointment_id`.
- `booking_appointment_cancel` — Cancel appointment (requires approval). Params: `appointment_id`, `reason` (optional).
- `booking_appointment_details` — View appointment. Params: `appointment_id`.

## Rules
- Start every booking flow by calling `booking_branches_list` first.
- Then call `booking_services_list` and `booking_doctors_list`.
- Do NOT stop after each tool — batch calls where possible.
- When patient provides date/time info, immediately call `booking_available_slots(branch_id, date)` — do NOT ask for date again.
- After patient confirms, call `booking_appointment_create` with ALL 8 params at once in the SAME response — do not wait for another turn.
- Pass the EXACT field names listed above — they are case-sensitive.
- If patient's first message contains name, phone, gender, service, date, time → use them all directly. Do NOT ask to repeat them.
- Only ask ONCE for all missing info, not one question per turn.
- Cancellation requires approval from the medical center.
