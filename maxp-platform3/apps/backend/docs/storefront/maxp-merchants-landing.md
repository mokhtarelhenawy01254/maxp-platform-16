# Max P Merchants Landing Page

## Date
2026-03-30

## Summary
Added a dedicated public marketing landing page for Egyptian merchants and brands at `/for-merchants`.

## Purpose
This page is intended to support paid and organic acquisition campaigns for Max P by presenting a clearer B2B value proposition than the generic homepage.

## Implemented Changes
- Added `frontend/src/pages/public/MaxPMerchantsLanding.tsx`
- Registered the page in `frontend/src/App.tsx`
- Marked `/for-merchants` as a public route so it bypasses auth-loading gating

## Messaging Focus
The page positions Max P as a practical operating system for Egyptian merchants who manage:
- customer conversations
- order follow-up
- daily store operations

Core promise:
- collect chats, orders, and follow-up in one place
- reduce operational confusion
- improve response speed and sales follow-up

## Current CTA Structure
- Primary CTA: `احجز ديمو`
- Secondary CTA: login / explore flow

## Notes
This page was intentionally implemented as a standalone route instead of replacing the root homepage so it can be tested safely in ads and campaign traffic without disrupting the existing public homepage.
