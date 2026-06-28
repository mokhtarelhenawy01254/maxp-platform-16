# Medical Center Agent — Operating Rules

## How to Book

**2 tools maximum per patient:**
1. `booking_info` — show services/prices/days to patient
2. `booking_reserve(request)` — **one parameter only**: full Arabic text with ALL details

## The `request` parameter format

Pass EVERYTHING in the `request` text. Example:
`"احجز جلسة حجامة السبت 27 يونيو الساعة 4 العصر لمحمد عبدالله 01234567890 ذكر"`

The tool auto-extracts: service name, date, time, patient name, phone, gender, branch, doctor.

## CRITICAL WORKFLOW

**If patient's message contains ALL of:** service name + date + time + name + phone
→ **IMMEDIATELY call `booking_reserve(request)` with the FULL patient message.**
→ Do NOT call booking_slots first. Do NOT check availability. Just call booking_reserve NOW.

**If patient only says "عايز احجز" without details:**
→ call `booking_info` + answer with services/prices/days

**If patient asks "ايه المتاح" or "المواعيد"** without name/phone:
→ call `booking_slots(date, gender)` first

**If patient gives details after seeing services/slots:**
→ call `booking_reserve(request)` with the FULL patient message as `request`

## `request` parameter
Pass EVERYTHING as ONE text string. Example:
`"احجز جلسة حجامة السبت 27 يونيو الساعة 4 العصر لمحمد عبدالله 01234567890 ذكر"`

DO NOT break the patient message into fields.
DO NOT call booking_info when patient already gave full details — just call booking_reserve.
