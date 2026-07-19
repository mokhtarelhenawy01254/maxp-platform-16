# Temporary Debug Verify Endpoint Removal

## Context

A temporary `/api/v1/temp-debug-verify` route was added during WhatsApp diagnostics.
It exposed WhatsApp session and company data and allowed session updates through a
public route entry.

## Change

The route registration was removed from `server.js`, and the matching public
route allowlist entries were removed from `globalSecurity.js`.

## Verification

Run backend syntax checks and confirm production no longer responds successfully
to `/api/v1/temp-debug-verify` after deployment.
