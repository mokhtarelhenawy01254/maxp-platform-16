# HR Assets Cloning Feature Documentation

## Overview
The Asset Cloning feature allows HR managers to quickly duplicate existing assets. This is particularly useful for adding multiple similar items (e.g., a batch of identical laptops) without manual data entry for each.

## Implemented Functionality

### 1. Backend Implementation
- **Controller**: `assetController.js` includes the `cloneAsset` function.
    - Deep copies core fields: `name`, `categoryId`, `price`, `description`, `purchaseDate`, `purchaseValue`, `warrantyMonths`, `warrantyProvider`.
    - Automatically appends `(نسخة)` to the name.
    - Generates a unique `code` by appending a random suffix to the original.
    - Copies depreciation fields: `depreciationMethod`, `depreciationRate`, `salvageValue`.
    - Resets `assignedTo` and `assignedDate` for the new copy.
- **Routes**: `assetRoutes.js` registered `POST /hr/assets/:id/clone`.
- **Security**: Endpoint protected by `authenticateToken` middleware.

### 2. Frontend Implementation
- **View**: `AssetList.tsx`
    - Added "Clone" button to the action column using `DocumentDuplicateIcon`.
    - Interactive success/error notifications via `react-hot-toast`.
    - **Optimization**: Refactored `fetchAssets` to use a `Map` for de-duplication, resolving React "Duplicate Key" warnings.
    - **Reliability**: Integrated full list replacement on refresh after cloning to ensure data consistency.

## Bug Fixes
- **Route Priorities**: Fixed `server.js` to mount `/api/v1/hr/assets` before `/api/v1/hr` to prevent 404/Interception errors.
- **Reference Errors**: Resolved `ReferenceError` in `updateAsset` by ensuring proper body destructuring.
- **Key Warnings**: Eliminated console errors by implementing strict ID-based Map deduplication in the frontend.

## Usage
1. Navigate to **HR > Assets List**.
2. Locate the asset you wish to duplicate.
3. Click the **Clone Icon** (Duplicate) in the actions column.
4. The system will create a new record and refresh the list automatically.
