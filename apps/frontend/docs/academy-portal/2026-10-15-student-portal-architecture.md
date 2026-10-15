# Frontend Documentation: Student Academy Portal & Course Enrollment Architecture

**Date:** 2026-10-15  
**Scope:** `apps/frontend/src/pages/academy-portal/` & `App.tsx`  
**Compliance:** Strict Change Isolation (Zero Blast-Radius) & Anti-AI-Slop

---

## 1. Route Architecture
All new routes are mounted outside `ProtectedRoute` directly in `App.tsx` using dedicated public paths:
- `/portal` & `/portal/catalog`: Public Academy Catalog.
- `/portal/course/:courseId`: High-converting course landing page.
- `/portal/course/:courseId/lesson/:lessonId`: Lesson viewer with video, script, and AI coach.
- `/portal/login`: Student login by phone number.
- `/portal/my-courses`: Student enrolled courses and progress.
- `/portal/certificate/:enrollmentId`: Certificate viewer.
- Direct aliases under `/academy/portal`, `/academy/course/:courseId`, `/academy/my-courses` ensure smooth cross-linking.

Existing merchant admin academy routes (`/academy/dashboard`, `/academy/courses`, `/academy/students`) inside `ProtectedRoute` remain 100% untouched and unaffected.

## 2. Design System & Anti-AI-Slop Standard
- Daylight surface aesthetic: pure white cards (`#FFFFFF`) on subtle slate background (`#F8FAFC`).
- Arabic typography with native font stack and `text-wrap: balance` on headings.
- Tabular numeric digits (`tabular-nums`) for prices (500 EGP) and durations.
- Mobile-first responsive single-surface chassis.
- Zero cartoon avatars, zero emoji spam, no marketing fluff.
- All pages enforce `<meta name="robots" content="noindex, nofollow" />` during MVP stage.
