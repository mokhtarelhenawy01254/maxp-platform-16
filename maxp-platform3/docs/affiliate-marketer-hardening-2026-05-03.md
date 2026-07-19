# Affiliate Marketer Hardening - 2026-05-03

## What Was Fixed

### 1. Direct affiliate orders no longer create withdrawable commissions immediately
- Removed immediate commission calculation from affiliate direct order creation.
- Affiliate commissions now wait for the normal order lifecycle before becoming confirmed and withdrawable.

### 2. Payout request validation is now unified
- Both payout routes now pass through the same shared handler.
- The handler enforces:
  - active affiliate status
  - valid positive amount
  - minimum payout
  - available withdrawable balance
  - valid payout method

### 3. Cancelled and returned orders now claw back affiliate commissions
- Added cancellation logic for affiliate-linked commissions when an order is cancelled or returned.
- Pending and confirmed commissions are cancelled automatically.
- Paid commissions are flagged for manual review instead of being silently ignored.
- Pending payout requests linked to cancelled commissions are recalculated automatically.

### 4. Affiliate permissions are now enforced in runtime flows
- `canCreateOrdersForOthers` blocks direct order creation when disabled.
- `canViewCustomerData` blocks the customers endpoint when disabled.
- Referral responses hide customer data when the permission is disabled.
- Affiliate order listing now requests orders without customer payloads when customer visibility is disabled.

### 5. Marketers now have a referrals funnel screen
- Added affiliate referrals page to the app routes, sidebar, and dashboard quick actions.
- The page shows:
  - total referrals
  - converted referrals
  - pending referrals
  - conversion rate
  - total converted revenue
  - detailed referral rows

### 6. Admins now have operational controls for affiliates
- Added per-affiliate policy editor in affiliate management.
- Admins can now update:
  - minimum payout
  - direct-order permission
  - customer-data visibility permission

### 7. Admins now have a payout inbox
- Added an admin payout requests section in commissions management.
- Admins can review pending payout requests and record the external transfer transaction.

### 8. System-level defaults now shape the new marketer lifecycle
- Added affiliate program defaults for:
  - auto approval vs manual review
  - default minimum payout
  - default direct-order permission
  - default customer-data visibility
- These defaults now apply automatically when a new marketer registers.
- Public registration now reflects these defaults so the marketer sees activation and payout expectations up front.

### 9. Review decisions now carry reasons
- Affiliate status updates can now include a review reason from the admin side.
- Suspending or rejecting a marketer now requires a reason.
- The current review reason is shown in affiliate management and also appears to the marketer on the dashboard when the account is pending or suspended.

### 10. Admin payout rejection now closes the loop safely
- Admins can now reject or cancel a pending payout request with a required reason.
- Cancelling a pending payout request unlinks the confirmed commissions from that payout so they return to the marketer's withdrawable balance.
- The payout reason is now visible in both the admin payout inbox and the marketer payout history.

### 11. Payout processing SLA is now configurable
- Added `payoutSlaDays` to affiliate system settings with a default of 3 days.
- The SLA now appears in affiliate system settings, the public affiliate registration page, and the affiliate commission page.
- This gives marketers a clear expectation for payout processing time before and after registration.

### 12. Payout proof upload now completes the admin payout trail
- Added payout proof fields on affiliate payout records so every processed payout can keep a transfer artifact.
- Admins can now upload an image or PDF proof after recording the payout transfer.
- The proof link is visible in both the admin payout inbox and the marketer payout history.

### 13. Identity document requirements now cover public affiliate registration
- Added system-level affiliate settings to require an identity or verification document from new marketers.
- Public affiliate registration now supports image/PDF upload and blocks submission when the company policy marks the document as required.
- The uploaded document is saved on the affiliate profile and surfaced to admins inside affiliate management for review.

### 14. Structured document review and affiliate review history are now live
- Added explicit identity-document review states on the affiliate profile:
  - `NOT_SUBMITTED`
  - `PENDING_REVIEW`
  - `APPROVED`
  - `REJECTED`
- Admins can now approve or reject the marketer identity document directly from affiliate management.
- Rejecting a document now requires a review note.
- Every important affiliate lifecycle decision now writes a review log entry, including:
  - marketer registration submission
  - identity document upload
  - affiliate status changes
  - identity document review decisions
- Affiliate management now includes a review-history modal so admins can inspect the full timeline instead of only the latest reason.
- The affiliate dashboard now shows document-review context to the marketer when the account is pending or suspended.

### 15. Rejected identity documents can now be resubmitted with version history
- Added `affiliate_identity_document_versions` so every uploaded marketer identity document can be preserved instead of overwriting the old file trail.
- When a marketer uploads a replacement document after rejection:
  - the previous current version is marked as replaced
  - the new file becomes the current version
  - document review returns to `PENDING_REVIEW`
  - the latest document review note is cleared
  - non-active accounts reopen to `PENDING` with a fresh review reason
- Added marketer route `POST /affiliates/me/identity-document` for secure resubmission from the affiliate dashboard.
- Added admin route `GET /affiliates/:id/document-history` so reviewers can compare the current document against older versions.
- Affiliate management now shows:
  - current document source and upload timestamp
  - previous document versions
  - per-version source labels such as registration vs resubmission
- The affiliate dashboard now shows a rejected-document re-upload card so the marketer can recover without contacting support first.

## Tests Run

### Backend
- `npm test -- affiliateAdminRoutes.test.js publicAffiliateRoutes.test.js`
- `npx jest --runInBand tests/services/commissionService.payout.test.js tests/routes/affiliateAdminRoutes.test.js`
- `npx jest --runInBand tests/routes/affiliateAdminRoutes.test.js tests/services/affiliateService.paymentMethod.test.js`
- `npx jest --runInBand backend/tests/routes/affiliateAdminRoutes.test.js backend/tests/services/affiliateService.paymentMethod.test.js`
- `node --check backend/routes/affiliateRoutes.js`
- `node --check backend/services/affiliateService.js`
- `node --check backend/middleware/affiliateIdentityDocumentUpload.js`

### Frontend
- `npm test -- --runInBand src/pages/affiliates/__tests__/AffiliateCommission.test.tsx src/pages/affiliates/__tests__/AffiliateReferrals.test.tsx src/pages/affiliates/__tests__/AffiliatesManagement.test.tsx src/pages/platform/__tests__/CommissionsManagement.test.tsx`
- `npm test -- --runInBand src/pages/platform/__tests__/CommissionsManagement.test.tsx src/pages/affiliates/__tests__/AffiliateCommission.test.tsx`
- `npm test -- --runInBand src/pages/affiliates/__tests__/AffiliatesManagement.test.tsx src/pages/affiliates/__tests__/AffiliateFlowPages.test.tsx`
- `npx jest --config jest.config.cjs --runInBand src/pages/affiliates/__tests__/AffiliatesManagement.test.tsx src/pages/affiliates/__tests__/AffiliateFlowPages.test.tsx`
- `npx eslint src/pages/affiliates/AffiliatesManagement.tsx src/pages/affiliates/AffiliateDashboard.tsx`
- `npx eslint src/pages/affiliates/AffiliatesManagement.tsx src/pages/affiliates/AffiliateDashboard.tsx src/pages/affiliates/__tests__/AffiliatesManagement.test.tsx src/pages/affiliates/__tests__/AffiliateFlowPages.test.tsx`

## Remaining Next Phase

- Add a full marketer approval workflow with review reasons and documents/KYC.
- Add campaign-level attribution and deeper source analytics.
- Add richer document workflows such as multiple KYC files, per-document statuses, and structured verification outcomes.
