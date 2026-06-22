# MaxP Platform Backend Structure & Architecture

This document describes the structure of the Node.js backend, its key modules, configuration patterns, and system architecture.

## Configuration & Environment

Configuration variables are loaded from the environment or `.env` files. WhatsApp configuration details (including credentials, access tokens, and API versioning) are managed dynamically through the platform's settings.

### Meta Graph API Versioning

- The platform standardizes on version `v25.0` for all Meta API integrations (WhatsApp Cloud API, Facebook Graph API, Messenger API).
- Individual session configurations can override this standard version through database records, enabling smooth rollouts and targeted compatibility tests.

## Directory Layout

- `/controller`: Request handlers (e.g. `whatsappController.js`)
- `/services`: Business logic layer (e.g. `/services/whatsapp/providers/MetaCloudProvider.js`)
- `/config`: Central configuration settings
- `/utils`: Common utility functions
