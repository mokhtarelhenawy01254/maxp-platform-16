# Sidebar Management System

**Date**: 2026-05-24 (Updated 2026-07-02 v3)
**Type**: Feature Implementation + Enhancement
**Scope**: Full-stack — Backend API + Frontend Settings UI + Dynamic Config Engine + Per-User Overlay

## Summary

A professional Sidebar Management System that gives company admins full control over sidebar menu visibility, ordering, role-based access, and app-driven auto-hide from a dedicated settings panel. Version 2 adds toggle switches, category grouping, animations, per-user settings overlay, and improved UX.

## Architecture

```
Settings Page          SidebarSettingsContext       config/sidebar.ts         Layout.tsx
(/settings/sidebar)         │                            │                      │
     │                      │                            │                      │
     ├─ Switch toggle       │                            │                      │
     ├─ category view       │                            │                      │
     ├─ bulk toggle         │                            │                      │
     └─ search/filter       │                            │                      │
     │                      ▼                            │                      │
     └──────►  company settings  ◄───────────────────────┤                      │
     │        (from API)                                 │                      │
     │        updateSettings()                           │                      │
     │        refreshSettings()                          │                      │
     │                      │                            │                      │
     │        userSettings  │                            │                      │
     │        (localStorage)│                            │                      │
     │                      ▼                            │                      │
     └──────► mergeSectionOverrides()                    │                      │
              (company ▸ user)                           │                      │
              └──────────► applySidebar                  │                      │
                           Overrides() ──────────────────┼──────► filtered     │
                           merges DB + user              │       Sections ─────┘
                           with static config            │       → Sidebar
                                                         │         LayoutFactory
```

## Files Changed / Created

| File | Type | Description |
|------|------|-------------|
| `backend/routes/settingsRoutes.js` | Modified | Added `GET/PUT /sidebar` + `GET/PUT /user-sidebar` endpoints |
| `frontend/src/contexts/SidebarSettingsContext.tsx` | New | React context provider + hook + per-user localStorage overlay |
| `frontend/src/pages/settings/SidebarSettings.tsx` | New | Admin settings page with Switch component, categories, animations |
| `frontend/src/config/sidebar.ts` | Modified | `mergeSectionOverrides()` two-layer merge engine (company + user) |
| `frontend/src/types/layout.ts` | Modified | Added `UserSidebarSettings` type |
| `frontend/src/components/layout/Layout.tsx` | Modified | Wraps in SidebarSettingsProvider, passes `userSettings` |
| `frontend/src/pages/settings/Settings.tsx` | Modified | Added sidebar settings tab |

## Behavior

### v2 Enhancements (2026-05-24)

1. **Toggle Switch**: Replaced eye/lock icons with proper iOS-style `Switch` component from `@base-ui/react` — animated ON/OFF toggle with active, unchecked, and disabled states.
2. **Category Grouping**: Sections grouped into 14 visual categories (رئيسية, تواصل, مبيعات, تحليلات, عملاء, تسويق, مشتريات, مخزون, موظفين, عمليات, إدارة, مالية, دعم, نظام) with color-coded badges and SVG icons.
3. **Category Bulk Toggle**: One Switch to enable/disable all items in a category.
4. **View Mode Toggle**: Switch between "Categories" (grouped) and "Flat" (traditional section-by-section) views.
5. **Framer Motion Animations**: `AnimatePresence` + `motion.div` for smooth section expand/collapse, role panel transitions, and chevron rotation.
6. **Per-User Settings Overlay**: Users can override company settings with their own preferences via localStorage (`UserSidebarSettings` interface). Two-layer merge: company → user.
7. **Improved Search**: Shows result count, empty state with "مسح البحث" action.
8. **Performance**: `React.memo` on `CategoryGroup`, `useMemo` for computed data, `useCallback` on all handlers.

### Core Behavior (v1)

1. **Visibility**: Admin toggles `visible` per section/item → hidden entries filtered out at render.
2. **Enable/Disable**: Toggle `enabled` → disabled items hidden (config preserved).
3. **Role-based access**: Each item restricted to specific roles (8 roles). Non-matching roles don't see the item.
4. **App auto-hide**: Static `requiredApps[]` preserved; inactive-app items stay hidden.
5. **Ordering**: Items/sections sorted by `order` field from DB.
6. **Persistence**: Stored in `Company.settings.sidebarSettings` JSON per company.
7. **Auto-save**: 800ms debounce after last edit with visual feedback.

## Backend API

```
# Company-level settings
GET  /api/v1/settings/sidebar      →  { success, data: { layout, settings } }
PUT  /api/v1/settings/sidebar      →  Body: { settings: { sections: {...} } }

# Per-user settings (legacy, kept for backwards compat)
GET  /api/v1/settings/user-sidebar →  { success, data: { enabled, sections } }
PUT  /api/v1/settings/user-sidebar →  Body: { settings: { enabled, sections } }

## v3 Enhancements (2026-07-02)

1. **Per-User Sidebar Layout**: Each user can now choose their preferred sidebar layout (classic, three-tier, horizontal, floating, minimal) from Settings → Sidebar Settings. This overrides the company-level `sidebarLayout` setting.
2. **User Settings JSON Field**: Added `User.settings` (TEXT/JSON) column to persist per-user preferences server-side. First stored preference: `sidebarLayout`.
3. **Sync Architecture**: User preferences are cached in localStorage for instant load and synced to the server in the background (`GET/PUT /user/settings`).

### Architecture (v3)

```
User selects layout in SidebarSettings.tsx
    │
    ├─► localStorage (instant cache)
    │
    └─► PUT /api/v1/user/settings  { settings: { sidebarLayout: "minimal" } }
            │
            └─► User.settings JSON column in DB
                    │
Layout.tsx reads:
    userLayout (from context/userSettings)
        → company.sidebarLayout
            → "three-tier" (default)
```

### New Backend API

```
# User-level settings (persisted in User.settings JSON)
GET  /api/v1/user/settings      →  { success, data: { sidebarLayout } }
PUT  /api/v1/user/settings      →  Body: { settings: { sidebarLayout: "minimal" } }
```

### Files Changed / Added (v3)

| File | Type | Description |
|------|------|-------------|
| `prisma/schema/core.prisma` | Modified | Added `settings String?` to User model |
| `prisma/schema.prisma` | Modified | Added `settings String?` to User model |
| `prisma/verify_schema/core.prisma` | Modified | Added `settings String?` to User model |
| `backend/routes/userSettingsRoutes.js` | New | `GET/PUT /api/v1/user/settings` — read/write User.settings JSON |
| `backend/server.js` | Modified | Wired `/api/v1/user/settings` routes |
| `frontend/src/types/layout.ts` | Modified | Added `sidebarLayout` to `UserSidebarSettings` |
| `frontend/src/contexts/SidebarSettingsContext.tsx` | Modified | Added `userLayout` state, `setUserLayout()` method, API sync |
| `frontend/src/components/layout/Layout.tsx` | Modified | Priority: userLayout → company.sidebarLayout → default |
| `frontend/src/pages/settings/SidebarSettings.tsx` | Modified | Added per-user layout picker UI with 5 options |
```
