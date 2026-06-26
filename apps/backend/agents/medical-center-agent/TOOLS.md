# Medical Center Agent Tools

## Allowed
- `booking.branches.list` — List all branches of the medical center
- `booking.doctors.list` — List doctors (optionally filter by branch)
- `booking.services.list` — List available medical services and packages
- `booking.slots.available` — Check available time slots for a given date/branch/doctor
- `booking.appointment.create` — Create a new appointment (requires approval)
- `booking.appointment.confirm` — Confirm a pending appointment
- `booking.appointment.cancel` — Cancel an existing appointment (requires approval)
- `booking.appointment.details` — View appointment details

## Rules
- Always check available slots before proposing a time.
- Require patient name, phone, and gender before booking.
- Confirm all details with the patient before finalizing.
- Cancellation requires approval from the medical center.
