# Team Sync Notes

## [2026-03-09]

### WhatsApp Session Creation Wizard Redesign
- **Accomplishment**: Redesigned the WhatsApp session creation popup in the React frontend. Replaced the single long, cluttered form with a clean 3-step wizard (Basics, Connection details, Review & confirm) which improves the user onboarding experience.
- **Details**:
  - Replaced the provider selector dropdown with large visual radio buttons.
  - Added a visual stepper/progress bar indicating the current step.
  - Added tooltips in both Arabic and English to explain each Meta Cloud API credential field.
  - Enforced a default API version of `v25.0` for new Meta Cloud integrations.
  - Placed advanced settings (webhook verify token, app secret, display phone) inside a collapsible settings panel.
  - Added form validation to restrict progress to the next step if required fields are missing.

### Meta Graph API Upgrade to v25.0
- **Accomplishment**: Successfully upgraded all Meta Graph API and WhatsApp Cloud API integrations across the Node.js backend and Python AI service to utilize version `v25.0` (latest release).
- **Details**:
  - Replaced all hardcoded versions (v18.0, v21.0, v22.0) with dynamic resolution via the helper `getMetaGraphApiVersion()`.
  - Allowed overriding the active Graph API version using the `META_GRAPH_API_VERSION` environment variable.
  - Verified backend JEST tests and resolved potential syntax issues.
  - Resolved merge conflicts in `apps/backend/Bugs.md` and created structure and sync documentation.
