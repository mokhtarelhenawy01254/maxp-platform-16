# Custom Domain DNS Layout Fix & Multi-Domain DNS Verification

**Date:** 2026-09-02
**Author:** MaxP Platform Team

## Overview
Fixed the Custom Domain DNS settings interface and backend DNS verification:
1. **Frontend (CustomDomainPage.tsx):**
   - Fixed character-by-character vertical text collapse bug on the CNAME value caused by break-all + min-w-0 without w-full inside flex column containers.
   - Replaced hardcoded mokhtarelhenawy.online with dynamic cnameTarget that automatically points to the active domain (e.g. maxp.online).
   - Improved responsive layout of domain editing inputs and buttons on mobile devices.
   - Cleaned up Arabic translation bullet duplicates.

2. **Backend (dnsUtils.js):**
   - Added support for matching both maxp.online and mokhtarelhenawy.online in addition to expectedTarget when verifying CNAME DNS records for custom domains.
