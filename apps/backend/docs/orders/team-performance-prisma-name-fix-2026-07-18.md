# Team Performance Analytics — Prisma Field Fix

**Date:** 2026-07-18  
**File:** `apps/backend/controller/analyticsController.js`  
**Endpoint:** `GET /analytics/team-performance`

## Problem

The `getTeamPerformanceAnalytics` controller queried `prisma.user.findMany()` with `select: { name: true }`, but the `User` Prisma model does not have a `name` field. This caused a PrismaClientKnownRequestError and the endpoint returned empty team data.

## Fix

Replaced `name: true` with `firstName: true` and `lastName: true` in the Prisma select. The `userName` property now concatenates `firstName` and `lastName`, falling back to `email` if both are empty.

## Impact

- No schema changes required
- Only affects the `/analytics/team-performance` endpoint response
