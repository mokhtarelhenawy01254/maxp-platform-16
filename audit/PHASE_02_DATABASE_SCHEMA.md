# PHASE 2 — DATABASE / SCHEMA AUDIT

Scope: `apps/backend/prisma/schema/` (60 files, 517 models, 179 enums, ~1,244 @@index).
Datasource: PostgreSQL (`schema/main.prisma:1-8`), Prisma 6.12.0, client → `generated/postgresql_v2`.
Migration drift risk: `package.json prestart` runs `prisma db push --accept-data-loss`; 82 migration folders exist [HC — drift likely].

## 2.1 CRITICAL findings

| # | Sev | Class | Evidence | Problem | Impact |
|---|---|---|---|---|---|
| D1 | CRITICAL | CONFIRMED | misc.prisma:244-246; products.prisma:466-468 | `WalletTransaction.amount/balanceBefore/balanceAfter Float`, `CustomerWallet.balance/totalEarned/totalSpent Float` (mutable balance) | Customer money in IEEE-754 → rounding drift + lost updates on concurrent wallet ops |
| D2 | CRITICAL | CONFIRMED | orders.prisma:484 | `Payment.amount Float` | Payment amounts in float |
| D3 | CRITICAL | CONFIRMED | orders.prisma:233 (+ products.prisma:419,373) | `OrderItem.product onDelete: Cascade` while Product has `deletedAt` soft-delete | Deleting a product destroys historical order line items incl. snapshots — order history corruption |
| D4 | CRITICAL | CONFIRMED | core.prisma:463; products.prisma:45; orders.prisma:404 | Company→User Cascade; Company→Customer→Order→(items/history/shipments/invoices/returns) all Cascade | Tenant delete erases operator accounts and full sales history |
| D5 | HIGH | CONFIRMED | returns.prisma:52 Restrict; products.prisma:474 CustomerWallet Restrict vs surrounding Cascades | Mixed Cascade/Restrict under same root | Company delete fails mid-way → nondeterministic partial state |

## 2.2 Integrity / constraints

| Sev | Class | Evidence | Problem |
|---|---|---|---|
| HIGH | CONFIRMED | orders.prisma:213-240 | OrderItem has no `@@unique([orderId, productId, variantId])` → duplicate identical lines inflate totals silently |
| HIGH | CONFIRMED | messaging.prisma:3-5,30-37 | No `@@unique([companyId, customerId, channel])` on Conversation → duplicate conversations per customer/channel |
| HIGH | CONFIRMED | returns.prisma:33 | `ReturnRequest.orderItemId String?` — NO @relation → orphan FK, unenforceable link |
| HIGH | CONFIRMED | products.prisma:322 | SKU unique only per `[productId, sku]` → duplicate SKUs across products in same company break barcode flows |
| HIGH | CONFIRMED | hr.prisma:174 | Attendance `@@unique([userId,date])` keyed on User while nullable `employeeRelId` unconstrained → dual employee identity |
| HIGH | CONFIRMED | hr.prisma:498 | ShiftAssignment unique includes shiftId → overlapping shifts per day allowed |
| MED | CONFIRMED | hr.prisma:934,1024,1189 | ManualDeduction/RewardRecord/LatenessDeduction.payrollId bare strings, no FK |
| MED | CONFIRMED | orders.prisma:305-310; products.prisma:644-645,738; orders.prisma:443-444 | confirmedBy/assignedTo/MerchantOrder.warehouseId/Shipment.settledBy/deposit verifiedBy — indexed but no @relation |
| MED | CONFIRMED | products.prisma:723 vs orders.prisma:373 | Two fields named `merchantOrderId`: Shipment's is an internal FK, Order's is external ID @unique — opposite semantics |
| MED | CONFIRMED | core.prisma:489-498 | UserCompany dual role systems: legacy `role` enum AND `roleId`→roleRef; precedence app-defined |
| MED | CONFIRMED | billing.prisda:3 | PlatformSubscription.companyId @unique → no subscription history (plan changes overwrite single row) |
| MED | CONFIRMED | settings.prisma:177,651,163,735 | HomepageTemplate/SystemPrompt/GlobalAiConfig/ImageStudioSettings lack unique-singleton constraints → duplicate "active" configs possible |

## 2.3 Money type audit

Correct Decimal elsewhere (Order totals orders.prisma:315-319, HR payroll hr.prisma:63,286-314). Broken as listed in D1/D2 plus:
- Company.platformCommissionRate Float (core.prisma:41), Merchant.commissionRate Float (products.prisma:694)
- Legacy `Invoice`/`InvoiceItem` all-Float models marked UNUSED (orders.prisma:168-197) — dead code candidate.

## 2.4 Status vocabulary chaos (CONFIRMED)

- Flagship: `Order.status String @default("pending")` **lowercase** (orders.prisma:117) while `OrdersStatus` enum exists unused (enums.prisma:955); plus parallel `customStatusCode`+`mapsToSystem` (orders.prisma:275,303) = three-layer status system.
- ≥10 incompatible free-text vocabularies: "pending"(lowercase ×2), "PENDING" (×5+), enums PENDING ×4, "ACTIVE" ×3, "draft"/"SUCCESS"/"SENT".
- Enums defined but UNUSED by their own models: ConversationStatus, ConversationsChannel, MessageType, WhatsAppMessagesMessageType, AttendanceStatus/PayrollStatus/LeaveStatus legacy variants.
- Split-brain example: BulkOrder uses enum (bulk_orders.prisma:6), child BulkOrderItem free text (:51).

## 2.5 Duplication of concepts (multiple implementations)

| Concept | Implementations |
|---|---|
| Messages | `Message` (messaging:93) vs `WhatsAppMessage` (messaging:222) — no cross-reference; AiInteraction vs LearningData vs ConversationMemory (legacy, marked UNUSED) hold the same userMsg→aiResponse pair |
| Tasks | Task* stack (~15 models, tasks.prisma) vs DevTask* stack (~15 models) vs AiAgentTask (ai_analytics:594) vs Goal(hr:546) vs DevGoal(tasks:758) |
| Lateness aggregates | LateWarning vs LatenessBalance vs LatenessMonthlySummary keyed on different identities (hr.prisma:853/893/1206) |
| Invoices | Legacy Invoice/InvoiceItem (UNUSED) vs OrderInvoice (orders.prisma:681+) |

## 2.6 Timestamps / lifecycle

- No soft delete except Product.deletedAt — hard deletes cascade destructively (see D3/D4).
- CustomerLoyaltyRecord.lastActivity `@default(now())` instead of `@updatedAt` (products.prisma:522).
- OrderStatusHistory missing `@@map` → quoted camelCase table `"OrderStatusHistory"` (orders.prisma:573-588).

## 2.7 Unbounded growth tables (no retention design)

AiInteraction, LearningData, SearchAnalytic, AiFailureLog, AiProviderLog, AiTrace(+Step), AiAgentRun (ai_analytics.prisma) — contrast: AiRuntimeLedger HAS expiresAt+index (proves pattern known but unapplied). Also WhatsAppEventLog, ModeratorActivityLog, StoreVisit, RagPerformance, ResponseEffectiveness.

## 2.8 JSON-as-String / relational-as-JSON

~31 native Json + ~25 String-typed JSON columns. Worst: InboxSettings (9 Text config blobs, whatsapp_inbox:238-245), AiSetting (ai_analytics:108-151), HRSettings taxBrackets/delayPenaltyTiers (hr:734-795), Payroll allowances/deductions as String beside Decimal totals (hr:289-314), DevSystemSettings entire config row as Strings (tasks:301-315). Reverse smell: `Order.metadata`, `Product.images/tags`, `OrderStatusConfig.allowedNextStatuses` typed `String?` not Json.

## 2.9 Missing indexes (hot paths)

Confirmed present: Order.customerId, [companyId,status,createdAt], Message.conversationId, Conversation.companyId composites.
Missing (HIGH impact): `Order.paymentStatus[/companyId]` (COD dashboards full-scan), `Shipment.trackingNumber`, `Customer.phone`, `Customer.email` (portal login scan), `Order.followUpDate`, `ReturnRequest[companyId,status]`, `WalletTransaction[walletId,createdAt]`.
Structural: **221 models carry companyId with zero @@index** (Phase 1 finding) — biggest tenant-scan risk at scale.

## 2.10 Nullable business columns

ProductVariant.price/comparePrice/cost all nullable with silent parent fallback (products.prisma:307-309); ReturnRequest.refundAmount/settlementAmount nullable; Order.customerName/customerPhone snapshots nullable though customerId required (orders.prisma:324-326).
