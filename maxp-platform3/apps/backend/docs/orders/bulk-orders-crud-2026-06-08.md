# Bulk Orders — Full CRUD Module

**Date**: 2026-06-08

## Summary

New Bulk Orders tab under Orders section. Merchants can create, manage, import, and export bulk orders with full RBAC and audit logging.

## Models

### `BulkOrder` (table: `bulk_orders`)
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `companyId` | UUID | FK → `companies` |
| `name` | TEXT | Required |
| `description` | TEXT | Optional |
| `status` | ENUM | `DRAFT`, `PENDING`, `PROCESSING`, `COMPLETED`, `CANCELLED` |
| `customerData` | JSON | Stored as JSON string |
| `productData` | JSON | Stored as JSON string |
| `fileAttachments` | JSON | Stored as JSON string |
| `createdById` | UUID | FK → `users` |
| `createdAt` | TIMESTAMP | Auto |
| `updatedAt` | TIMESTAMP | Auto |

### `BulkOrderItem` (table: `bulk_order_items`)
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `bulkOrderId` | UUID | FK → `bulk_orders` |
| `productSku` | VARCHAR(100) | Optional |
| `productName` | VARCHAR(255) | Required |
| `quantity` | INTEGER | Default 1 |
| `unitPrice` | DECIMAL(12,2) | Default 0 |
| `totalPrice` | DECIMAL(12,2) | Default 0 |
| `notes` | TEXT | Optional |
| `rowIndex` | INTEGER | For ordering |

## API Endpoints

All under `/api/v1/bulk-orders`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | bulkOrders.view | List with pagination, search, status filter |
| GET | `/:id` | bulkOrders.view | Get single order with items |
| POST | `/` | bulkOrders.create | Create new order |
| PUT | `/:id` | bulkOrders.edit | Update order |
| DELETE | `/:id` | bulkOrders.delete | Delete order |
| POST | `/:id/duplicate` | bulkOrders.create | Duplicate order |
| POST | `/:id/execute` | bulkOrders.edit | Execute (status → PROCESSING) |
| POST | `/import-preview` | bulkOrders.create | Preview Excel/CSV import |
| POST | `/import` | bulkOrders.create | Import Excel/CSV |
| GET | `/:id/export/excel` | bulkOrders.export | Export as Excel |
| GET | `/:id/export/json` | bulkOrders.export | Export as JSON |

## RBAC Permissions

- `bulkOrders.view` — View list and details
- `bulkOrders.create` — Create, duplicate, import
- `bulkOrders.edit` — Edit, execute
- `bulkOrders.delete` — Delete single or bulk
- `bulkOrders.export` — Export Excel/JSON

## Frontend Routes

- `/orders/bulk` — Lazy-loaded `BulkOrders` page with table, search, filters
- Modal for create/edit (`BulkOrderModal`)
- Detail view page (`BulkOrderView`)

## Sidebar

Under "Orders" section, labeled `bulkOrders` (i18n key), `QueueListIcon`.

## Audit Logging

Every action (create, update, delete, duplicate, execute, import, export) is logged with:
- Actor ID
- Action type
- Entity type (`bulk_order`)
- Entity ID
- Metadata (changes summary)
