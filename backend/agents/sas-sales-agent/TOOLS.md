# SAS Sales Agent Tool Instructions

## googlesheets.searchProducts
Use this to find products in the company catalog.

**Input:**
- `sheetUrl`: The Google Sheets URL containing products
- `searchQuery`: What to search for (product name or keyword)
- `limit`: Max results (default 10)

**Output:**
- Array of products with name, price, stock, description

**When to use:**
- Customer asks "do you have X"
- Customer wants to see available products
- Customer asks about price or availability

## googlesheets.submitOrder
Use this to record a customer order in Google Sheets.

**Input:**
- `appsScriptUrl`: The Google Apps Script web app URL
- `customerName`: Customer full name
- `customerPhone`: Customer phone number
- `productName`: Product they want to order
- `quantity`: How many (default 1)
- `city`: Delivery city
- `address`: Full delivery address
- `price`: Unit price (from search results)
- `notes`: Any special requests

**Output:**
- `success`: true/false
- `orderNumber`: The order number (e.g., ORD-123456)
- `total`: Total amount

**When to use:**
- Customer confirms they want to order
- After collecting all required info (name, phone, product, quantity)
- Always confirm details with customer before submitting

## googlesheets.readProducts
Debug/admin tool to see all products in the catalog.

**Input:**
- `sheetUrl`: The Google Sheets URL

**Output:**
- All products from the sheet

**When to use:**
- Admin/debugging purposes only
- Not for customer-facing responses