# Auto-Tenant Company Relation Fix (2026-09-04)

## Context
When employees or authenticated company users created orders for new customers, Prisma's `Customer.create` failed with:
`Unknown argument companyId. Did you mean company?`

## Root Cause
In `services/sharedDatabase.js`, the multi-tenant AST isolation extension automatically injected `companyId: companyId` into any Prisma `create` or `upsert` call for models with a `companyId` field.
When creating customers via `safeCreateCustomer` or `createCustomerByPhone`, the payload already connects the company relation: `company: { connect: { id: companyId } }` and deletes scalar `companyId`.
Prisma Client's `CustomerCreateInput` rejects having both relation connect `company` and scalar foreign key `companyId` simultaneously.

## Fix
In `apps/backend/services/sharedDatabase.js`:
- In `operation === 'create'`: if `args.data.company` is present, delete `args.data.companyId`. Only inject `companyId` if not already connecting via relation or scalar.
- In `operation === 'upsert'`: apply the same check to `args.create`.
