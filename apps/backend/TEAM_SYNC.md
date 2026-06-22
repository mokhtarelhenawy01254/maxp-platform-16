# Team Sync Notes

## [2026-03-09]

### WhatsApp Meta Webhook 403 & Production DB Fix
- **Accomplishment**: Fixed a major bug preventing Meta WhatsApp Webhook verification (GET 403 Forbidden) and configured correct credentials for the "العمل" WhatsApp session on production database.
- **Details**:
  - Identified a SQL/Prisma null-handling bug where filtering out deleted sessions (`NOT DELETED_METADATA_FILTERS`) was throwing out active sessions whose metadata was `null`. Fixed this by adding `OR: [{ metadata: null }, ...]` explicitly (`ACTIVE_METADATA_FILTER`).
  - Updated the "العمل" session (id: `cmqpkbk65004rjufod0pqpeiw`) with the correct Meta verification token (`maxwhats_2026`) and webhook secret (`dc0514238d0fbbe09890f8429f1f246a`) in the production database.
  - Temporarily whitelisted a secure update endpoint to perform this DB update and removed it after successful verification.

### WhatsApp Session Creation Wizard Redesign
- **Accomplishment**: Redesigned the WhatsApp session creation popup in the React frontend. Replaced the single long, cluttered form with a clean 3-step wizard (Basics, Connection details, Review & confirm) which improves the user onboarding experience.
- **Details**:
  - Replaced the provider selector dropdown with large visual radio buttons.
  - Added a visual stepper/progress bar indicating the current step.
  - Added tooltips in both Arabic and English to explain each Meta Cloud API credential field.
  - Enforced a default API version of `v25.0` for new Meta Cloud integrations.
  - Placed advanced settings (webhook verify token, app secret, display phone) inside a collapsible settings panel.
  - Added form validation to restrict progress to the next step if required fields are missing.

### WhatsApp Meta Cloud Webhook Fixes
- **Accomplishment**: Fixed Meta Cloud Webhook signature verification and route isolation, enabling incoming WhatsApp messages to correctly sync to the platform.
- **Details**:
  - Excluded the new Webhook route `/api/v1/whatsapp-meta` from company isolation checks.
  - Whitelisted `/api/v1/whatsapp-meta` and subpaths in `PUBLIC_ROUTES` to prevent unauthorized routing blockages.
  - Rewrote the signature validation logic in `whatsappMetaWebhookController` to verify requests using active DB session secrets (`metaWebhookSecret`) when global environment secrets are missing.

### Meta Graph API Upgrade to v25.0
- **Accomplishment**: Successfully upgraded all Meta Graph API and WhatsApp Cloud API integrations across the Node.js backend and Python AI service to utilize version `v25.0` (latest release).
- **Details**:
  - Replaced all hardcoded versions (v18.0, v21.0, v22.0) with dynamic resolution via the helper `getMetaGraphApiVersion()`.
  - Allowed overriding the active Graph API version using the `META_GRAPH_API_VERSION` environment variable.
  - Verified backend JEST tests and resolved potential syntax issues.
  - Resolved merge conflicts in `apps/backend/Bugs.md` and created structure and sync documentation.
