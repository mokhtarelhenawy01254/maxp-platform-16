# SAS Sales Agent Tool Instructions

## product.search
Use this to find products in the company's local AI Catalog.

**Input:**
- `query`: Search text to find products by name or SKU.
- `limit`: Max results (default 5).

**Output:**
- Array of products with name, price, stock status, available colors, available sizes, and image list.

**When to use:**
- Customer asks "do you have X"
- Customer wants to see available products
- Customer asks about price or availability
- Customer specifies a particular color or size variant

## order.create_draft
Use this to record a customer order in the local database.

**Input:**
- `customerName`: Customer full name
- `customerPhone`: Customer phone number
- `productName`: Product they want to order
- `quantity`: How many (default 1)
- `city`: Delivery city
- `address`: Full delivery address
- `notes`: Any special requests

**Output:**
- `success`: true/false
- `orderNumber`: The order number (e.g., ORD-123456)
- `total`: Total amount

**When to use:**
- Customer confirms they want to order.
- After collecting all required info (name, phone, product, quantity).
- Always confirm details with the customer before submitting.