# Translation Synchronization (AR & EN) - 2026-07-20

## Overview
Added missing translation keys to the English frontend locale files (`en/sections/`) to fully synchronize with the Arabic locale files (`ar/sections/`), addressing consistency gaps reported by the `i18n:check` script.

## Changes Details

### Sidebar Section (`sidebar.json`)
- Aligned all key ordering and items matching the Arabic sidebar file.
- Added English translations for wholesale and cancellation settings keys:
  - `cancellationSettings`: Cancellation Settings
  - `storefrontStudioRail`: Studio
  - `storeManagementRail`: Store
  - `wholesale`: Wholesale
  - `wholesaleRail`: Wholesale
  - `wholesaleCustomers`: Wholesale Customers
  - `priceLists`: Price Lists
  - `customerStatements`: Customer Statements
  - `debtTracking`: Debt Tracking

### Common Section (`common.json`)
- Added missing translations:
  - `saveChanges`: Save Changes
  - `noData`: No data

### Products Section (`products.json`)
- Added missing translations:
  - `editTitle`: Edit Product
  - `save`: Save Product
  - `slugHelp`: Unique URL identifier for the product (Slug)
  - `tags`: Tags
  - `activeStatus`: Product Status (Active/Draft)
  - `placeholders.productNamePlaceholder`: Enter product name here...
  - `placeholders.descriptionPlaceholder`: Write a detailed product description including features and benefits...
  - `placeholders.selectCategory`: Select a product category...
  - `placeholders.tagsPlaceholder`: Add tag and press Enter...
  - `placeholders.searchProducts`: Search products...
  - `tabs.whatsapp`: WhatsApp Notification
  - `tabs.seo`: SEO Optimization
  - `messages.productErrorNetwork`: Failed to connect to the server to update product
  - `messages.categoriesLoadError`: Failed to load categories
  - `messages.categoriesLoadErrorNetwork`: Failed to connect to load categories

### Orders Section (`orders.json`)
- Added the full `invoice` translation object containing invoice labels, statuses, and action texts.

## Compilation and Validation
- Ran `npm run i18n:merge` to update both `ar/translation.json` and `en/translation.json`.
- Ran `npm run i18n:check` to verify that all translation files are perfectly synchronized.
