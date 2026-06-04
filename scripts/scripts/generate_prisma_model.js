const fs = require('fs');

const keys = [
    "orderCreatedEnabled",
    "orderConfirmedEnabled",
    "orderProcessingEnabled",
    "orderShippedEnabled",
    "orderDeliveredEnabled",
    "orderCancelledEnabled",
    "orderReturnedEnabled",
    "orderRefundedEnabled",
    "paymentReminderEnabled",
    "paymentConfirmedEnabled",
    "paymentFailedEnabled",
    "welcomeMessageEnabled",
    "abandonedCartEnabled",
    "productReviewRequestEnabled",
    "birthdayGreetingEnabled",
    "draftEnabled",
    "pendingEnabled",
    "awaitingCustomerInfoEnabled",
    "awaitingVerificationEnabled",
    "awaitingApprovalEnabled",
    "quoteSentEnabled",
    "quoteApprovedEnabled",
    "pendingPaymentEnabled",
    "paymentInitiatedEnabled",
    "paymentProcessingEnabled",
    "paymentAuthorizedEnabled",
    "paymentCapturedEnabled",
    "paymentPartiallyCapturedEnabled",
    "paymentDeclinedEnabled",
    "paymentExpiredEnabled",
    "partialRefundEnabled",
    "chargebackEnabled",
    "chargebackResolvedEnabled",
    "codPendingEnabled",
    "codConfirmedEnabled",
    "underReviewEnabled",
    "awaitingStockEnabled",
    "backorderedEnabled",
    "preOrderEnabled",
    "allocatedEnabled",
    "pickingEnabled",
    "qualityCheckEnabled",
    "packedEnabled",
    "labelCreatedEnabled",
    "readyForPickupEnabled",
    "readyToShipEnabled",
    "cancelRequestedEnabled",
    "cancellationUnderReviewEnabled",
    "cancelledByCustomerEnabled",
    "cancelledByAdminEnabled",
    "cancelledBySystemEnabled",
    "orderExpiredEnabled",
    "returnRequestedEnabled",
    "returnUnderReviewEnabled",
    "returnApprovedEnabled",
    "returnRejectedEnabled",
    "returnPickupScheduledEnabled",
    "returnInTransitEnabled",
    "returnReceivedEnabled",
    "returnInspectedEnabled",
    "refundProcessingEnabled",
    "exchangeRequestedEnabled",
    "exchangeApprovedEnabled",
    "exchangeShippedEnabled",
    "exchangeCompletedEnabled",
    "fraudSuspectedEnabled",
    "blacklistedCustomerEnabled",
    "manualReviewRequiredEnabled",
    "splitShipmentEnabled",
    "mergedOrderEnabled",
    "duplicateOrderEnabled",
    "onHoldEnabled",
    "escalatedEnabled",
    "disputedEnabled",
    "awaitingDocumentsEnabled",
    "shipmentCreatedEnabled",
    "inTransitEnabled",
    "atSortingFacilityEnabled",
    "atLocalHubEnabled",
    "customsClearanceEnabled",
    "customsHoldEnabled",
    "outForDeliveryEnabled",
    "deliveryAttemptedEnabled",
    "deliveryFailedEnabled",
    "rescheduledDeliveryEnabled",
    "awaitingPickupBranchEnabled",
    "partiallyDeliveredEnabled",
    "lostInTransitEnabled",
    "damagedInTransitEnabled",
    "returnedToSenderEnabled"
];

// Current fields in DB (to avoid duplicates)
const currentFields = new Set([
    "id", "companyId", "isEnabled", "defaultSessionId",
    "orderNotificationsEnabled", "orderCreatedEnabled", "orderConfirmedEnabled",
    "orderProcessingEnabled", "orderShippedEnabled", "orderDeliveredEnabled",
    "orderCancelledEnabled", "paymentReminderEnabled", "paymentReminderHours",
    "productNotificationsEnabled", "backInStockEnabled", "priceDropEnabled",
    "newProductEnabled", "abandonedCartEnabled", "abandonedCartFirstReminder",
    "abandonedCartSecondReminder", "abandonedCartThirdReminder",
    "abandonedCartDiscountEnabled", "abandonedCartDiscountPercent",
    "marketingNotificationsEnabled", "promotionalEnabled", "couponEnabled",
    "birthdayEnabled", "loyaltyEnabled", "hrNotificationsEnabled",
    "attendanceReminderEnabled", "attendanceConfirmedEnabled",
    "checkoutConfirmedEnabled", "leaveApprovalEnabled",
    "permissionApprovalEnabled", "manualDeductionEnabled",
    "payrollEnabled", "birthdayWishEnabled", "warningNotificationEnabled",
    "rateLimitPerMinute", "quietHoursEnabled", "quietHoursStart", "quietHoursEnd",
    "createdAt", "updatedAt", "company"
]);

let modelBody = `  id                            String   @id @default(cuid())
  companyId                     String   @unique
  isEnabled                     Boolean  @default(true)
  defaultSessionId              String?
  orderNotificationsEnabled     Boolean  @default(true)
  orderCreatedEnabled           Boolean  @default(true)
  orderConfirmedEnabled         Boolean  @default(true)
  orderProcessingEnabled        Boolean  @default(true)
  orderShippedEnabled           Boolean  @default(true)
  orderDeliveredEnabled         Boolean  @default(true)
  orderCancelledEnabled         Boolean  @default(true)
  paymentReminderEnabled        Boolean  @default(true)
  paymentReminderHours          Int      @default(24)
  productNotificationsEnabled   Boolean  @default(true)
  backInStockEnabled            Boolean  @default(true)
  priceDropEnabled              Boolean  @default(true)
  newProductEnabled             Boolean  @default(false)
  abandonedCartEnabled          Boolean  @default(true)
  abandonedCartFirstReminder    Int      @default(1)
  abandonedCartSecondReminder   Int      @default(24)
  abandonedCartThirdReminder    Int      @default(72)
  abandonedCartDiscountEnabled  Boolean  @default(false)
  abandonedCartDiscountPercent  Int      @default(10)
  marketingNotificationsEnabled Boolean  @default(false)
  promotionalEnabled            Boolean  @default(false)
  couponEnabled                 Boolean  @default(false)
  birthdayEnabled               Boolean  @default(false)
  loyaltyEnabled                Boolean  @default(false)
  hrNotificationsEnabled        Boolean  @default(false)
  attendanceReminderEnabled     Boolean  @default(false)
  attendanceConfirmedEnabled    Boolean  @default(false)
  checkoutConfirmedEnabled     Boolean  @default(false)
  leaveApprovalEnabled          Boolean  @default(false)
  permissionApprovalEnabled     Boolean  @default(false)
  manualDeductionEnabled        Boolean  @default(false)
  payrollEnabled                Boolean  @default(false)
  birthdayWishEnabled           Boolean  @default(false)
  warningNotificationEnabled    Boolean  @default(false)
`;

modelBody += '  // --- Expanded WhatsApp Notification Tokens ---\n';

for (const key of keys) {
    if (!currentFields.has(key)) {
        // Determine default value based on parent group
        let defaultVal = 'true';
        if (key.includes('Marketing') || key.includes('Promotional') || key.includes('Loyalty')) {
            defaultVal = 'false';
        }
        modelBody += `  ${key.padEnd(30)} Boolean  @default(${defaultVal})\n`;
    }
}

modelBody += `
  rateLimitPerMinute            Int      @default(30)
  quietHoursEnabled             Boolean  @default(true)
  quietHoursStart               String   @default("22:00")
  quietHoursEnd                 String   @default("08:00")
  createdAt                     DateTime @default(now())
  updatedAt                     DateTime @updatedAt
  company                       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
`;

console.log(modelBody);
