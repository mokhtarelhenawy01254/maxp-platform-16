# AI Sandbox Chat & Central Models Fix (2026-09-15)

## Problem
On `/admin/ai-hub?tab=sandbox`, users were unable to send messages. The chat input was disabled and displayed:
- Placeholder: `اختر موديل مركزي لبدء المحادثة` (Select a central model to start chat)
- Error badge: `اضبط مفتاح API من الشريط العلوي` (Configure API key from top bar)
The top header bar also had no model selector visible for non-superadmin users.

## Root Cause
1. **Auto-Tenant Isolation on `AiKey` Table**:
   - In `apps/backend/services/sharedDatabase.js`, the dynamic tenant isolation extension intercepted all models with a `companyId` scalar field (`MODELS_WITH_COMPANY_ID`).
   - `AiKey` has an optional `companyId` field for tenant-specific BYOK keys, but platform central keys have `companyId: null` and `keyType: 'CENTRAL'`.
   - When a company tenant user called `/api/v1/ai-sandbox/models` or `/api/v1/ai-sandbox/chat`, the query was automatically rewritten to `WHERE companyId = '<current_company_id>' AND keyType = 'CENTRAL'`, which matched zero records because all central keys have `companyId: null`.
   - Consequently, `/api/v1/ai-sandbox/models` returned `providers: [], centralKeys: [], count: 0`.

2. **Frontend UI Restrictions**:
   - `apps/frontend/src/pages/admin/ai-agent-sandbox/components/HeaderBar.tsx` gated the model selector behind `{isSuper && (...)`. Regular company admins had no way to view or switch active models.
   - `apps/frontend/src/pages/admin/ai-agent-sandbox/hooks/useAgentSandbox.ts` did not provide fallback to preferred/selectable models when an agent's defaultModel didn't match available models.

## Solution
1. **Backend Database Isolation**:
   - Added `'AiKey'` and `'AiModelConfig'` to `GLOBAL_MODELS` in `apps/backend/services/sharedDatabase.js` to ensure platform central keys are not filtered out by tenant context.
   - Wrapped `listTenantAIKeys`, `listModels`, `resolveRequestedSandboxModelSelection`, and `resolveSandboxModelSelection` in `tenantContext.bypass()` in `apps/backend/controller/aiSandboxController.js` as defensive isolation bypass.
2. **Frontend Sandbox UI**:
   - Updated `HeaderBar.tsx` to display the model dropdown whenever `models.length > 0`, allowing all users to see and select models.
   - Enhanced `useAgentSandbox.ts` with fallback to preferred or first selectable model when selecting an agent.
