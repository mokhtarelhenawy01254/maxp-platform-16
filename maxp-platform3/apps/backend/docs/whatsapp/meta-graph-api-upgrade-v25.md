# Meta Graph API Upgrade to v25.0

This document outlines the changes made to transition the MaxP Platform's Meta integration to Graph API version `v25.0`.

## Overview

Previously, various modules in the backend and AI services used hardcoded versions of Meta's Graph API, ranging from `v18.0` to `v22.0`. This upgrade centralizes the API version resolution and updates the default version to `v25.0`.

## Architecture & Integration Details

### 1. Configuration (`apps/backend/config/metaApi.js`)
- Exposes `getMetaGraphApiVersion()` helper.
- Default version is set to `"v25.0"`.
- Can be overridden using `META_GRAPH_API_VERSION` environment variable.

### 2. Node.js Backend Controllers
The following controllers have been modified to call `getMetaGraphApiVersion()` dynamically instead of using hardcoded version strings:
- `apps/backend/controller/conversation/facebookSyncController.js`
- `apps/backend/controller/conversation/messagingController.js`
- `apps/backend/controller/conversation/conversationCrudController.js`
- `apps/backend/controller/customerController.js`
- `apps/backend/controller/facebookIntegration.js`
- `apps/backend/controller/pageEngagementController.js`
- `apps/backend/controller/proxyImageController.js`
- `apps/backend/controller/facebookPublishController.js`
- `apps/backend/services/agentInboxFacebookService.js`

### 3. Python AI Service Clients
- `apps/ai-service/src/tools/whatsapp_client.py` and `facebook_client.py` have been updated to read `META_GRAPH_API_VERSION` from environment variables, defaulting to `v25.0`.

## Verification & Testing

- Backend integration tests were run and validated:
  - `npx jest tests/controller/facebookSyncController.test.js`
  - `npx jest tests/services/agentInboxFacebookService.test.js`
- Syntax check passed:
  - `npm run check:syntax`
