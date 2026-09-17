# Repository Migration to maxp-platform-10 & Facebook AI Auto-Reply Refinements

## Date: 2026-09-15

### 1. Repository Migration Summary
- **Target Repository**: `https://github.com/elhenawym124-ops/maxp-platform-10.git`
- **Remote Configuration**: Primary remote set to `origin` pointing to `git@github.com:elhenawym124-ops/maxp-platform-10.git`.
- **Old Remotes**: (الريمو القديم) and `upstream` fully retired and removed.
- **CI/CD Status**: GitHub Actions workflows (`Deploy to Server`) verified and green on `elhenawym124-ops/maxp-platform-10`.
- **Server Deployment**: Live production deployment fully verified with PM2 processes (`maxp-backend`, `maxp-ai-service`, `maxp-webhook-worker`) online and operational.

### 2. Facebook AI Messenger & Sales Rep v2 Updates
- **Attachment Stripping**: Cleaned up duplicated markdown image URLs from the text body when sending via Facebook Messenger API so users receive clean message text alongside native image attachments.
- **Smart Grouped Slot-Filling**: Updated sales-rep-v2 contract to prevent repetitive single-field asking; collects size/color and phone/address in unified messages.
- **Enforced Real Order Close**: Guaranteed `order_create_confirmed` is invoked and provides true `orderNumber` before claiming success to customer.
