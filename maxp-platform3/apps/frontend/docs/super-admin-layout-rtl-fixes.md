# Super Admin Shell Layout & RTL Alignment Fixes

This document details the visual and structural layout fixes applied to the Super Admin Shell.

## 1. Sidebar-to-Content Gap Fixes
Previously, the Super Admin Layout constrained page content with a maximum width of `1400px` and automatically centered it via `margin: 0 auto`. 
On wide viewports, this created large empty margins between the sidebar and page content.
- **Fix**: Removed the max-width restriction (`maxWidth: 1400px`) and `margin: 0 auto` from `SuperAdminLayout.tsx`.
- **Result**: The main content wrapper now behaves identically to the merchant layout: it aligns directly next to the sidebar and utilizes 100% of the remaining horizontal space.

## 2. RTL Header Positioning
In right-to-left (RTL) mode (such as Arabic), the sidebar is placed on the right side of the viewport. The fixed header was previously pinned using `right: 0`, causing it to overlap with the sidebar and create an empty space on the left side of the screen.
- **Fix**: Updated `SuperAdminHeader.tsx` to dynamically query the current direction using `i18n.dir()`.
- **Result**:
  - In LTR: Header is positioned at `right: 0` with width `calc(100% - currentDrawerWidth)`.
  - In RTL: Header is positioned at `left: 0` with width `calc(100% - currentDrawerWidth)`.
  This perfectly aligns the header next to the sidebar on the correct side in both language directions.
