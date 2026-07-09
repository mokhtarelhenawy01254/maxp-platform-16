# AI Agent Model Override Precedence Fix

## Overview
This document records the fix for prioritizing company-specific model overrides over template default models.

## Details
- **Date**: 2026-07-09
- **Files Modified**:
  - `apps/ai-service/src/services/agent_registry.py`
  - `apps/ai-service/tests/unit/test_model_resolution.py`
- **Behavioral Change**:
  In `_resolve_agent_model`, the resolution precedence order has been updated to evaluate the database company agent model override first (`db_agent.model`) before falling back to the template's default model policy (`template.model_policy.default`).
