# Teacher Portal

## Overview
Separate login portal for teachers with dedicated dashboard and pages.

## API Endpoints

### Auth
- `POST /api/v1/education/teacher-portal/login` - Teacher login (email/phone + password)
- `GET /api/v1/education/teacher-portal/me` - Get teacher profile
- `PUT /api/v1/education/teacher-portal/me/password` - Change password

### Teacher-specific
- `GET /api/v1/education/teacher-portal/dashboard` - Dashboard stats
- `GET /api/v1/education/teacher-portal/sessions` - Teacher's sessions
- `GET /api/v1/education/teacher-portal/payments` - Teacher's payments
- `GET /api/v1/education/teacher-portal/availability` - Get availability
- `PUT /api/v1/education/teacher-portal/availability` - Update availability
- `GET /api/v1/education/teacher-portal/schedule` - Weekly schedule

## Frontend Routes
- `/teacher/login` - Teacher login page (public)
- `/teacher/dashboard` - Dashboard with stats
- `/teacher/schedule` - Session schedule
- `/teacher/payments` - Payment history
- `/teacher/availability` - Working hours editor

## Auth Flow
- Teachers authenticate via JWT (24h expiry)
- Token stored in `localStorage('teacherToken')`
- Middleware: `verifyTeacherToken.authenticateTeacherToken`
- Separate from admin auth; uses `EducationTeacher` table directly

## Admin Integration
- Password field in TeacherModal for setting/resetting teacher credentials
- Password hashed with bcryptjs (salt rounds: 10)
