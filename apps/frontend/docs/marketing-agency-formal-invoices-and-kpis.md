# Marketing Agency Pro Engine - Formal Invoices, Marketing KPIs & Dedicated Routes

## Overview
This document covers the agency billing and reporting enhancements implemented for marketing agencies in MaxP platform:
1. **Marketing Agency KPIs**:
   - ROAS (Return on Ad Spend: Sales / Ad Spend)
   - CPA / CPO (Cost per Acquisition / Cost per Order: Ad Spend / Orders)
   - AOV (Average Order Value: Sales / Orders)
   - Badges and high-contrast pills rendered across Client Cards and Invoice Statements.

2. **Formal Printable Invoice Modal (FormalInvoiceModal)**:
   - Letterhead with Agency Name and branding.
   - Unique Invoice numbering (#INV-YYYYMM-XXXX).
   - Payment status badge (PAID vs PAYMENT DUE).
   - Campaign performance snapshot table (Ad Spend, Sales, Orders, ROAS, CPA).
   - Itemized fee breakdown table (Core agency fee with explanation + Add-on extra services).
   - Dedicated print styles (@media print) for clean paper printing or saving to PDF.
   - One-click WhatsApp sharing with formatted Arabic text statement.

3. **Sidebar & Direct Routing**:
   - Direct route /agency/:tab in App.tsx.
   - Sidebar item for Invoices & Profit pointing to /agency?tab=invoices.
   - Clean 2026 microcopy across agency navigation items.
