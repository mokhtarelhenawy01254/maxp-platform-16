# AI Self-Review and Model Control Fixes

**Date**: 2026-07-12

## Summary of Fixes

### 1. Backend AI Service: SQL and Model Mismatch Fixes
- **File**: `apps/ai-service/src/api/admin/self_review.py`
  - Corrected SQL querying inside `set_review_model` to resolve agent database records using the primary key `Agent.id` instead of the non-existent `Agent.agent_id` property, preventing SQL crashes.
- **File**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
  - Modified property resolver code to fallback gracefully between template slugs and local agent database primary keys using `getattr` fallback logic.
  - Replaced strict `json.loads` parsing with a resilient JSON object parser `_try_parse_json_object` to support responses where the LLM wraps JSON inside Markdown code fences.
  - Expanded key limits and overall context length in `_summarize_evidence` (up to 10 keys, 500 characters per value, 2000 characters total) to preserve full tool output detail.

### 2. Frontend Super Admin Interface
- **File**: `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogs.tsx`
  - Replaced static model selector option items inside the agent-specific control card with dynamically loaded options from the global `settingsData` object.
  - Swapped LTR/RTL pagination control chevron arrow orientations in Arabic viewports.
