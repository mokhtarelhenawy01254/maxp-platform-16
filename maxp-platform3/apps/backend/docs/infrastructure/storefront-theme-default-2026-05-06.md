# Storefront Theme Default

## Scope

Super-admins can mark one storefront theme catalog item as the default for newly created storefront settings.

## Behavior

- The default marker is stored in `marketplace_apps.features.isDefaultStorefrontTheme`.
- Setting a default clears the marker from every other storefront theme catalog row.
- The selected default is forced to `isActive: true` and `isPublic: true`.
- The current default cannot be hidden, disabled, or archived through the catalog update endpoint.
- New storefront settings are created with the selected default theme id in `designTokens.themeId`.
- If the catalog default cannot be resolved, the system falls back to `modern-minimal`.

## Admin API

- `GET /super-admin/storefront-theme-catalog` returns `isDefaultTheme` on each catalog item.
- `POST /super-admin/storefront-theme-catalog/:themeId/default` marks a theme as the default.
- `PUT /super-admin/storefront-theme-catalog/:themeId` rejects disabling the current default theme.

## Public Runtime

Public storefront settings also use the catalog default as their fallback when a company has no persisted storefront settings yet.
