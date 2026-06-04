-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "invoices_type" AS ENUM ('SUBSCRIPTION', 'ONE_TIME', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'PROSPECT', 'CUSTOMER', 'VIP', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('FACEBOOK', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'SMS', 'PHONE', 'WEBSITE', 'TEST');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "messages_type" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'STICKER', 'EMOJI', 'TEMPLATE', 'CONTACT', 'BUTTONS', 'LIST', 'REACTION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED', 'WOO_TAGHEZ', 'DRAFT');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'WALLET', 'INSTAPAY', 'VISA', 'MASTERCARD', 'VODAFONE_CASH');

-- CreateEnum
CREATE TYPE "stock_movements_type" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GlobalAiProvider" AS ENUM ('GOOGLE', 'DEEPSEEK', 'OPENAI', 'ANTHROPIC', 'HUGGINGFACE', 'OLLAMA');

-- CreateEnum
CREATE TYPE "stock_alerts_type" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING');

-- CreateEnum
CREATE TYPE "StockAlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "hr_leave_requests_type" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'HAJJ', 'STUDY', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "HrPermissionType" AS ENUM ('DEDUCTIBLE', 'NON_DEDUCTIBLE', 'FIXED_HOURS', 'COMPENSATORY');

-- CreateEnum
CREATE TYPE "HrPermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "dev_tasks_type" AS ENUM ('BUG', 'FEATURE', 'ENHANCEMENT', 'DOCUMENTATION', 'SECURITY', 'PERFORMANCE', 'TESTING', 'REFACTOR', 'MAINTENANCE', 'HOTFIX');

-- CreateEnum
CREATE TYPE "hr_employee_warnings_type" AS ENUM ('VERBAL', 'WRITTEN', 'FINAL', 'TERMINATION');

-- CreateEnum
CREATE TYPE "TaskTemplateStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DevProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UsercompanyRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "DevTaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskTemplatePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DevReleaseStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'READY', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppSessionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'QR_PENDING', 'CONNECTING', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "dev_projects_priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "whatsapp_statuses_type" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'POLL', 'PRODUCT', 'ORDER', 'CATALOG', 'INTERACTIVE', 'BUTTON_REPLY', 'LIST_REPLY', 'TEMPLATE', 'UNKNOWN', 'REACTION');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DevTaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "store_pages_pageType" AS ENUM ('HOME', 'ABOUT', 'CONTACT', 'SHIPPING_POLICY', 'RETURN_POLICY', 'REFUND_POLICY', 'PRIVACY_POLICY', 'TERMS_CONDITIONS', 'ABOUT_US', 'CONTACT_US', 'FAQ', 'PAYMENT_METHODS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SupportTicket_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'PENDING', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'REACTION', 'POLL', 'TEMPLATE', 'BUTTONS', 'LIST', 'PRODUCT', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "coupons_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "companies_plan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "whatsapp_messages_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'REMOTE');

-- CreateEnum
CREATE TYPE "CustomerRating" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'BAD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED');

-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('VERBAL', 'WRITTEN', 'FINAL', 'TERMINATION');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('INQUIRY', 'TECHNICAL', 'BILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "wallet_transactions_type" AS ENUM ('CREDIT', 'DEBIT', 'CASHBACK', 'REFUND', 'REFERRAL_BONUS', 'REWARD', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "global_ai_configs_defaultProvider" AS ENUM ('GOOGLE', 'DEEPSEEK', 'OPENAI', 'ANTHROPIC', 'HUGGINGFACE', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ai_keys_provider" AS ENUM ('GOOGLE', 'DEEPSEEK', 'OPENAI', 'ANTHROPIC', 'HUGGINGFACE', 'OLLAMA');

-- CreateEnum
CREATE TYPE "subscriptions_planType" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "return_reason_categories_defaultRole" AS ENUM ('CUSTOMER', 'STORE', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "stock_alerts_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "whatsapp_notification_templates_category" AS ENUM ('ORDER', 'ORDERS', 'PAYMENT', 'DELIVERY', 'CUSTOMER', 'MARKETING', 'PRODUCTS', 'ABANDONED_CART', 'HR', 'SYSTEM', 'GENERAL', 'ORDER_NOTIFICATION');

-- CreateEnum
CREATE TYPE "task_templates_defaultStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "subscriptions_status" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "hr_manual_deductions_type" AS ENUM ('PENALTY', 'VIOLATION', 'DAMAGE', 'INSURANCE', 'LOAN_REPAYMENT', 'ADVANCE_REPAYMENT', 'TAX', 'SOCIAL_INSURANCE', 'ABSENCE', 'LATE', 'EARLY_LEAVE', 'OTHER', 'LOAN');

-- CreateEnum
CREATE TYPE "conversations_channel" AS ENUM ('FACEBOOK', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'SMS', 'PHONE', 'WEBSITE', 'TEST');

-- CreateEnum
CREATE TYPE "dev_projects_status" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Project_status" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "user_companies_role" AS ENUM ('OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "whatsapp_notification_templates_eventType" AS ENUM ('ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_REFUNDED', 'PAYMENT_REMINDER', 'PAYMENT_RECEIVED', 'BACK_IN_STOCK', 'PRICE_DROP', 'NEW_PRODUCT', 'LOW_STOCK_ALERT', 'CART_ABANDONED_1H', 'CART_ABANDONED_24H', 'CART_ABANDONED_72H', 'CART_ABANDONED_WITH_DISCOUNT', 'PROMOTIONAL', 'COUPON_SENT', 'BIRTHDAY_WISH', 'LOYALTY_POINTS', 'LOYALTY_POINTS_AWARDED', 'LOYALTY_REWARD', 'REVIEW_REQUEST', 'ATTENDANCE_REMINDER', 'ATTENDANCE_CONFIRMED', 'ATTENDANCE_LATE', 'ATTENDANCE_LATE_WITH_DEDUCTION', 'CHECKOUT_CONFIRMED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_READY', 'BIRTHDAY_EMPLOYEE', 'WARNING_ISSUED', 'CONTRACT_EXPIRY', 'TRAINING_REMINDER', 'ANNOUNCEMENT', 'OTP', 'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED', 'ASSET_REQUEST_FULFILLED', 'MANUAL_DEDUCTION', 'DRAFT', 'PENDING', 'AWAITING_CUSTOMER_INFO', 'AWAITING_VERIFICATION', 'AWAITING_APPROVAL', 'QUOTE_SENT', 'QUOTE_APPROVED', 'PENDING_PAYMENT', 'PAYMENT_INITIATED', 'PAYMENT_PROCESSING', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_PARTIALLY_CAPTURED', 'PAYMENT_DECLINED', 'PAYMENT_EXPIRED', 'PARTIAL_REFUND', 'CHARGEBACK', 'CHARGEBACK_RESOLVED', 'COD_PENDING', 'COD_CONFIRMED', 'UNDER_REVIEW', 'AWAITING_STOCK', 'BACKORDERED', 'PRE_ORDER', 'ALLOCATED', 'PICKING', 'QUALITY_CHECK', 'PACKED', 'LABEL_CREATED', 'READY_FOR_PICKUP', 'READY_TO_SHIP', 'CANCEL_REQUESTED', 'CANCELLATION_UNDER_REVIEW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_SYSTEM', 'ORDER_EXPIRED', 'RETURN_REQUESTED', 'RETURN_UNDER_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKUP_SCHEDULED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'RETURN_INSPECTED', 'REFUND_PROCESSING', 'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED', 'FRAUD_SUSPECTED', 'BLACKLISTED_CUSTOMER', 'MANUAL_REVIEW_REQUIRED', 'SPLIT_SHIPMENT', 'MERGED_ORDER', 'DUPLICATE_ORDER', 'ON_HOLD', 'ESCALATED', 'DISPUTED', 'AWAITING_DOCUMENTS', 'SHIPMENT_CREATED', 'IN_TRANSIT', 'AT_SORTING_FACILITY', 'AT_LOCAL_HUB', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERY_FAILED', 'RESCHEDULED_DELIVERY', 'AWAITING_PICKUP_BRANCH', 'PARTIALLY_DELIVERED', 'LOST_IN_TRANSIT', 'DAMAGED_IN_TRANSIT', 'RETURNED_TO_SENDER', 'ORDER_RETURNED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'WELCOME_MESSAGE', 'ABANDONED_CART', 'PRODUCT_REVIEW_REQUEST', 'BIRTHDAY_GREETING');

-- CreateEnum
CREATE TYPE "Task_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "dev_tasks_status" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "stock_movements_reason" AS ENUM ('PURCHASE', 'SALE', 'DAMAGE', 'EXPIRED', 'LOST', 'FOUND', 'TRANSFER', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "invoices_status" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "merchant_orders_status" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'FULFILLED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "affiliates_commissionType" AS ENUM ('PERCENTAGE', 'MARKUP', 'FIXED');

-- CreateEnum
CREATE TYPE "task_templates_defaultPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportTicket_category" AS ENUM ('INQUIRY', 'TECHNICAL', 'BILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "dev_releases_status" AS ENUM ('PLANNING', 'IN_PROGRESS', 'READY', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "orders_status" AS ENUM ('PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED', 'WOO_TAGHEZ', 'DRAFT');

-- CreateEnum
CREATE TYPE "whatsapp_sessions_status" AS ENUM ('CONNECTED', 'DISCONNECTED', 'QR_PENDING', 'CONNECTING', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "conversations_status" AS ENUM ('ACTIVE', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Project_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReturnRole" AS ENUM ('CUSTOMER', 'STORE', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('PENALTY', 'VIOLATION', 'DAMAGE', 'INSURANCE', 'LOAN_REPAYMENT', 'ADVANCE_REPAYMENT', 'TAX', 'SOCIAL_INSURANCE', 'ABSENCE', 'LATE', 'EARLY_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeductionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST', 'RESERVED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "affiliates_status" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "affiliates_paymentMethod" AS ENUM ('TRANSFERS', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "SupportTicket_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ai_keys_keyType" AS ENUM ('COMPANY', 'CENTRAL');

-- CreateEnum
CREATE TYPE "assets_status" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DAMAGED', 'LOST', 'DISPOSED');

-- CreateEnum
CREATE TYPE "assets_condition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "whatsapp_notification_queue_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "whatsapp_notification_logs_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "whatsapp_notification_logs_recipientType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'ADMIN');

-- CreateEnum
CREATE TYPE "whatsapp_notification_logs_category" AS ENUM ('ORDER', 'ORDERS', 'PAYMENT', 'DELIVERY', 'CUSTOMER', 'MARKETING', 'PRODUCTS', 'ABANDONED_CART', 'HR', 'SYSTEM', 'GENERAL');

-- CreateEnum
CREATE TYPE "whatsapp_notification_logs_eventType" AS ENUM ('ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 'PROMOTIONAL', 'ORDER_REFUNDED', 'PAYMENT_RECEIVED', 'PRICE_DROP', 'NEW_PRODUCT', 'LOW_STOCK_ALERT', 'CART_ABANDONED_1H', 'CART_ABANDONED_24H', 'CART_ABANDONED_72H', 'CART_ABANDONED_WITH_DISCOUNT', 'COUPON_SENT', 'BIRTHDAY_WISH', 'LOYALTY_POINTS', 'LOYALTY_POINTS_AWARDED', 'LOYALTY_REWARD', 'REVIEW_REQUEST', 'ATTENDANCE_REMINDER', 'ATTENDANCE_CONFIRMED', 'ATTENDANCE_LATE', 'ATTENDANCE_LATE_WITH_DEDUCTION', 'CHECKOUT_CONFIRMED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_READY', 'BIRTHDAY_EMPLOYEE', 'WARNING_ISSUED', 'CONTRACT_EXPIRY', 'TRAINING_REMINDER', 'ANNOUNCEMENT', 'OTP', 'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED', 'ASSET_REQUEST_FULFILLED', 'MANUAL_DEDUCTION', 'DRAFT', 'PENDING', 'AWAITING_CUSTOMER_INFO', 'AWAITING_VERIFICATION', 'AWAITING_APPROVAL', 'QUOTE_SENT', 'QUOTE_APPROVED', 'PENDING_PAYMENT', 'PAYMENT_INITIATED', 'PAYMENT_PROCESSING', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_PARTIALLY_CAPTURED', 'PAYMENT_DECLINED', 'PAYMENT_EXPIRED', 'PARTIAL_REFUND', 'CHARGEBACK', 'CHARGEBACK_RESOLVED', 'COD_PENDING', 'COD_CONFIRMED', 'UNDER_REVIEW', 'AWAITING_STOCK', 'BACKORDERED', 'PRE_ORDER', 'ALLOCATED', 'PICKING', 'QUALITY_CHECK', 'PACKED', 'LABEL_CREATED', 'READY_FOR_PICKUP', 'READY_TO_SHIP', 'CANCEL_REQUESTED', 'CANCELLATION_UNDER_REVIEW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_SYSTEM', 'ORDER_EXPIRED', 'RETURN_REQUESTED', 'RETURN_UNDER_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKUP_SCHEDULED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'RETURN_INSPECTED', 'REFUND_PROCESSING', 'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED', 'FRAUD_SUSPECTED', 'BLACKLISTED_CUSTOMER', 'MANUAL_REVIEW_REQUIRED', 'SPLIT_SHIPMENT', 'MERGED_ORDER', 'DUPLICATE_ORDER', 'ON_HOLD', 'ESCALATED', 'DISPUTED', 'AWAITING_DOCUMENTS', 'SHIPMENT_CREATED', 'IN_TRANSIT', 'AT_SORTING_FACILITY', 'AT_LOCAL_HUB', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERY_FAILED', 'RESCHEDULED_DELIVERY', 'AWAITING_PICKUP_BRANCH', 'PARTIALLY_DELIVERED', 'LOST_IN_TRANSIT', 'DAMAGED_IN_TRANSIT', 'RETURNED_TO_SENDER', 'ORDER_RETURNED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'WELCOME_MESSAGE', 'ABANDONED_CART', 'PRODUCT_REVIEW_REQUEST', 'BIRTHDAY_GREETING');

-- CreateEnum
CREATE TYPE "whatsapp_notification_queue_recipientType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'ADMIN');

-- CreateEnum
CREATE TYPE "whatsapp_notification_queue_category" AS ENUM ('ORDER', 'ORDERS', 'PAYMENT', 'DELIVERY', 'CUSTOMER', 'MARKETING', 'PRODUCTS', 'ABANDONED_CART', 'HR', 'SYSTEM', 'GENERAL');

-- CreateEnum
CREATE TYPE "whatsapp_notification_queue_eventType" AS ENUM ('ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 'PROMOTIONAL', 'ORDER_REFUNDED', 'PAYMENT_RECEIVED', 'PRICE_DROP', 'NEW_PRODUCT', 'LOW_STOCK_ALERT', 'CART_ABANDONED_1H', 'CART_ABANDONED_24H', 'CART_ABANDONED_72H', 'CART_ABANDONED_WITH_DISCOUNT', 'COUPON_SENT', 'BIRTHDAY_WISH', 'LOYALTY_POINTS', 'LOYALTY_POINTS_AWARDED', 'LOYALTY_REWARD', 'REVIEW_REQUEST', 'ATTENDANCE_REMINDER', 'ATTENDANCE_CONFIRMED', 'ATTENDANCE_LATE', 'ATTENDANCE_LATE_WITH_DEDUCTION', 'CHECKOUT_CONFIRMED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_READY', 'BIRTHDAY_EMPLOYEE', 'WARNING_ISSUED', 'CONTRACT_EXPIRY', 'TRAINING_REMINDER', 'ANNOUNCEMENT', 'OTP', 'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED', 'ASSET_REQUEST_FULFILLED', 'MANUAL_DEDUCTION', 'DRAFT', 'PENDING', 'AWAITING_CUSTOMER_INFO', 'AWAITING_VERIFICATION', 'AWAITING_APPROVAL', 'QUOTE_SENT', 'QUOTE_APPROVED', 'PENDING_PAYMENT', 'PAYMENT_INITIATED', 'PAYMENT_PROCESSING', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_PARTIALLY_CAPTURED', 'PAYMENT_DECLINED', 'PAYMENT_EXPIRED', 'PARTIAL_REFUND', 'CHARGEBACK', 'CHARGEBACK_RESOLVED', 'COD_PENDING', 'COD_CONFIRMED', 'UNDER_REVIEW', 'AWAITING_STOCK', 'BACKORDERED', 'PRE_ORDER', 'ALLOCATED', 'PICKING', 'QUALITY_CHECK', 'PACKED', 'LABEL_CREATED', 'READY_FOR_PICKUP', 'READY_TO_SHIP', 'CANCEL_REQUESTED', 'CANCELLATION_UNDER_REVIEW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_SYSTEM', 'ORDER_EXPIRED', 'RETURN_REQUESTED', 'RETURN_UNDER_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKUP_SCHEDULED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'RETURN_INSPECTED', 'REFUND_PROCESSING', 'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED', 'FRAUD_SUSPECTED', 'BLACKLISTED_CUSTOMER', 'MANUAL_REVIEW_REQUIRED', 'SPLIT_SHIPMENT', 'MERGED_ORDER', 'DUPLICATE_ORDER', 'ON_HOLD', 'ESCALATED', 'DISPUTED', 'AWAITING_DOCUMENTS', 'SHIPMENT_CREATED', 'IN_TRANSIT', 'AT_SORTING_FACILITY', 'AT_LOCAL_HUB', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERY_FAILED', 'RESCHEDULED_DELIVERY', 'AWAITING_PICKUP_BRANCH', 'PARTIALLY_DELIVERED', 'LOST_IN_TRANSIT', 'DAMAGED_IN_TRANSIT', 'RETURNED_TO_SENDER', 'ORDER_RETURNED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'WELCOME_MESSAGE', 'ABANDONED_CART', 'PRODUCT_REVIEW_REQUEST', 'BIRTHDAY_GREETING');

-- CreateEnum
CREATE TYPE "affiliate_payouts_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "affiliate_payouts_paymentMethod" AS ENUM ('TRANSFERS', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "asset_assignments_returnCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "asset_assignments_conditionOnAssign" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "asset_assignments_status" AS ENUM ('ACTIVE', 'RETURNED', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "commissions_type" AS ENUM ('SALE', 'RECURRING', 'BONUS', 'ORDER', 'SUBSCRIPTION', 'REFERRAL', 'AFFILIATE', 'MERCHANT', 'PLATFORM');

-- CreateEnum
CREATE TYPE "commissions_calculationType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "commissions_status" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "customer_loyalty_programs_type" AS ENUM ('POINTS', 'TIERS', 'CASHBACK', 'REFERRAL');

-- CreateEnum
CREATE TYPE "customer_loyalty_programs_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "customer_loyalty_records_status" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "customers_status" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "customers_customerRating" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "dev_tasks_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "hr_attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'REMOTE');

-- CreateEnum
CREATE TYPE "hr_employee_training_status" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr_leave_requests_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr_manual_deductions_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "hr_payroll_status" AS ENUM ('DRAFT', 'PENDING', 'PROCESSED', 'PAID');

-- CreateEnum
CREATE TYPE "hr_performance_reviews_status" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "hr_promotions_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "hr_reward_records_rewardCategory" AS ENUM ('PERFORMANCE', 'ATTENDANCE', 'SERVICE_ANNIVERSARY', 'OTHER');

-- CreateEnum
CREATE TYPE "hr_reward_records_status" AS ENUM ('PENDING', 'APPROVED', 'GIVEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr_reward_types_category" AS ENUM ('FINANCIAL', 'NON_FINANCIAL');

-- CreateEnum
CREATE TYPE "hr_reward_types_calculationMethod" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "hr_reward_types_triggerType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "hr_reward_types_frequency" AS ENUM ('ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "orders_paymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "orders_paymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'WALLET');

-- CreateEnum
CREATE TYPE "orders_orderSource" AS ENUM ('REGULAR', 'DROP_SHIPPING', 'POS', 'MOBILE');

-- CreateEnum
CREATE TYPE "payments_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payments_method" AS ENUM ('BANK_TRANSFER', 'CASH', 'ONLINE', 'WALLET');

-- CreateEnum
CREATE TYPE "purchase_invoices_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "purchase_orders_status" AS ENUM ('DRAFT', 'PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "return_requests_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "return_requests_responsibleParty" AS ENUM ('CUSTOMER', 'STORE', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "supplier_payments_paymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "Task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "user_invitations_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "users_contractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "whatsapp_messages_messageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('REGULAR', 'AFFILIATE_REFERRAL', 'AFFILIATE_DIRECT', 'INTERNAL_IMPORT');

-- CreateEnum
CREATE TYPE "billing_history_type" AS ENUM ('PLATFORM_FEE', 'APP_SUBSCRIPTION', 'APP_USAGE', 'MARKETPLACE_PURCHASE', 'OTHER');

-- CreateEnum
CREATE TYPE "pricing_model" AS ENUM ('FREE', 'SUBSCRIPTION', 'PAY_PER_USE');

-- CreateEnum
CREATE TYPE "partner_titles" AS ENUM ('PARTNER', 'SENIOR_PARTNER', 'MASTER_PARTNER', 'EXECUTIVE_PARTNER');

-- CreateEnum
CREATE TYPE "platform_partner_status" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "partner_payout_methods" AS ENUM ('BANK_TRANSFER', 'PAYPAL', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "partner_commission_status" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'DENIED');

-- CreateEnum
CREATE TYPE "partner_payout_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SETTLEMENT', 'ASSIGN', 'UNASSIGN', 'ACTIVATE', 'DEACTIVATE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT', 'SYNC', 'REOPEN');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('LEAVE', 'ADVANCE', 'ADVANCE_REQUEST', 'RESIGNATION', 'EMPLOYEE', 'DEPARTMENT', 'POSITION', 'SHIFT', 'ATTENDANCE', 'PERMISSION_REQUEST', 'POLICY', 'DEDUCTION', 'MANUAL_DEDUCTION', 'PAYROLL', 'SALARY_UPDATE', 'GOAL', 'FEEDBACK', 'CLEARANCE', 'SETTLEMENT', 'USER', 'COMPANY', 'SETTINGS');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "affiliate_payouts" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "affiliate_payouts_status" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "affiliate_payouts_paymentMethod" NOT NULL,
    "paymentDetails" TEXT,
    "transactionId" TEXT,
    "externalReference" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "isExternalPayment" BOOLEAN NOT NULL DEFAULT true,
    "externalPaymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_products" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "markup" DECIMAL(10,2) NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_referrals" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "referralCode" TEXT NOT NULL,
    "referralUrl" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "commissionType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "cookieDuration" INTEGER NOT NULL DEFAULT 30,
    "termsAndConditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "platformMarginType" TEXT NOT NULL DEFAULT 'FIXED',
    "platformMarginValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "affiliate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "affiliateCode" TEXT NOT NULL,
    "commissionType" "affiliates_commissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "status" "affiliates_status" NOT NULL DEFAULT 'PENDING',
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "paidEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "pendingEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" "affiliates_paymentMethod",
    "paymentDetails" TEXT,
    "minPayout" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "canCreateOrdersForOthers" BOOLEAN NOT NULL DEFAULT true,
    "canViewCustomerData" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "affiliateId" TEXT,
    "merchantId" TEXT,
    "type" "commissions_type" NOT NULL,
    "calculationType" "commissions_calculationType",
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DOUBLE PRECISION,
    "markup" DECIMAL(10,2),
    "baseAmount" DECIMAL(10,2),
    "status" "commissions_status" NOT NULL DEFAULT 'CONFIRMED',
    "orderTotal" DECIMAL(10,2) NOT NULL,
    "companyId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "aiResponses" INTEGER NOT NULL DEFAULT 0,
    "humanHandoffs" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "avgConfidence" DOUBLE PRECISION,
    "topIntents" TEXT,
    "sentimentDistribution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "userMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "intent" TEXT,
    "sentiment" TEXT,
    "confidence" DOUBLE PRECISION,
    "requiresHumanIntervention" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelUsed" TEXT,
    "responseTime" INTEGER,
    "tokensUsed" INTEGER,
    "keyId" TEXT,
    "keyName" TEXT,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "ai_keys_provider" NOT NULL DEFAULT 'GOOGLE',
    "apiKey" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "keyType" "ai_keys_keyType" NOT NULL DEFAULT 'CENTRAL',
    "usage" TEXT NOT NULL,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "maxRequestsPerDay" INTEGER NOT NULL DEFAULT 1500,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_configs" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "usage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_notifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "promptTemplate" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "escalationRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "autoCreateOrders" BOOLEAN NOT NULL DEFAULT false,
    "autoSuggestProducts" BOOLEAN NOT NULL DEFAULT true,
    "defaultProductId" TEXT,
    "includeImages" BOOLEAN NOT NULL DEFAULT true,
    "maxSuggestions" INTEGER NOT NULL DEFAULT 3,
    "modelSettings" TEXT,
    "responsePrompt" TEXT,
    "memorySettings" TEXT,
    "useAdvancedTools" BOOLEAN NOT NULL DEFAULT false,
    "workingHours" TEXT,
    "workingHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxRepliesPerCustomer" INTEGER NOT NULL DEFAULT 5,
    "multimodalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qualityEvaluationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "queueSettings" TEXT,
    "aiMaxTokens" INTEGER DEFAULT 2048,
    "aiResponseStyle" TEXT DEFAULT 'balanced',
    "aiTemperature" DOUBLE PRECISION DEFAULT 0.7,
    "aiTopK" INTEGER DEFAULT 40,
    "aiTopP" DOUBLE PRECISION DEFAULT 0.9,
    "enableDiversityCheck" BOOLEAN NOT NULL DEFAULT true,
    "enableEmotionalResponse" BOOLEAN NOT NULL DEFAULT true,
    "enableLongTermMemory" BOOLEAN NOT NULL DEFAULT false,
    "enableLowQualityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "enableSmartSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "enableToneAdaptation" BOOLEAN NOT NULL DEFAULT true,
    "maxMessagesPerConversation" INTEGER DEFAULT 50,
    "memoryRetentionDays" INTEGER DEFAULT 30,
    "minQualityScore" DOUBLE PRECISION DEFAULT 70,
    "replyMode" TEXT NOT NULL DEFAULT 'all',
    "autoCleanup" BOOLEAN NOT NULL DEFAULT true,
    "compressionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxConversationsPerUser" INTEGER DEFAULT 100,
    "responseRules" TEXT,
    "disableDefaultTemplates" BOOLEAN NOT NULL DEFAULT false,
    "enableFailover" BOOLEAN NOT NULL DEFAULT true,
    "useModernAgent" BOOLEAN NOT NULL DEFAULT false,
    "negativeKeywords" TEXT,
    "autoFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "negativeCommentAction" TEXT NOT NULL DEFAULT 'hide',

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_data" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "conversationId" TEXT,
    "type" TEXT NOT NULL,
    "data" TEXT,
    "userMessage" TEXT,
    "aiResponse" TEXT,
    "intent" TEXT,
    "sentiment" TEXT,
    "processingTime" INTEGER,
    "ragDataUsed" BOOLEAN NOT NULL DEFAULT false,
    "memoryUsed" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "confidence" DOUBLE PRECISION,
    "outcome" TEXT,
    "feedback" TEXT,
    "insights" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "learningSpeed" TEXT NOT NULL DEFAULT 'medium',
    "autoApplyImprovements" BOOLEAN NOT NULL DEFAULT false,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "minimumSampleSize" INTEGER NOT NULL DEFAULT 50,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT true,
    "responseTime" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_failure_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT,
    "customerId" TEXT,
    "errorType" VARCHAR(100) NOT NULL,
    "errorMessage" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_trace_steps" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "metadata" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_trace_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_traces" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalProductViews" INTEGER NOT NULL DEFAULT 0,
    "totalAddToCarts" INTEGER NOT NULL DEFAULT 0,
    "totalCheckouts" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avgOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bounceRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avgSessionDuration" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "addToCarts" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avgViewDuration" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_limits" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "rpm" INTEGER NOT NULL DEFAULT 15,
    "rph" INTEGER NOT NULL DEFAULT 1000,
    "rpd" INTEGER NOT NULL DEFAULT 1500,
    "tpm" INTEGER NOT NULL DEFAULT 1000000,
    "maxTokens" INTEGER NOT NULL DEFAULT 8192,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "returnCondition" "AssetCondition",
    "notes" TEXT,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "serialNumber" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'NEW',
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "location" TEXT,
    "branchId" TEXT,
    "image" TEXT,
    "notes" TEXT,
    "metadata" TEXT,
    "warrantyStartDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "warrantyMonths" INTEGER,
    "warrantyProvider" TEXT,
    "depreciationMethod" TEXT DEFAULT 'STRAIGHT_LINE',
    "usefulLifeYears" INTEGER DEFAULT 5,
    "salvageValue" DECIMAL(12,2),
    "currentBookValue" DECIMAL(12,2),
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_custody_history" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "action" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "returnCondition" "AssetCondition",
    "notes" TEXT,
    "documentUrl" TEXT,
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_custody_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "category" TEXT,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "AssetRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "fulfilledBy" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_audits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT,
    "auditName" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "conductedBy" TEXT NOT NULL,
    "assetFound" BOOLEAN,
    "assetCondition" "AssetCondition",
    "discrepancy" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_attachments" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" "subscriptions_planType" NOT NULL DEFAULT 'BASIC',
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "status" "subscriptions_status" NOT NULL DEFAULT 'ACTIVE',
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "lastBillingDate" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_enterprise_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customMonthlyFee" DECIMAL(10,2) NOT NULL,
    "customLimits" JSONB NOT NULL,
    "dedicatedSupport" BOOLEAN NOT NULL DEFAULT true,
    "apiAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_enterprise_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "plan" "subscriptions_planType" NOT NULL,
    "maxEmployees" INTEGER NOT NULL DEFAULT -1,
    "maxProducts" INTEGER NOT NULL DEFAULT -1,
    "maxOrdersPerMonth" INTEGER NOT NULL DEFAULT -1,
    "hasAdvancedReports" BOOLEAN NOT NULL DEFAULT false,
    "hasAPIAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "billing_history_type" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "plan" "companies_plan" NOT NULL DEFAULT 'BASIC',
    "planConfigurationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT,
    "facebookUserAccessToken" TEXT,
    "facebookPixelAccessToken" TEXT,
    "useCentralKeys" BOOLEAN NOT NULL DEFAULT false,
    "facebookAdsAccessToken" TEXT,
    "turboApiKey" TEXT,
    "turboAutoCreate" BOOLEAN NOT NULL DEFAULT false,
    "turboEnabled" BOOLEAN NOT NULL DEFAULT false,
    "turboWebhookUrl" TEXT,
    "turboMainClientCode" INTEGER,
    "turboWebhookToken" TEXT,
    "turboSenderNumber" TEXT,
    "sidebarLayout" TEXT NOT NULL DEFAULT 'three-tier',
    "customDomain" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geofenceRadius" INTEGER DEFAULT 200,
    "officeLatitude" DECIMAL(10,8),
    "officeLongitude" DECIMAL(11,8),
    "platformCommissionRate" DOUBLE PRECISION DEFAULT 5,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetPasswordExpires" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "availability" TEXT DEFAULT 'available',
    "department" TEXT,
    "skills" TEXT,
    "baseSalary" DECIMAL(12,2),
    "contractType" "users_contractType",
    "departmentId" TEXT,
    "employeeNumber" TEXT,
    "hireDate" TIMESTAMP(3),
    "positionId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "enableAutoDeduction" BOOLEAN NOT NULL DEFAULT true,
    "lateDeductionRate" DECIMAL(10,2),
    "maxDailyLateMinutes" INTEGER DEFAULT 10,
    "monthlyGraceMinutes" INTEGER DEFAULT 60,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "user_companies_role" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "token" TEXT NOT NULL,
    "status" "user_invitations_status" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetName" TEXT,
    "metadata" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "isSuccess" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "tags" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "accessToken" TEXT,
    "config" TEXT NOT NULL,
    "settings" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "embedding" TEXT,
    "embeddingGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "easy_orders_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 15,
    "statusMapping" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT DEFAULT 'never',
    "lastSyncMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "easy_orders_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "easy_orders_sync_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL DEFAULT 'orders',
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "triggeredBy" TEXT,

    CONSTRAINT "easy_orders_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_departments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT,
    "description" TEXT,
    "managerId" TEXT,
    "parentId" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNameEn" TEXT,
    "lastNameEn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "avatar" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "nationality" TEXT,
    "nationalId" TEXT,
    "passportNumber" TEXT,
    "maritalStatus" "MaritalStatus",
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "departmentId" TEXT,
    "positionId" TEXT,
    "managerId" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "probationEndDate" TIMESTAMP(3),
    "contractType" "ContractType" NOT NULL DEFAULT 'FULL_TIME',
    "contractEndDate" TIMESTAMP(3),
    "workLocation" TEXT,
    "baseSalary" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIban" TEXT,
    "annualLeaveBalance" INTEGER NOT NULL DEFAULT 21,
    "sickLeaveBalance" INTEGER NOT NULL DEFAULT 15,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "terminationDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "emergencyContact" TEXT,
    "documents" TEXT,
    "notes" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_positions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "code" TEXT,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "minSalary" DECIMAL(12,2),
    "maxSalary" DECIMAL(12,2),
    "requirements" TEXT,
    "responsibilities" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "checkInLocation" TEXT,
    "checkOutLocation" TEXT,
    "checkInMethod" TEXT,
    "checkOutMethod" TEXT,
    "workHours" DECIMAL(5,2),
    "overtimeHours" DECIMAL(5,2),
    "lateMinutes" INTEGER DEFAULT 0,
    "earlyLeaveMinutes" INTEGER DEFAULT 0,
    "status" "hr_attendance_status" NOT NULL DEFAULT 'PRESENT',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "notes" TEXT,
    "workMode" TEXT DEFAULT 'OFFICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "hr_leave_requests_type" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "halfDayPeriod" TEXT,
    "reason" TEXT,
    "attachments" TEXT,
    "status" "hr_leave_requests_status" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "substituteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeLeaveApproverId" TEXT,
    "employeeEmployeeLeavesId" TEXT,

    CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_permission_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "HrPermissionType" NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "totalHours" DECIMAL(4,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "HrPermissionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "attachments" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "isCompensated" BOOLEAN NOT NULL DEFAULT false,
    "compensationDate" DATE,
    "compensationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_permission_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payrolls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 30,
    "actualWorkDays" INTEGER NOT NULL DEFAULT 30,
    "allowances" TEXT,
    "totalAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "deductions" TEXT,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "overtimeHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overtimeRate" DECIMAL(3,2) NOT NULL DEFAULT 1.50,
    "overtimeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "bonusNotes" TEXT,
    "socialInsurance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "status" "hr_payroll_status" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "attendanceDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "latePenalty" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "rewardDetails" TEXT,
    "rewards" TEXT,
    "totalRewards" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_performance_reviews" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewPeriod" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "overallRating" DECIMAL(3,2) NOT NULL,
    "ratings" TEXT,
    "goals" TEXT,
    "goalsAchievement" DECIMAL(5,2),
    "strengths" TEXT,
    "improvements" TEXT,
    "reviewerComments" TEXT,
    "employeeComments" TEXT,
    "recommendations" TEXT,
    "status" "hr_performance_reviews_status" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "employeeReviewerReviewsId" TEXT,
    "employeeEmployeeReviewsId" TEXT,

    CONSTRAINT "hr_performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "expiryDate" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_salary_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "previousSalary" DECIMAL(12,2) NOT NULL,
    "newSalary" DECIMAL(12,2) NOT NULL,
    "changeType" TEXT NOT NULL,
    "changePercentage" DECIMAL(5,2),
    "effectiveDate" DATE NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_warnings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "hr_employee_warnings_type" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" DATE NOT NULL,
    "actionTaken" TEXT,
    "issuedBy" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "employeeResponse" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_employee_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_training" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "trainingName" TEXT NOT NULL,
    "provider" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "duration" INTEGER,
    "cost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "hr_employee_training_status" NOT NULL DEFAULT 'PLANNED',
    "completionDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "score" DECIMAL(5,2),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_employee_training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 60,
    "color" TEXT DEFAULT '#3B82F6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shift_assignments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_benefits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_benefit_enrollments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_benefit_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_goals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DECIMAL(12,2) NOT NULL,
    "currentValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "unit" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_feedbacks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PEER',
    "category" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "employeeFeedbackToId" TEXT,
    "employeeFeedbackFromId" TEXT,

    CONSTRAINT "hr_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_resignations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "resignationDate" DATE NOT NULL,
    "lastWorkingDay" DATE NOT NULL,
    "reason" TEXT,
    "exitInterview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actualLastDay" DATE,
    "clearanceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "expectedLastDay" DATE,
    "finalSettlement" DECIMAL(10,2),
    "noticePeriodDays" INTEGER,
    "settlementPaid" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_resignations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workDays" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "annualLeaveDefault" INTEGER NOT NULL DEFAULT 21,
    "sickLeaveDefault" INTEGER NOT NULL DEFAULT 15,
    "carryOverLimit" INTEGER NOT NULL DEFAULT 5,
    "maxAdvancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "maxActiveAdvances" INTEGER NOT NULL DEFAULT 1,
    "minMonthsForAdvance" INTEGER NOT NULL DEFAULT 3,
    "advanceRepaymentMonths" INTEGER NOT NULL DEFAULT 6,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "requireClearance" BOOLEAN NOT NULL DEFAULT true,
    "clearanceItems" TEXT,
    "monthlyLateLimit" INTEGER NOT NULL DEFAULT 3,
    "lateGracePeriod" INTEGER NOT NULL DEFAULT 15,
    "earlyLeaveGracePeriod" INTEGER NOT NULL DEFAULT 15,
    "lateWarningThreshold" INTEGER NOT NULL DEFAULT 3,
    "lateWarningLevels" TEXT,
    "autoDeductionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 60,
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
    "maxDailyDeductionDays" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "earlyCheckoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "earlyCheckoutThresholdMinutes" INTEGER NOT NULL DEFAULT 0,
    "firstViolationMultiplier" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "secondViolationMultiplier" DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    "thirdViolationMultiplier" DECIMAL(3,1) NOT NULL DEFAULT 3.0,
    "notifyAtPercentage" INTEGER NOT NULL DEFAULT 75,
    "notifyOnDeduction" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnGraceReset" BOOLEAN NOT NULL DEFAULT true,
    "deductionCalculationMethod" TEXT NOT NULL DEFAULT 'minute',
    "workingDaysPerMonth" INTEGER NOT NULL DEFAULT 22,
    "workingHoursPerDay" INTEGER NOT NULL DEFAULT 8,
    "requireDeductionReview" BOOLEAN NOT NULL DEFAULT true,
    "absencePenaltyRate" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "deductAbsenceInCurrentMonth" BOOLEAN NOT NULL DEFAULT true,
    "delayPenaltyTiers" TEXT,
    "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "officeLatitude" DECIMAL(10,8),
    "officeLongitude" DECIMAL(11,8),
    "geofenceRadius" INTEGER DEFAULT 200,
    "payrollDay" INTEGER NOT NULL DEFAULT 25,
    "overtimeMinHours" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "overtimeRate" DECIMAL(3,2) NOT NULL DEFAULT 1.50,
    "socialInsuranceRate" DECIMAL(5,2) NOT NULL DEFAULT 14.00,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "taxBrackets" TEXT,
    "publicHolidays" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_advance_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "repaymentType" TEXT NOT NULL,
    "installmentsCount" INTEGER NOT NULL DEFAULT 1,
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "employeeSalary" DECIMAL(10,2),
    "maxAllowedAmount" DECIMAL(10,2),
    "installmentAmount" DECIMAL(10,2),
    "remainingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isPaidOff" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeRelId" TEXT,

    CONSTRAINT "hr_advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_clearance_checklists" (
    "id" TEXT NOT NULL,
    "resignationId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_clearance_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_late_warnings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "warningLevel" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "employeeRelId" TEXT,

    CONSTRAINT "hr_late_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_kudos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_kudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_lateness_balances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalLateMinutes" INTEGER NOT NULL DEFAULT 0,
    "graceMinutesUsed" INTEGER NOT NULL DEFAULT 0,
    "deductedMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalDeductionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_lateness_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_manual_deductions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "hr_manual_deductions_type" NOT NULL DEFAULT 'OTHER',
    "category" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "effectiveMonth" INTEGER NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "status" "hr_manual_deductions_status" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "appliedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "payrollId" TEXT,
    "attachments" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_manual_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_promotions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromPositionId" TEXT,
    "toPositionId" TEXT NOT NULL,
    "fromPositionName" TEXT,
    "toPositionName" TEXT NOT NULL,
    "fromSalary" DECIMAL(12,2),
    "toSalary" DECIMAL(12,2),
    "promotionDate" DATE NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "hr_promotions_status" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "hr_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_reward_eligibility_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardTypeId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "isEligible" BOOLEAN NOT NULL,
    "eligibilityDetails" TEXT,
    "conditionsChecked" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_reward_eligibility_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_reward_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardTypeId" TEXT,
    "rewardName" TEXT NOT NULL,
    "rewardCategory" "hr_reward_records_rewardCategory" NOT NULL,
    "calculatedValue" DECIMAL(12,2) NOT NULL,
    "calculationDetails" TEXT,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "appliedMonth" INTEGER NOT NULL,
    "appliedYear" INTEGER NOT NULL,
    "reason" TEXT,
    "eligibilityMet" TEXT,
    "status" "hr_reward_records_status" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "payrollId" TEXT,
    "isIncludedInPayroll" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_reward_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_reward_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "allowRewardDeductionOffset" BOOLEAN NOT NULL DEFAULT false,
    "applyRewardsBeforeTax" BOOLEAN NOT NULL DEFAULT true,
    "autoEvaluationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "evaluationDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireHRApproval" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmployeeOnReward" BOOLEAN NOT NULL DEFAULT true,
    "notifyManagerOnReward" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_reward_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_reward_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "category" "hr_reward_types_category" NOT NULL,
    "calculationMethod" "hr_reward_types_calculationMethod" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "maxCap" DECIMAL(12,2),
    "eligibilityConditions" TEXT,
    "triggerType" "hr_reward_types_triggerType" NOT NULL,
    "frequency" "hr_reward_types_frequency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_reward_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lateness_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workStartTime" TEXT NOT NULL DEFAULT '10:00',
    "latestAllowedTime" TEXT NOT NULL DEFAULT '10:10',
    "monthlyAllowanceMinutes" INTEGER NOT NULL DEFAULT 60,
    "allowanceResetDay" INTEGER NOT NULL DEFAULT 5,
    "autoApplyDeductions" BOOLEAN NOT NULL DEFAULT true,
    "autoResetAllowances" BOOLEAN NOT NULL DEFAULT true,
    "violationDeductionType" TEXT NOT NULL DEFAULT 'FINANCIAL',
    "violationFinancialAmount" DECIMAL(10,2),
    "violationTimeMinutes" INTEGER,
    "violationWarningLevel" INTEGER,
    "allowanceExceededDeductionType" TEXT NOT NULL DEFAULT 'FINANCIAL',
    "allowanceExceededFinancialAmount" DECIMAL(10,2),
    "allowanceExceededTimeMinutes" INTEGER,
    "allowanceExceededWarningLevel" INTEGER,
    "missingAttendanceDeductionType" TEXT NOT NULL DEFAULT 'FINANCIAL',
    "missingAttendanceFinancialAmount" DECIMAL(10,2),
    "missingAttendanceTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lateness_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lateness_allowances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalAllowanceMinutes" INTEGER NOT NULL DEFAULT 60,
    "usedMinutes" INTEGER NOT NULL DEFAULT 0,
    "remainingMinutes" INTEGER NOT NULL DEFAULT 60,
    "resetDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lateness_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lateness_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "expectedStartTime" TIMESTAMP(3) NOT NULL,
    "latestAllowedTime" TIMESTAMP(3) NOT NULL,
    "latenessMinutes" INTEGER NOT NULL DEFAULT 0,
    "latenessCategory" TEXT NOT NULL DEFAULT 'ON_TIME',
    "allowanceUsedMinutes" INTEGER NOT NULL DEFAULT 0,
    "allowanceRemainingBefore" INTEGER NOT NULL DEFAULT 0,
    "allowanceRemainingAfter" INTEGER NOT NULL DEFAULT 0,
    "excessMinutes" INTEGER NOT NULL DEFAULT 0,
    "isViolation" BOOLEAN NOT NULL DEFAULT false,
    "violationReason" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "deductionApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lateness_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lateness_deductions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latenessRecordId" TEXT,
    "deductionType" TEXT NOT NULL DEFAULT 'FINANCIAL',
    "deductionReason" TEXT NOT NULL,
    "violationDate" DATE NOT NULL,
    "violationDescription" TEXT,
    "latenessMinutes" INTEGER,
    "financialAmount" DECIMAL(10,2),
    "timeDeductionMinutes" INTEGER,
    "timeDeductionHours" DECIMAL(5,2),
    "warningLevel" INTEGER,
    "warningMessage" TEXT,
    "isAppliedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "payrollId" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lateness_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lateness_monthly_summaries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalAllowanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "usedAllowanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "remainingAllowanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalLateDays" INTEGER NOT NULL DEFAULT 0,
    "totalLatenessMinutes" INTEGER NOT NULL DEFAULT 0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "violationDays" INTEGER NOT NULL DEFAULT 0,
    "totalFinancialDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalTimeDeductions" INTEGER NOT NULL DEFAULT 0,
    "totalWarnings" INTEGER NOT NULL DEFAULT 0,
    "totalWorkDays" INTEGER NOT NULL DEFAULT 0,
    "presentDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lateness_monthly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_company_policies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_company_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_connections" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "allowProductPull" BOOLEAN NOT NULL DEFAULT false,
    "allowOrderPull" BOOLEAN NOT NULL DEFAULT false,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_connection_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_in_stock_notifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySMS" BOOLEAN NOT NULL DEFAULT false,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "back_in_stock_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "type" "stock_alerts_type" NOT NULL,
    "priority" "stock_alerts_priority" NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "currentStock" INTEGER,
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "stock_movements_type" NOT NULL,
    "reason" "stock_movements_reason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost" DECIMAL(10,2),
    "reference" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'main',
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncDirection" TEXT NOT NULL DEFAULT 'both',
    "syncInterval" INTEGER NOT NULL DEFAULT 15,
    "webhookSecret" TEXT,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookOrderCreated" TEXT,
    "webhookOrderUpdated" TEXT,
    "statusMapping" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT DEFAULT 'never',
    "lastSyncMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woocommerce_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_sync_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "syncDirection" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "triggeredBy" TEXT,
    "metadata" TEXT,

    CONSTRAINT "woocommerce_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_items" (
    "id" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "purchase_invoices_status" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "notes" TEXT,
    "attachments" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "receivedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "status" "purchase_orders_status" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentTerms" TEXT,
    "notes" TEXT,
    "attachments" TEXT,
    "receivedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "supplier_payments_paymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "bankName" TEXT,
    "checkNumber" TEXT,
    "checkDate" TIMESTAMP(3),
    "notes" TEXT,
    "attachments" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Egypt',
    "taxNumber" TEXT,
    "commercialRegister" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL(12,2),
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "rating" INTEGER DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "tags" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "includeImages" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "autoResend" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "messengerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultSendTime" TEXT NOT NULL DEFAULT '10:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "maxRecipientsPerCampaign" INTEGER NOT NULL DEFAULT 5000,
    "maxCampaignsPerDay" INTEGER NOT NULL DEFAULT 10,
    "enableDeliveryReports" BOOLEAN NOT NULL DEFAULT true,
    "enableOpenTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableClickTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableUnsubscribeTracking" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCampaignSent" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnHighUnsubscribeRate" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnLowDeliveryRate" BOOLEAN NOT NULL DEFAULT true,
    "adminEmail" TEXT,
    "requireApprovalForHighVolume" BOOLEAN NOT NULL DEFAULT false,
    "highVolumeThreshold" INTEGER NOT NULL DEFAULT 1000,
    "enableContentFiltering" BOOLEAN NOT NULL DEFAULT false,
    "blockedWords" TEXT,
    "messagesPerMinute" INTEGER NOT NULL DEFAULT 60,
    "messagesPerHour" INTEGER NOT NULL DEFAULT 1000,
    "messagesPerDay" INTEGER NOT NULL DEFAULT 10000,
    "defaultFooter" TEXT,
    "unsubscribeText" TEXT NOT NULL DEFAULT 'للإلغاء اكتب STOP',
    "companyName" TEXT,
    "companyAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ad_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT,
    "accessToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ad_insights" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "frequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,
    "costPerLinkClick" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "landingPageViews" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "purchaseValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facebook_ad_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ad_test_variants" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variantType" TEXT NOT NULL,
    "variantData" TEXT NOT NULL,
    "adSetId" TEXT,
    "adId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "pValue" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ad_test_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ad_tests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "testType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "campaignId" TEXT,
    "variants" TEXT NOT NULL,
    "winnerVariantId" TEXT,
    "confidenceLevel" DOUBLE PRECISION,
    "testDuration" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "trafficSplit" INTEGER NOT NULL DEFAULT 50,
    "minimumResults" INTEGER NOT NULL DEFAULT 100,
    "autoPromote" BOOLEAN NOT NULL DEFAULT false,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ad_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ads" (
    "id" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "facebookAdId" TEXT,
    "creativeType" TEXT NOT NULL,
    "primaryText" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT,
    "callToAction" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "imageHash" TEXT,
    "videoId" TEXT,
    "carouselImages" TEXT,
    "carouselCount" INTEGER DEFAULT 1,
    "linkUrl" TEXT,
    "productId" TEXT,
    "creative" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_adsets" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "facebookAdSetId" TEXT,
    "targeting" TEXT,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "genders" TEXT,
    "locations" TEXT,
    "interests" TEXT,
    "behaviors" TEXT,
    "customAudiencesJson" TEXT,
    "lookalikeAudiencesJson" TEXT,
    "budgetType" TEXT NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "optimizationGoal" TEXT,
    "billingEvent" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_adsets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_campaigns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "facebookCampaignId" TEXT,
    "budgetType" TEXT NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "pixelId" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_catalog_products" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "availability" TEXT NOT NULL DEFAULT 'in stock',
    "inventory" INTEGER,
    "imageUrl" TEXT,
    "imageHash" TEXT,
    "additionalImages" TEXT,
    "linkUrl" TEXT,
    "mobileLinkUrl" TEXT,
    "facebookProductId" TEXT,
    "facebookRetailerId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_comments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT,
    "createdTime" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "pageId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFiltered" BOOLEAN NOT NULL DEFAULT false,
    "filterReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_custom_audiences" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audienceType" TEXT NOT NULL,
    "facebookAudienceId" TEXT,
    "customerListId" TEXT,
    "matchRate" DOUBLE PRECISION,
    "pixelId" TEXT,
    "eventType" TEXT,
    "retentionDays" INTEGER DEFAULT 30,
    "engagementType" TEXT,
    "videoId" TEXT,
    "videoViewDuration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "audienceSize" INTEGER,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_custom_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_dynamic_ads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "adSetId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "facebookAdId" TEXT,
    "productSetId" TEXT,
    "templateUrl" TEXT,
    "templateId" TEXT,
    "collectionId" TEXT,
    "categoryId" TEXT,
    "headline" TEXT,
    "description" TEXT,
    "callToAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_dynamic_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_lookalike_audiences" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "sourceAudienceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "facebookAudienceId" TEXT,
    "lookalikeSpec" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "ratio" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "audienceSize" INTEGER,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "facebook_lookalike_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_pages" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageAccessToken" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),
    "negativeKeywords" TEXT,
    "autoFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "negativeCommentAction" TEXT DEFAULT 'hide',

    CONSTRAINT "facebook_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_pixel_configs" (
    "id" TEXT NOT NULL,
    "storefrontSettingsId" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "pixelName" TEXT NOT NULL,
    "accessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "trackPageView" BOOLEAN NOT NULL DEFAULT true,
    "trackViewContent" BOOLEAN NOT NULL DEFAULT true,
    "trackAddToCart" BOOLEAN NOT NULL DEFAULT true,
    "trackInitiateCheckout" BOOLEAN NOT NULL DEFAULT true,
    "trackPurchase" BOOLEAN NOT NULL DEFAULT true,
    "trackSearch" BOOLEAN NOT NULL DEFAULT true,
    "trackAddToWishlist" BOOLEAN NOT NULL DEFAULT false,
    "trackLead" BOOLEAN NOT NULL DEFAULT false,
    "trackCompleteRegistration" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" TIMESTAMP(3),
    "lastTestResult" TEXT DEFAULT 'not_tested',
    "lastEventSentAt" TIMESTAMP(3),
    "totalEventsSent" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "tokenStatus" TEXT DEFAULT 'unknown',
    "tokenExpiresAt" TIMESTAMP(3),
    "eventMatchQuality" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_pixel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_product_catalogs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "facebookCatalogId" TEXT,
    "catalogType" TEXT NOT NULL DEFAULT 'PRODUCTS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "syncedProducts" INTEGER NOT NULL DEFAULT 0,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_product_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_product_feeds" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "facebookFeedId" TEXT,
    "feedUrl" TEXT,
    "schedule" TEXT,
    "lastUploadedAt" TIMESTAMP(3),
    "nextUploadAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "uploadStatus" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_product_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notification_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "sessionId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientType" "whatsapp_notification_logs_recipientType" NOT NULL DEFAULT 'CUSTOMER',
    "category" "whatsapp_notification_logs_category" NOT NULL,
    "eventType" "whatsapp_notification_logs_eventType" NOT NULL,
    "content" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "productId" TEXT,
    "employeeId" TEXT,
    "cartId" TEXT,
    "status" "whatsapp_notification_logs_status" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(3),
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),
    "whatsappMessageId" TEXT,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notification_queue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "sessionId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientType" "whatsapp_notification_queue_recipientType" NOT NULL DEFAULT 'CUSTOMER',
    "category" "whatsapp_notification_queue_category" NOT NULL,
    "eventType" "whatsapp_notification_queue_eventType" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "buttons" TEXT,
    "orderId" TEXT,
    "customerId" TEXT,
    "productId" TEXT,
    "employeeId" TEXT,
    "cartId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "status" "whatsapp_notification_queue_status" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notification_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultSessionId" TEXT,
    "stickySessionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderCreatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderConfirmedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderProcessingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderShippedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderDeliveredEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderCancelledEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminderHours" INTEGER NOT NULL DEFAULT 24,
    "productNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backInStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceDropEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newProductEnabled" BOOLEAN NOT NULL DEFAULT false,
    "abandonedCartEnabled" BOOLEAN NOT NULL DEFAULT true,
    "abandonedCartFirstReminder" INTEGER NOT NULL DEFAULT 1,
    "abandonedCartSecondReminder" INTEGER NOT NULL DEFAULT 24,
    "abandonedCartThirdReminder" INTEGER NOT NULL DEFAULT 72,
    "abandonedCartDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "abandonedCartDiscountPercent" INTEGER NOT NULL DEFAULT 10,
    "marketingNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "promotionalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "couponEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthdayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hrNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceConfirmedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "checkoutConfirmedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leaveApprovalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "permissionApprovalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "manualDeductionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payrollEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthdayWishEnabled" BOOLEAN NOT NULL DEFAULT false,
    "warningNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "orderReturnedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderRefundedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentConfirmedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentFailedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "productReviewRequestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "birthdayGreetingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "draftEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pendingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingCustomerInfoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingVerificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingApprovalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quoteSentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quoteApprovedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pendingPaymentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentInitiatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentProcessingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentAuthorizedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentCapturedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentPartiallyCapturedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentDeclinedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentExpiredEnabled" BOOLEAN NOT NULL DEFAULT true,
    "partialRefundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chargebackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chargebackResolvedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codPendingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codConfirmedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "underReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backorderedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preOrderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allocatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pickingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qualityCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "packedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "labelCreatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "readyForPickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "readyToShipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancelRequestedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancellationUnderReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancelledByCustomerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancelledByAdminEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancelledBySystemEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderExpiredEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnRequestedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnUnderReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnApprovedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnRejectedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnPickupScheduledEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnInTransitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnReceivedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnInspectedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "refundProcessingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangeRequestedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangeApprovedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangeShippedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangeCompletedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fraudSuspectedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "blacklistedCustomerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "manualReviewRequiredEnabled" BOOLEAN NOT NULL DEFAULT true,
    "splitShipmentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mergedOrderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "duplicateOrderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "onHoldEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "disputedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingDocumentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shipmentCreatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inTransitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "atSortingFacilityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "atLocalHubEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customsClearanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customsHoldEnabled" BOOLEAN NOT NULL DEFAULT true,
    "outForDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryAttemptedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFailedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rescheduledDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awaitingPickupBranchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "partiallyDeliveredEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lostInTransitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "damagedInTransitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnedToSenderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notification_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "whatsapp_notification_templates_category" NOT NULL,
    "eventType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentWithMedia" BOOLEAN NOT NULL DEFAULT false,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "hasButtons" BOOLEAN NOT NULL DEFAULT false,
    "buttons" TEXT,
    "hasList" BOOLEAN NOT NULL DEFAULT false,
    "listData" TEXT,
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "productId" TEXT,
    "orderId" TEXT,
    "value" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_apps" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo" TEXT,
    "images" JSONB,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2) NOT NULL,
    "pricingModel" "pricing_model" NOT NULL DEFAULT 'SUBSCRIPTION',
    "unitPrice" DECIMAL(10,2),
    "unitName" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "requiredApps" JSONB,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mainRoute" TEXT,
    "adminRoute" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "engineCompatibility" TEXT,
    "icon" TEXT,

    CONSTRAINT "marketplace_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_apps" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "activePricingModel" "pricing_model" NOT NULL DEFAULT 'SUBSCRIPTION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "settings" JSONB,
    "nextBillingAt" TIMESTAMP(3),
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_usage_logs" (
    "id" TEXT NOT NULL,
    "companyAppId" TEXT NOT NULL,
    "feature" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_reviews" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_pricing_rules" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_bundles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT NOT NULL,
    "appIds" JSONB NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2),
    "discount" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_wallets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDeposited" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "features" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_gallery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "analysis" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_gallery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "text_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_studio_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "basicImagesCount" INTEGER NOT NULL DEFAULT 0,
    "proImagesCount" INTEGER NOT NULL DEFAULT 0,
    "totalImagesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_studio_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_studio_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_studio_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "subject" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageIsFromCustomer" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_memory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "intent" TEXT,
    "sentiment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "conversation_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_outcomes" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "outcomeValue" DOUBLE PRECISION,
    "responseQuality" DOUBLE PRECISION,
    "customerSatisfaction" DOUBLE PRECISION,
    "conversionTime" INTEGER,
    "messageCount" INTEGER,
    "aiResponseCount" INTEGER,
    "humanHandoff" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "metadata" TEXT,
    "isFromCustomer" BOOLEAN NOT NULL DEFAULT true,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_message_stats" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "facebookPageId" TEXT,
    "recipientFacebookId" TEXT NOT NULL,
    "recipientCustomerId" TEXT,
    "messageId" TEXT NOT NULL,
    "messageContent" TEXT,
    "messageType" TEXT,
    "messageStatus" TEXT NOT NULL,
    "ignoredReason" TEXT,
    "conversationId" TEXT,
    "conversationStatus" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3),
    "conversationCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sent_message_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "pushName" TEXT,
    "profilePicUrl" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "category" TEXT DEFAULT 'LEAD',
    "tags" TEXT,
    "notes" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_event_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaMimeType" TEXT,
    "mediaSize" INTEGER,
    "mediaFileName" TEXT,
    "quotedMessageId" TEXT,
    "quotedContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "isAIResponse" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "interactiveData" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT,
    "participant" TEXT,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_quick_replies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortcut" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" "whatsapp_sessions_status" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastDisconnectedAt" TIMESTAMP(3),
    "authState" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoReply" BOOLEAN NOT NULL DEFAULT false,
    "aiMode" TEXT NOT NULL DEFAULT 'suggest',
    "welcomeMessage" TEXT,
    "awayMessage" TEXT,
    "workingHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workingHours" TEXT,
    "loadBalanceWeight" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileName" TEXT,
    "profilePictureUrl" TEXT,
    "profileStatus" TEXT,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxSessions" INTEGER NOT NULL DEFAULT 3,
    "notificationSound" BOOLEAN NOT NULL DEFAULT true,
    "browserNotifications" BOOLEAN NOT NULL DEFAULT true,
    "defaultAIMode" TEXT NOT NULL DEFAULT 'suggest',
    "aiWelcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiAwayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxImageSize" INTEGER NOT NULL DEFAULT 16,
    "maxVideoSize" INTEGER NOT NULL DEFAULT 64,
    "maxDocumentSize" INTEGER NOT NULL DEFAULT 100,
    "autoCompressImages" BOOLEAN NOT NULL DEFAULT true,
    "autoArchiveDays" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_statuses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaMimeType" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excluded_models" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "keyId" TEXT,
    "companyId" TEXT,
    "reason" TEXT NOT NULL,
    "excludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryAt" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excluded_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tracking" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "firstVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recently_viewed" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recently_viewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_effectiveness" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "messageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "customerReaction" TEXT,
    "effectivenessScore" DOUBLE PRECISION NOT NULL,
    "leadToPurchase" BOOLEAN NOT NULL DEFAULT false,
    "responseTime" INTEGER,
    "wordCount" INTEGER,
    "sentimentScore" DOUBLE PRECISION,
    "keywords" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_effectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skipped_facebook_pages" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attemptedCompanyId" TEXT NOT NULL,
    "connectedToCompanyId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skipped_facebook_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_numbers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "embedding" TEXT,
    "embeddingGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_performance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "errorOccurred" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_rate_limits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'search',
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "wallet_transactions_type" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "appointmentDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'consultation',
    "location" TEXT,
    "meetingLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_notification_preferences" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "attendanceReminder" BOOLEAN NOT NULL DEFAULT true,
    "leaveUpdates" BOOLEAN NOT NULL DEFAULT true,
    "payrollNotice" BOOLEAN NOT NULL DEFAULT true,
    "birthdayWish" BOOLEAN NOT NULL DEFAULT true,
    "announcements" BOOLEAN NOT NULL DEFAULT true,
    "isOptedIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_visits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "pagesViewed" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "store_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_member_badges" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_member_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_metrics" (
    "id" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 0,
    "waiting" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "delayed" INTEGER NOT NULL DEFAULT 0,
    "paused" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_workflow_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enforceTransitions" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalByDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_workflow_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_definitions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "lockAfterEntry" BOOLEAN NOT NULL DEFAULT false,
    "requiresApprovalToExit" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_workflow_transitions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "allowedRoles" TEXT NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowOverride" BOOLEAN NOT NULL DEFAULT true,
    "restrictBackward" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_change_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_workflow_audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_workflow_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "workingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deliveryTime" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_carts" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "finalTotal" DECIMAL(10,2) NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "affiliateId" TEXT,
    "turboLabelUrl" TEXT,
    "turboMetadata" TEXT,
    "turboShipmentId" TEXT,
    "turboShipmentStatus" TEXT,
    "turboTrackingNumber" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "guest_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "companyId" TEXT NOT NULL,
    "status" "invoices_status" NOT NULL DEFAULT 'DRAFT',
    "type" "invoices_type" NOT NULL DEFAULT 'SUBSCRIPTION',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "notes" TEXT,
    "paymentTerms" TEXT DEFAULT 'Net 30',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "productName" TEXT,
    "productColor" TEXT,
    "productSize" TEXT,
    "productSku" TEXT,
    "metadata" TEXT,
    "variantId" TEXT,
    "extractionSource" TEXT DEFAULT 'ai',
    "confidence" DOUBLE PRECISION,
    "productImage" TEXT,
    "productDetails" TEXT,
    "basePrice" DECIMAL(10,2),
    "merchantPrice" DECIMAL(10,2),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "orderId" TEXT,
    "guestOrderId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "statusType" TEXT NOT NULL DEFAULT 'order',
    "source" TEXT NOT NULL DEFAULT 'system',
    "isSystemStatus" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mapsToSystem" TEXT,
    "wooCommerceStatus" TEXT,
    "allowedNextStatuses" TEXT,
    "autoActions" TEXT,
    "notifyCustomer" BOOLEAN NOT NULL DEFAULT false,
    "notifyAdmin" BOOLEAN NOT NULL DEFAULT false,
    "emailTemplate" TEXT,
    "smsTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" "payment_status" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "notes" TEXT,
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "city" TEXT,
    "governorate" TEXT,
    "customerAddress" TEXT,
    "dataQuality" TEXT,
    "extractionMethod" TEXT DEFAULT 'ai_enhanced',
    "confidence" DOUBLE PRECISION,
    "validationStatus" TEXT DEFAULT 'pending',
    "sourceType" TEXT DEFAULT 'ai_conversation',
    "extractionTimestamp" TIMESTAMP(3),
    "metadata" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "syncedFromWoo" BOOLEAN NOT NULL DEFAULT false,
    "syncedToWoo" BOOLEAN NOT NULL DEFAULT false,
    "wooCommerceDateCreated" TIMESTAMP(3),
    "wooCommerceId" TEXT,
    "wooCommerceOrderKey" TEXT,
    "wooCommerceStatus" TEXT,
    "wooCommerceUrl" TEXT,
    "turboBranchId" TEXT,
    "turboLabelUrl" TEXT,
    "turboMetadata" TEXT,
    "turboShipmentId" TEXT,
    "turboShipmentStatus" TEXT,
    "turboTrackingNumber" TEXT,
    "callAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastCallAttemptAt" TIMESTAMP(3),
    "scheduledDeliveryDate" TIMESTAMP(3),
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledNotes" TEXT,
    "autoTransitionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduledTransitionedAt" TIMESTAMP(3),
    "affiliateReferralId" TEXT,
    "affiliateId" TEXT,
    "merchantOrderId" TEXT,
    "isDropshipped" BOOLEAN NOT NULL DEFAULT false,
    "orderSource" "OrderSource" NOT NULL DEFAULT 'REGULAR',
    "externalId" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "userRelId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "walletNumberId" TEXT NOT NULL,
    "receiptImage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "invoiceId" TEXT,
    "subscriptionId" TEXT,
    "companyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "payments_status" NOT NULL DEFAULT 'PENDING',
    "method" "payments_method" NOT NULL DEFAULT 'BANK_TRANSFER',
    "gateway" TEXT,
    "gatewayPaymentId" TEXT,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "governorates" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "deliveryTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveryTimeType" TEXT NOT NULL DEFAULT 'custom',
    "freeShippingThreshold" DECIMAL(10,2),
    "name" TEXT NOT NULL DEFAULT '',
    "pricingTiers" TEXT,
    "pricingType" TEXT NOT NULL DEFAULT 'flat',

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "status" TEXT NOT NULL,
    "oldStatus" TEXT,
    "changedBy" TEXT,
    "userName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guestOrderId" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_invoice_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerateOnStatus" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'INV-YYYYMMDD-XXXXXX',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "defaultTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 7,
    "showCompanyLogo" BOOLEAN NOT NULL DEFAULT true,
    "showTaxBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "showPaymentMethod" BOOLEAN NOT NULL DEFAULT true,
    "showOrderItems" BOOLEAN NOT NULL DEFAULT true,
    "autoEmailToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "pdfPageSize" TEXT NOT NULL DEFAULT 'A4',
    "pdfOrientation" TEXT NOT NULL DEFAULT 'portrait',
    "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#6B7280',
    "fontFamily" TEXT NOT NULL DEFAULT 'Arial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enableSequentialOrders" BOOLEAN NOT NULL DEFAULT false,
    "nextOrderNumber" INTEGER NOT NULL DEFAULT 1,
    "orderNumberFormat" TEXT NOT NULL DEFAULT 'PREFIX-XXXXXX',
    "orderPrefix" TEXT NOT NULL DEFAULT 'ORD',

    CONSTRAINT "order_invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "city" TEXT,
    "governorate" TEXT,
    "companyName" TEXT NOT NULL,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "companyAddress" TEXT,
    "companyLogo" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "terms" TEXT,
    "generatedBy" TEXT,
    "printedAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "emailedAt" TIMESTAMP(3),
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_partners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerCode" TEXT NOT NULL,
    "companyName" TEXT,
    "title" "partner_titles" NOT NULL DEFAULT 'PARTNER',
    "maxAllowedDepth" INTEGER NOT NULL DEFAULT 1,
    "status" "platform_partner_status" NOT NULL DEFAULT 'PENDING',
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "paidEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "pendingEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalCompanies" INTEGER NOT NULL DEFAULT 0,
    "totalSubPartners" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "partner_payout_methods",
    "paymentDetails" TEXT,
    "parentPartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_referred_companies" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partner_referred_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "billingHistoryId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "status" "partner_commission_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_payouts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "partner_payout_status" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "partner_payout_methods" NOT NULL,
    "paymentDetails" TEXT,
    "transactionId" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_partner_settings" (
    "id" TEXT NOT NULL,
    "level1Rate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "level2Rate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "level3Rate" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "level4Rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minimumPayoutAmount" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "termsAndConditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_partner_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "facebookId" TEXT,
    "whatsappId" TEXT,
    "telegramId" TEXT,
    "status" "customers_status" NOT NULL DEFAULT 'LEAD',
    "tags" TEXT,
    "notes" TEXT,
    "metadata" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerRating" "customers_customerRating" NOT NULL DEFAULT 'UNKNOWN',
    "successScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalOrdersCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_customers_on_page" (
    "id" TEXT NOT NULL,
    "facebookPageId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "facebookId" TEXT NOT NULL,
    "blockedBy" TEXT,
    "reason" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "blocked_customers_on_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayType" TEXT NOT NULL DEFAULT 'default',
    "metaDescription" TEXT,
    "metaTitle" TEXT,
    "slug" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "orderAmount" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "coupons_type" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userUsageLimit" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customerSegments" TEXT,
    "metadata" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'color',
    "sku" TEXT,
    "price" DECIMAL(10,2),
    "comparePrice" DECIMAL(10,2),
    "cost" DECIMAL(10,2),
    "images" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "cost" DECIMAL(10,2),
    "images" TEXT,
    "mainImage" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(8,2),
    "dimensions" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "metadata" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "barcode" TEXT,
    "easyOrdersId" TEXT,
    "easyOrdersUrl" TEXT,
    "source" TEXT DEFAULT 'manual',
    "externalId" TEXT,
    "wooCommerceId" TEXT,
    "wooCommerceUrl" TEXT,
    "hasPromotedAd" BOOLEAN NOT NULL DEFAULT false,
    "enableCheckoutForm" BOOLEAN NOT NULL DEFAULT true,
    "showAddToCartButton" BOOLEAN NOT NULL DEFAULT true,
    "saleStartDate" TIMESTAMP(3),
    "saleEndDate" TIMESTAMP(3),
    "sizeGuide" TEXT,
    "isPreOrder" BOOLEAN NOT NULL DEFAULT false,
    "preOrderDate" TIMESTAMP(3),
    "preOrderMessage" TEXT,
    "embedding" TEXT,
    "embeddingGeneratedAt" TIMESTAMP(3),
    "slug" TEXT,
    "isDropshipped" BOOLEAN NOT NULL DEFAULT false,
    "merchantProductId" TEXT,
    "basePrice" DECIMAL(10,2),
    "allowAffiliateMarkup" BOOLEAN NOT NULL DEFAULT false,
    "affiliateCommission" DECIMAL(10,2),
    "commissionType" TEXT DEFAULT 'PERCENTAGE',
    "showFakeStock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_wallets" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty_programs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "type" "customer_loyalty_programs_type" NOT NULL DEFAULT 'POINTS',
    "status" "customer_loyalty_programs_status" NOT NULL DEFAULT 'DRAFT',
    "pointsPerPurchase" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "pointsPerReferral" DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    "pointsPerAmount" DECIMAL(10,2),
    "redemptionRate" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "minimumPoints" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "maxPointsPerTransaction" DECIMAL(10,2),
    "expiryMonths" INTEGER NOT NULL DEFAULT 12,
    "rules" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "tierId" TEXT,
    "currentPoints" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalRedeemed" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" "customer_loyalty_records_status" NOT NULL DEFAULT 'ACTIVE',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPointsEarned" TIMESTAMP(3),
    "lastPointsRedeemed" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty_tiers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "minPoints" DECIMAL(10,2) NOT NULL,
    "maxPoints" DECIMAL(10,2),
    "benefits" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'crown',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notification_preferences" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT false,
    "backInStock" BOOLEAN NOT NULL DEFAULT true,
    "priceDrops" BOOLEAN NOT NULL DEFAULT true,
    "abandonedCart" BOOLEAN NOT NULL DEFAULT true,
    "isOptedIn" BOOLEAN NOT NULL DEFAULT true,
    "optedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_orders" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "merchantOrderId" TEXT,
    "status" "merchant_orders_status" NOT NULL DEFAULT 'PENDING',
    "items" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "shippingAddress" TEXT,
    "trackingNumber" TEXT,
    "syncedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_products" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "merchantSku" TEXT,
    "merchantPrice" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "autoFulfill" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "webhookUrl" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_visits" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "source" TEXT,
    "addedToCart" BOOLEAN NOT NULL DEFAULT false,
    "purchased" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_reason_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultRole" "return_reason_categories_defaultRole" NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "return_reason_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_methods" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'flat_rate',
    "title" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_job_postings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'FULL_TIME',
    "experienceLevel" TEXT,
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closingDate" TIMESTAMP(3),
    "postedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_applicants" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "coverLetter" TEXT,
    "experience" INTEGER,
    "education" TEXT,
    "skills" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "rating" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_interviews" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "location" TEXT,
    "interviewers" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_reasons" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "return_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reasonId" TEXT NOT NULL,
    "status" "return_requests_status" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "customerNotes" TEXT,
    "refundAmount" DECIMAL(10,2),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "orderItemId" TEXT,
    "rejectionReason" TEXT,
    "responsibleParty" "return_requests_responsibleParty" NOT NULL DEFAULT 'OTHER',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_contact_attempts" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_activity_logs" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_attempt_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_attempt_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_message_daily_summaries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "facebookPageId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalSaved" INTEGER NOT NULL DEFAULT 0,
    "totalIgnored" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "conversationsCreated" INTEGER NOT NULL DEFAULT 0,
    "conversationsExisted" INTEGER NOT NULL DEFAULT 0,
    "uniqueReach" INTEGER NOT NULL DEFAULT 0,
    "savedReach" INTEGER NOT NULL DEFAULT 0,
    "ignoredReach" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sent_message_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_form_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "showGuestName" BOOLEAN NOT NULL DEFAULT true,
    "requireGuestName" BOOLEAN NOT NULL DEFAULT true,
    "showGuestPhone" BOOLEAN NOT NULL DEFAULT true,
    "requireGuestPhone" BOOLEAN NOT NULL DEFAULT true,
    "showGuestEmail" BOOLEAN NOT NULL DEFAULT true,
    "requireGuestEmail" BOOLEAN NOT NULL DEFAULT false,
    "showCity" BOOLEAN NOT NULL DEFAULT true,
    "requireCity" BOOLEAN NOT NULL DEFAULT true,
    "showShippingAddress" BOOLEAN NOT NULL DEFAULT true,
    "requireShippingAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPaymentMethod" BOOLEAN NOT NULL DEFAULT true,
    "showNotes" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_form_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "few_shot_examples" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "few_shot_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "few_shot_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "maxExamplesPerPrompt" INTEGER NOT NULL DEFAULT 3,
    "selectionStrategy" TEXT NOT NULL DEFAULT 'priority',
    "autoLearnFromGood" BOOLEAN NOT NULL DEFAULT false,
    "minQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "few_shot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "aboutStore" TEXT,
    "showAboutStore" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "showEmail" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "showQuickLinks" BOOLEAN NOT NULL DEFAULT true,
    "copyrightText" TEXT,
    "showCopyright" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "footer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_ai_configs" (
    "id" TEXT NOT NULL,
    "defaultProvider" "global_ai_configs_defaultProvider" NOT NULL DEFAULT 'GOOGLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enableFailover" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "global_ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "draftContent" JSONB,
    "publishedContent" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastPublishedAt" TIMESTAMP(3),
    "pageType" TEXT NOT NULL DEFAULT 'HOMEPAGE',
    "slug" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "showInMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "sourceSlug" TEXT,
    "sourceVersion" TEXT,
    "sourceChecksum" TEXT,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "previousContent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_response_settings" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "responseMethod" TEXT NOT NULL,
    "fixedMessengerMessage" TEXT,
    "aiPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commentMessages" TEXT,

    CONSTRAINT "page_response_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_configurations" (
    "id" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "features" TEXT NOT NULL,
    "description" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_response_settings" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "responseMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiPrompt" TEXT,
    "fixedMessengerMessage" TEXT,
    "commentMessages" TEXT,
    "featuredProductId" TEXT,

    CONSTRAINT "post_response_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_library" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "category" TEXT NOT NULL,
    "businessType" TEXT,
    "promptContent" TEXT NOT NULL,
    "responsePrompt" TEXT,
    "variables" TEXT,
    "tags" TEXT,
    "icon" TEXT,
    "previewImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_pages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "draftContent" JSONB,
    "publishedContent" JSONB,
    "pageType" "store_pages_pageType" NOT NULL DEFAULT 'CUSTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "showInMenu" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_promotion_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeShippingThreshold" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "freeShippingMessage" TEXT,
    "flatShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "flatShippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_promotion_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storefront_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quickViewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quickViewShowAddToCart" BOOLEAN NOT NULL DEFAULT true,
    "quickViewShowWishlist" BOOLEAN NOT NULL DEFAULT true,
    "comparisonEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxComparisonProducts" INTEGER NOT NULL DEFAULT 4,
    "comparisonShowPrice" BOOLEAN NOT NULL DEFAULT true,
    "comparisonShowSpecs" BOOLEAN NOT NULL DEFAULT true,
    "wishlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wishlistRequireLogin" BOOLEAN NOT NULL DEFAULT false,
    "wishlistMaxItems" INTEGER NOT NULL DEFAULT 100,
    "advancedFiltersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "filterByPrice" BOOLEAN NOT NULL DEFAULT true,
    "filterByRating" BOOLEAN NOT NULL DEFAULT true,
    "filterByBrand" BOOLEAN NOT NULL DEFAULT false,
    "filterByAttributes" BOOLEAN NOT NULL DEFAULT true,
    "reviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewsRequirePurchase" BOOLEAN NOT NULL DEFAULT false,
    "reviewsModerationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewsShowRating" BOOLEAN NOT NULL DEFAULT true,
    "minRatingToDisplay" INTEGER NOT NULL DEFAULT 1,
    "countdownEnabled" BOOLEAN NOT NULL DEFAULT true,
    "countdownShowOnProduct" BOOLEAN NOT NULL DEFAULT true,
    "countdownShowOnListing" BOOLEAN NOT NULL DEFAULT false,
    "backInStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backInStockNotifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "backInStockNotifySMS" BOOLEAN NOT NULL DEFAULT false,
    "recentlyViewedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recentlyViewedCount" INTEGER NOT NULL DEFAULT 8,
    "recentlyViewedDays" INTEGER NOT NULL DEFAULT 30,
    "templateFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "imageZoomEnabled" BOOLEAN NOT NULL DEFAULT true,
    "imageZoomType" TEXT NOT NULL DEFAULT 'hover',
    "productVideosEnabled" BOOLEAN NOT NULL DEFAULT true,
    "videoAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "videoShowControls" BOOLEAN NOT NULL DEFAULT true,
    "sizeGuideEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sizeGuideShowOnProduct" BOOLEAN NOT NULL DEFAULT true,
    "socialSharingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shareFacebook" BOOLEAN NOT NULL DEFAULT true,
    "shareTwitter" BOOLEAN NOT NULL DEFAULT true,
    "shareWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "shareTelegram" BOOLEAN NOT NULL DEFAULT true,
    "badgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "badgeNew" BOOLEAN NOT NULL DEFAULT true,
    "badgeBestSeller" BOOLEAN NOT NULL DEFAULT true,
    "badgeOnSale" BOOLEAN NOT NULL DEFAULT true,
    "badgeOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "tabsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tabDescription" BOOLEAN NOT NULL DEFAULT true,
    "tabSpecifications" BOOLEAN NOT NULL DEFAULT true,
    "tabReviews" BOOLEAN NOT NULL DEFAULT true,
    "tabShipping" BOOLEAN NOT NULL DEFAULT true,
    "stickyAddToCartEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "seoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seoMetaDescription" BOOLEAN NOT NULL DEFAULT true,
    "seoStructuredData" BOOLEAN NOT NULL DEFAULT true,
    "seoSitemap" BOOLEAN NOT NULL DEFAULT true,
    "seoOpenGraph" BOOLEAN NOT NULL DEFAULT true,
    "multiLanguageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
    "supportedLanguages" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "capiStatus" TEXT DEFAULT 'not_configured',
    "capiTrackAddToCart" BOOLEAN NOT NULL DEFAULT true,
    "capiTrackInitiateCheckout" BOOLEAN NOT NULL DEFAULT true,
    "capiTrackPageView" BOOLEAN NOT NULL DEFAULT true,
    "capiTrackPurchase" BOOLEAN NOT NULL DEFAULT true,
    "capiTrackSearch" BOOLEAN NOT NULL DEFAULT true,
    "capiTrackViewContent" BOOLEAN NOT NULL DEFAULT true,
    "eventDeduplicationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eventMatchQualityTarget" INTEGER NOT NULL DEFAULT 8,
    "facebookConvApiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "facebookConvApiTestCode" TEXT,
    "facebookConvApiToken" TEXT,
    "facebookPixelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "facebookPixelId" TEXT,
    "gdprCompliant" BOOLEAN NOT NULL DEFAULT true,
    "hashUserData" BOOLEAN NOT NULL DEFAULT true,
    "lastCapiTest" TIMESTAMP(3),
    "lastPixelTest" TIMESTAMP(3),
    "pixelStatus" TEXT DEFAULT 'not_configured',
    "pixelTrackAddToCart" BOOLEAN NOT NULL DEFAULT true,
    "pixelTrackAddToWishlist" BOOLEAN NOT NULL DEFAULT false,
    "pixelTrackInitiateCheckout" BOOLEAN NOT NULL DEFAULT true,
    "pixelTrackPageView" BOOLEAN NOT NULL DEFAULT true,
    "pixelTrackPurchase" BOOLEAN NOT NULL DEFAULT true,
    "pixelTrackSearch" BOOLEAN NOT NULL DEFAULT true,
    "pixelTrackViewContent" BOOLEAN NOT NULL DEFAULT true,
    "stickyAutoScrollToCheckout" BOOLEAN NOT NULL DEFAULT false,
    "stickyScrollThreshold" INTEGER NOT NULL DEFAULT 300,
    "stickyShowBuyNow" BOOLEAN NOT NULL DEFAULT true,
    "stickyTrackAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowAddToCartButton" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowProductImage" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowProductName" BOOLEAN NOT NULL DEFAULT true,
    "stickyShowQuantity" BOOLEAN NOT NULL DEFAULT true,
    "badgeBuyerProtection" BOOLEAN NOT NULL DEFAULT true,
    "badgeCashOnDelivery" BOOLEAN NOT NULL DEFAULT true,
    "badgeCustom1" BOOLEAN NOT NULL DEFAULT false,
    "badgeCustom1Text" TEXT,
    "badgeCustom2" BOOLEAN NOT NULL DEFAULT false,
    "badgeCustom2Text" TEXT,
    "badgeFreeShipping" BOOLEAN NOT NULL DEFAULT true,
    "badgeHighRating" BOOLEAN NOT NULL DEFAULT true,
    "badgeLayout" TEXT NOT NULL DEFAULT 'horizontal',
    "badgeQualityGuarantee" BOOLEAN NOT NULL DEFAULT true,
    "badgeSecurePayment" BOOLEAN NOT NULL DEFAULT true,
    "keyboardShortcuts" BOOLEAN NOT NULL DEFAULT true,
    "navigationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "navigationType" TEXT NOT NULL DEFAULT 'sameCategory',
    "onlineVisitorsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onlineVisitorsMax" INTEGER NOT NULL DEFAULT 50,
    "onlineVisitorsMin" INTEGER NOT NULL DEFAULT 5,
    "onlineVisitorsText" TEXT NOT NULL DEFAULT '{count} شخص يشاهدون هذا المنتج الآن',
    "onlineVisitorsType" TEXT NOT NULL DEFAULT 'fake',
    "onlineVisitorsUpdateInterval" INTEGER NOT NULL DEFAULT 30,
    "reasonsToPurchaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reasonsToPurchaseList" TEXT,
    "reasonsToPurchaseMaxItems" INTEGER NOT NULL DEFAULT 4,
    "reasonsToPurchaseStyle" TEXT NOT NULL DEFAULT 'list',
    "reasonsToPurchaseType" TEXT NOT NULL DEFAULT 'global',
    "securityBadgesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showNavigationButtons" BOOLEAN NOT NULL DEFAULT true,
    "soldNumberEnabled" BOOLEAN NOT NULL DEFAULT false,
    "soldNumberMax" INTEGER NOT NULL DEFAULT 500,
    "soldNumberMin" INTEGER NOT NULL DEFAULT 10,
    "soldNumberText" TEXT NOT NULL DEFAULT 'تم بيع {count} قطعة',
    "soldNumberType" TEXT NOT NULL DEFAULT 'real',
    "stockProgressEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stockProgressHighColor" TEXT NOT NULL DEFAULT '#10b981',
    "stockProgressLowColor" TEXT NOT NULL DEFAULT '#ef4444',
    "stockProgressMediumColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "stockProgressThreshold" INTEGER NOT NULL DEFAULT 10,
    "stockProgressType" TEXT NOT NULL DEFAULT 'percentage',
    "variantColorShowName" BOOLEAN NOT NULL DEFAULT true,
    "variantColorSize" TEXT NOT NULL DEFAULT 'medium',
    "variantColorStyle" TEXT NOT NULL DEFAULT 'buttons',
    "variantSizeShowGuide" BOOLEAN NOT NULL DEFAULT false,
    "variantSizeShowStock" BOOLEAN NOT NULL DEFAULT true,
    "variantSizeStyle" TEXT NOT NULL DEFAULT 'buttons',
    "estimatedDeliveryDefaultText" TEXT NOT NULL DEFAULT 'التوصيل خلال {time}',
    "estimatedDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDeliveryShowOnProduct" BOOLEAN NOT NULL DEFAULT true,
    "fomoDelay" INTEGER NOT NULL DEFAULT 30,
    "fomoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fomoMessage" TEXT,
    "fomoShowOncePerSession" BOOLEAN NOT NULL DEFAULT true,
    "fomoTrigger" TEXT NOT NULL DEFAULT 'time',
    "fomoType" TEXT NOT NULL DEFAULT 'soldCount',
    "productPageLayoutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productPageOrder" TEXT,
    "productPageShowActions" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowBackInStock" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowBadges" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowCategory" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowCheckoutForm" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowCountdown" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowDescription" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowEstimatedDelivery" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowFreeShipping" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowOnlineVisitors" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowPreOrder" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowPrice" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowQuantity" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowReasonsToPurchase" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowSKU" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowSecurityBadges" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowSizeGuide" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowSocialSharing" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowSoldNumber" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowStockProgress" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowStockStatus" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowTabs" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowTitle" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowVariants" BOOLEAN NOT NULL DEFAULT true,
    "productPageShowVolumeDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "productCardStyle" TEXT NOT NULL DEFAULT 'style-1',
    "gridAddToCartIcon" TEXT NOT NULL DEFAULT 'cart',
    "gridDiscountBanner" BOOLEAN NOT NULL DEFAULT false,
    "miniCartIcon" TEXT NOT NULL DEFAULT 'bag',
    "miniCartAction" TEXT NOT NULL DEFAULT 'sidebar',
    "miniCartPreload" BOOLEAN NOT NULL DEFAULT true,
    "miniCartDisableNotification" BOOLEAN NOT NULL DEFAULT false,
    "compactCartNumber" BOOLEAN NOT NULL DEFAULT true,
    "categoryFilterLayout" TEXT NOT NULL DEFAULT 'top',
    "categoryFilterMaxDepth" TEXT NOT NULL DEFAULT 'unlimited',
    "categoryFilterOrderBy" TEXT NOT NULL DEFAULT 'name',
    "galleryLayout" TEXT NOT NULL DEFAULT 'bottom',
    "galleryStyle" TEXT NOT NULL DEFAULT 'slider',
    "imageBorderRadius" INTEGER NOT NULL DEFAULT 8,
    "imageHoverEffect" TEXT NOT NULL DEFAULT 'zoom',
    "imageLoadingEffect" TEXT NOT NULL DEFAULT 'skeleton',
    "imagePlaceholder" TEXT NOT NULL DEFAULT '?',
    "imageShadow" BOOLEAN NOT NULL DEFAULT true,
    "lightboxBackgroundColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.9)',
    "lightboxCloseOnOverlay" BOOLEAN NOT NULL DEFAULT true,
    "lightboxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lightboxKeyboardNav" BOOLEAN NOT NULL DEFAULT true,
    "lightboxShowArrows" BOOLEAN NOT NULL DEFAULT true,
    "lightboxShowCounter" BOOLEAN NOT NULL DEFAULT true,
    "lightboxShowThumbnails" BOOLEAN NOT NULL DEFAULT true,
    "lightboxZoomEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mainImageAspectRatio" TEXT NOT NULL DEFAULT '1:1',
    "mobileFullscreenOnTap" BOOLEAN NOT NULL DEFAULT true,
    "mobileGalleryLayout" TEXT NOT NULL DEFAULT 'slider',
    "mobilePinchZoom" BOOLEAN NOT NULL DEFAULT true,
    "mobileShowThumbnails" BOOLEAN NOT NULL DEFAULT false,
    "mobileSwipeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mouseWheelZoom" BOOLEAN NOT NULL DEFAULT false,
    "sliderAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "sliderAutoplaySpeed" INTEGER NOT NULL DEFAULT 3000,
    "sliderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sliderInfiniteLoop" BOOLEAN NOT NULL DEFAULT true,
    "sliderShowArrows" BOOLEAN NOT NULL DEFAULT true,
    "sliderShowDots" BOOLEAN NOT NULL DEFAULT false,
    "sliderTransitionEffect" TEXT NOT NULL DEFAULT 'slide',
    "sliderTransitionSpeed" INTEGER NOT NULL DEFAULT 300,
    "thumbnailBorderRadius" INTEGER NOT NULL DEFAULT 8,
    "thumbnailSize" TEXT NOT NULL DEFAULT 'medium',
    "thumbnailSpacing" INTEGER NOT NULL DEFAULT 8,
    "thumbnailsPerRow" INTEGER NOT NULL DEFAULT 4,
    "variationImagesAnimation" TEXT NOT NULL DEFAULT 'fade',
    "variationImagesBehavior" TEXT NOT NULL DEFAULT 'replace',
    "variationImagesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "videoMuted" BOOLEAN NOT NULL DEFAULT true,
    "videoPlayMode" TEXT NOT NULL DEFAULT 'inline',
    "videoPosition" TEXT NOT NULL DEFAULT 'end',
    "videoSources" TEXT NOT NULL DEFAULT '["youtube", "vimeo", "self-hosted"]',
    "videoThumbnailIcon" BOOLEAN NOT NULL DEFAULT true,
    "view360AutoRotate" BOOLEAN NOT NULL DEFAULT true,
    "view360Enabled" BOOLEAN NOT NULL DEFAULT false,
    "view360RotateSpeed" INTEGER NOT NULL DEFAULT 5,
    "view360ShowControls" BOOLEAN NOT NULL DEFAULT true,
    "zoomLensShape" TEXT NOT NULL DEFAULT 'square',
    "zoomLensSize" INTEGER NOT NULL DEFAULT 150,
    "zoomLevel" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "zoomStyle" TEXT NOT NULL DEFAULT 'side',
    "zoomWindowPosition" TEXT NOT NULL DEFAULT 'right',
    "zoomWindowSize" INTEGER NOT NULL DEFAULT 400,
    "mobileBottomNavbarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mobileBottomNavbarShowAccount" BOOLEAN NOT NULL DEFAULT true,
    "mobileBottomNavbarShowCart" BOOLEAN NOT NULL DEFAULT false,
    "mobileBottomNavbarShowCompare" BOOLEAN NOT NULL DEFAULT true,
    "mobileBottomNavbarShowHome" BOOLEAN NOT NULL DEFAULT true,
    "mobileBottomNavbarShowSearch" BOOLEAN NOT NULL DEFAULT false,
    "mobileBottomNavbarShowShop" BOOLEAN NOT NULL DEFAULT true,
    "mobileBottomNavbarShowWishlist" BOOLEAN NOT NULL DEFAULT true,
    "designTokens" JSONB,

    CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planType" "subscriptions_planType" NOT NULL,
    "status" "subscriptions_status" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "trialEndDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_prompts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "resourceUsage" TEXT,
    "lastStatusChange" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "excellentThreshold" INTEGER NOT NULL DEFAULT 90,
    "goodThreshold" INTEGER NOT NULL DEFAULT 70,
    "minOrdersForRating" INTEGER NOT NULL DEFAULT 3,
    "autoApproveScore" INTEGER NOT NULL DEFAULT 95,
    "enableAutoApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_studio_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "basicModelName" TEXT NOT NULL DEFAULT 'gemini-2.5-flash-image',
    "proModelName" TEXT NOT NULL DEFAULT 'gemini-3-pro-image-preview',
    "defaultModel" TEXT NOT NULL DEFAULT 'basic',
    "maxImagesPerRequest" INTEGER NOT NULL DEFAULT 1,
    "maxRequestsPerDay" INTEGER NOT NULL DEFAULT 50,
    "allowedCompanies" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "selectedKeyId" TEXT,

    CONSTRAINT "image_studio_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "apiKey" TEXT,
    "apiUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SupportTicket_category" NOT NULL DEFAULT 'INQUIRY',
    "status" "SupportTicket_status" NOT NULL DEFAULT 'OPEN',
    "rating" INTEGER,
    "feedback" TEXT,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "assignedUserId" TEXT,
    "priority" "SupportTicket_priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "ticketId" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_notifications" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "dev_projects_status" NOT NULL DEFAULT 'PLANNING',
    "priority" "dev_projects_priority" NOT NULL DEFAULT 'MEDIUM',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "teamMembers" TEXT,
    "tags" TEXT,
    "repository" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyRelId" TEXT,

    CONSTRAINT "dev_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "dev_releases_status" NOT NULL DEFAULT 'PLANNING',
    "releaseDate" TIMESTAMP(3),
    "changelog" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_activities" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_attachments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_checklists" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_task_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "mentions" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_task_watchers" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_task_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "dev_tasks_type" NOT NULL DEFAULT 'FEATURE',
    "status" "dev_tasks_status" NOT NULL DEFAULT 'BACKLOG',
    "priority" "dev_tasks_priority" NOT NULL DEFAULT 'MEDIUM',
    "component" TEXT,
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    "projectId" TEXT,
    "releaseId" TEXT,
    "parentTaskId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "labels" TEXT,
    "gitBranch" TEXT,
    "gitPR" TEXT,
    "companyId" TEXT,
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptanceCriteria" TEXT,
    "businessValue" TEXT,
    "xpEarned" INTEGER,
    "relatedLinks" TEXT,
    "companyRelId" TEXT,

    CONSTRAINT "dev_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "Project_status" NOT NULL DEFAULT 'PLANNING',
    "priority" "Project_priority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "spentBudget" DECIMAL(10,2) DEFAULT 0.00,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT NOT NULL,
    "teamMembers" TEXT,
    "tags" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "taskStatuses" TEXT,
    "taskPriorities" TEXT,
    "componentMappings" TEXT,
    "permissions" TEXT,
    "autoTestingSubtask" BOOLEAN NOT NULL DEFAULT false,
    "autoTestingAssigneeId" TEXT,
    "leaderboardSettings" TEXT,
    "taskDetailsVisibility" TEXT,
    "automationSettings" TEXT,
    "timezone" TEXT DEFAULT 'Africa/Cairo',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_activities" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklists" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "mentions" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'blocked_by',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "link" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultStatus" "task_templates_defaultStatus" NOT NULL DEFAULT 'PENDING',
    "defaultPriority" "task_templates_defaultPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT NOT NULL DEFAULT 'general',
    "estimatedHours" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "checklist" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_watchers" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "Task_status" NOT NULL DEFAULT 'PENDING',
    "priority" "Task_priority" NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT NOT NULL DEFAULT 'general',
    "assignedTo" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "estimatedHours" INTEGER NOT NULL DEFAULT 0,
    "actualHours" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "dependencies" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,
    "color" TEXT,
    "completedDate" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentTaskId" TEXT,
    "recurringRule" TEXT,
    "startDate" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(10,2),
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_team_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'developer',
    "department" TEXT,
    "skills" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'available',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "dailyTarget" INTEGER,
    "hourlyRate" DECIMAL(10,2),
    "weeklyTarget" INTEGER,
    "companyRelId" TEXT,

    CONSTRAINT "dev_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_time_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activityType" TEXT,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseDuration" INTEGER NOT NULL DEFAULT 0,
    "pauseHistory" TEXT,
    "pausedAt" TIMESTAMP(3),

    CONSTRAINT "dev_time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "botToken" TEXT,
    "botName" TEXT,
    "botUsername" TEXT,
    "apiId" TEXT,
    "apiHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "clientSession" TEXT,
    "clientPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Official Bot',
    "sessionString" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BOT',

    CONSTRAINT "telegram_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_scheduled_messages" (
    "id" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "createdBy" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_campaigns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "message" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_auto_reply_rules" (
    "id" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "response" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "workingHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "daysOfWeek" JSONB,
    "maxUsesPerUser" INTEGER,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_auto_reply_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_auto_reply_usage" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_auto_reply_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bulk_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipients" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "delayBetweenMessages" INTEGER NOT NULL DEFAULT 1000,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_bulk_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bulk_message_logs" (
    "id" TEXT NOT NULL,
    "bulkMessageId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_bulk_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_groups" (
    "id" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "managedByUs" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_contacts" (
    "id" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "phone" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_forward_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userbotConfigId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceChats" JSONB NOT NULL,
    "targetChat" TEXT NOT NULL,
    "filterKeywords" JSONB,
    "filterMediaTypes" JSONB,
    "forwardCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_forward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "content" JSONB NOT NULL,
    "dnaProfile" JSONB,
    "blueprint" JSONB,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "price" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_variant_library" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "previewImageUrl" TEXT,
    "schema" JSONB,
    "defaultProps" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_variant_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_follow_up_flows" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_follow_up_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_follow_up_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "stepOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_follow_up_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journeys" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "flowId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DepartmentManager" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentManager_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AdSetCustomAudiences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdSetCustomAudiences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AdSetLookalikeAudiences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdSetLookalikeAudiences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "affiliate_payouts_affiliateId_idx" ON "affiliate_payouts"("affiliateId");

-- CreateIndex
CREATE INDEX "affiliate_payouts_paymentMethod_idx" ON "affiliate_payouts"("paymentMethod");

-- CreateIndex
CREATE INDEX "affiliate_payouts_status_idx" ON "affiliate_payouts"("status");

-- CreateIndex
CREATE INDEX "affiliate_products_affiliateId_idx" ON "affiliate_products"("affiliateId");

-- CreateIndex
CREATE INDEX "affiliate_products_productId_idx" ON "affiliate_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_products_affiliateId_productId_key" ON "affiliate_products"("affiliateId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_referrals_orderId_key" ON "affiliate_referrals"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_referrals_affiliateId_idx" ON "affiliate_referrals"("affiliateId");

-- CreateIndex
CREATE INDEX "affiliate_referrals_converted_idx" ON "affiliate_referrals"("converted");

-- CreateIndex
CREATE INDEX "affiliate_referrals_customerId_idx" ON "affiliate_referrals"("customerId");

-- CreateIndex
CREATE INDEX "affiliate_referrals_orderId_idx" ON "affiliate_referrals"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_referrals_referralCode_idx" ON "affiliate_referrals"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_settings_companyId_key" ON "affiliate_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_userId_key" ON "affiliates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_affiliateCode_key" ON "affiliates"("affiliateCode");

-- CreateIndex
CREATE INDEX "affiliates_affiliateCode_idx" ON "affiliates"("affiliateCode");

-- CreateIndex
CREATE INDEX "affiliates_companyId_idx" ON "affiliates"("companyId");

-- CreateIndex
CREATE INDEX "affiliates_status_idx" ON "affiliates"("status");

-- CreateIndex
CREATE INDEX "commissions_affiliateId_idx" ON "commissions"("affiliateId");

-- CreateIndex
CREATE INDEX "commissions_companyId_idx" ON "commissions"("companyId");

-- CreateIndex
CREATE INDEX "commissions_merchantId_idx" ON "commissions"("merchantId");

-- CreateIndex
CREATE INDEX "commissions_orderId_idx" ON "commissions"("orderId");

-- CreateIndex
CREATE INDEX "commissions_payoutId_idx" ON "commissions"("payoutId");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "ai_analytics_date_idx" ON "ai_analytics"("date");

-- CreateIndex
CREATE INDEX "ai_interactions_companyId_idx" ON "ai_interactions"("companyId");

-- CreateIndex
CREATE INDEX "ai_interactions_customerId_idx" ON "ai_interactions"("customerId");

-- CreateIndex
CREATE INDEX "ai_interactions_keyName_idx" ON "ai_interactions"("keyName");

-- CreateIndex
CREATE INDEX "ai_interactions_modelUsed_idx" ON "ai_interactions"("modelUsed");

-- CreateIndex
CREATE UNIQUE INDEX "ai_keys_apiKey_key" ON "ai_keys"("apiKey");

-- CreateIndex
CREATE INDEX "ai_keys_companyId_idx" ON "ai_keys"("companyId");

-- CreateIndex
CREATE INDEX "ai_keys_provider_isActive_idx" ON "ai_keys"("provider", "isActive");

-- CreateIndex
CREATE INDEX "ai_model_configs_keyId_idx" ON "ai_model_configs"("keyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_configs_keyId_modelName_key" ON "ai_model_configs"("keyId", "modelName");

-- CreateIndex
CREATE INDEX "ai_notifications_companyId_idx" ON "ai_notifications"("companyId");

-- CreateIndex
CREATE INDEX "ai_notifications_createdAt_idx" ON "ai_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "ai_notifications_isRead_idx" ON "ai_notifications"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_companyId_key" ON "ai_settings"("companyId");

-- CreateIndex
CREATE INDEX "learning_data_companyId_idx" ON "learning_data"("companyId");

-- CreateIndex
CREATE INDEX "learning_data_confidence_idx" ON "learning_data"("confidence");

-- CreateIndex
CREATE INDEX "learning_data_createdAt_idx" ON "learning_data"("createdAt");

-- CreateIndex
CREATE INDEX "learning_data_intent_idx" ON "learning_data"("intent");

-- CreateIndex
CREATE INDEX "learning_data_type_idx" ON "learning_data"("type");

-- CreateIndex
CREATE UNIQUE INDEX "learning_settings_companyId_key" ON "learning_settings"("companyId");

-- CreateIndex
CREATE INDEX "search_analytics_companyId_createdAt_idx" ON "search_analytics"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "search_analytics_companyId_idx" ON "search_analytics"("companyId");

-- CreateIndex
CREATE INDEX "search_analytics_intent_idx" ON "search_analytics"("intent");

-- CreateIndex
CREATE INDEX "search_analytics_wasSuccessful_idx" ON "search_analytics"("wasSuccessful");

-- CreateIndex
CREATE INDEX "ai_failure_logs_companyId_createdAt_idx" ON "ai_failure_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_failure_logs_errorType_idx" ON "ai_failure_logs"("errorType");

-- CreateIndex
CREATE INDEX "AIChatMessage_sessionId_idx" ON "AIChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AIChatSession_userId_idx" ON "AIChatSession"("userId");

-- CreateIndex
CREATE INDEX "ai_trace_steps_traceId_idx" ON "ai_trace_steps"("traceId");

-- CreateIndex
CREATE INDEX "ai_trace_steps_createdAt_idx" ON "ai_trace_steps"("createdAt");

-- CreateIndex
CREATE INDEX "ai_traces_companyId_idx" ON "ai_traces"("companyId");

-- CreateIndex
CREATE INDEX "ai_traces_createdAt_idx" ON "ai_traces"("createdAt");

-- CreateIndex
CREATE INDEX "daily_analytics_companyId_date_idx" ON "daily_analytics"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_companyId_date_key" ON "daily_analytics"("companyId", "date");

-- CreateIndex
CREATE INDEX "product_analytics_companyId_date_idx" ON "product_analytics"("companyId", "date");

-- CreateIndex
CREATE INDEX "product_analytics_productId_companyId_idx" ON "product_analytics"("productId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_analytics_companyId_productId_date_key" ON "product_analytics"("companyId", "productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_limits_modelName_key" ON "ai_model_limits"("modelName");

-- CreateIndex
CREATE INDEX "ai_model_limits_modelName_idx" ON "ai_model_limits"("modelName");

-- CreateIndex
CREATE INDEX "ai_model_limits_isDeprecated_idx" ON "ai_model_limits"("isDeprecated");

-- CreateIndex
CREATE INDEX "asset_assignments_assetId_idx" ON "asset_assignments"("assetId");

-- CreateIndex
CREATE INDEX "asset_assignments_userId_idx" ON "asset_assignments"("userId");

-- CreateIndex
CREATE INDEX "asset_assignments_assignedBy_idx" ON "asset_assignments"("assignedBy");

-- CreateIndex
CREATE INDEX "asset_categories_companyId_idx" ON "asset_categories"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_companyId_name_key" ON "asset_categories"("companyId", "name");

-- CreateIndex
CREATE INDEX "asset_maintenance_assetId_idx" ON "asset_maintenance"("assetId");

-- CreateIndex
CREATE INDEX "assets_companyId_idx" ON "assets"("companyId");

-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_assignedToId_idx" ON "assets"("assignedToId");

-- CreateIndex
CREATE INDEX "assets_branchId_idx" ON "assets"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_companyId_code_key" ON "assets"("companyId", "code");

-- CreateIndex
CREATE INDEX "asset_custody_history_assetId_idx" ON "asset_custody_history"("assetId");

-- CreateIndex
CREATE INDEX "asset_custody_history_userId_idx" ON "asset_custody_history"("userId");

-- CreateIndex
CREATE INDEX "asset_custody_history_assignedBy_idx" ON "asset_custody_history"("assignedBy");

-- CreateIndex
CREATE INDEX "asset_requests_companyId_idx" ON "asset_requests"("companyId");

-- CreateIndex
CREATE INDEX "asset_requests_assetId_idx" ON "asset_requests"("assetId");

-- CreateIndex
CREATE INDEX "asset_requests_requestedBy_idx" ON "asset_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "asset_requests_status_idx" ON "asset_requests"("status");

-- CreateIndex
CREATE INDEX "asset_audits_companyId_idx" ON "asset_audits"("companyId");

-- CreateIndex
CREATE INDEX "asset_audits_assetId_idx" ON "asset_audits"("assetId");

-- CreateIndex
CREATE INDEX "asset_audits_status_idx" ON "asset_audits"("status");

-- CreateIndex
CREATE INDEX "asset_attachments_assetId_idx" ON "asset_attachments"("assetId");

-- CreateIndex
CREATE INDEX "asset_attachments_type_idx" ON "asset_attachments"("type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_companyId_key" ON "platform_subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "platform_subscriptions_companyId_idx" ON "platform_subscriptions"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_enterprise_plans_companyId_key" ON "platform_enterprise_plans"("companyId");

-- CreateIndex
CREATE INDEX "platform_enterprise_plans_companyId_idx" ON "platform_enterprise_plans"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_plan_key" ON "plan_limits"("plan");

-- CreateIndex
CREATE INDEX "billing_history_companyId_idx" ON "billing_history"("companyId");

-- CreateIndex
CREATE INDEX "billing_history_type_idx" ON "billing_history"("type");

-- CreateIndex
CREATE INDEX "billing_history_status_idx" ON "billing_history"("status");

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_customDomain_key" ON "companies"("customDomain");

-- CreateIndex
CREATE INDEX "companies_planConfigurationId_idx" ON "companies"("planConfigurationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX "users_positionId_idx" ON "users"("positionId");

-- CreateIndex
CREATE INDEX "user_companies_companyId_idx" ON "user_companies"("companyId");

-- CreateIndex
CREATE INDEX "user_companies_userId_idx" ON "user_companies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_companyId_idx" ON "user_invitations"("companyId");

-- CreateIndex
CREATE INDEX "user_invitations_invitedBy_idx" ON "user_invitations"("invitedBy");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "activities_customerId_idx" ON "activities"("customerId");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_category_idx" ON "activity_logs"("category");

-- CreateIndex
CREATE INDEX "activity_logs_companyId_createdAt_idx" ON "activity_logs"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_companyId_idx" ON "activity_logs"("companyId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_isSuccess_idx" ON "activity_logs"("isSuccess");

-- CreateIndex
CREATE INDEX "activity_logs_severity_idx" ON "activity_logs"("severity");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_companyId_platform_externalId_key" ON "integrations"("companyId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "policies_category_idx" ON "policies"("category");

-- CreateIndex
CREATE INDEX "policies_companyId_idx" ON "policies"("companyId");

-- CreateIndex
CREATE INDEX "policies_companyId_isActive_effectiveAt_idx" ON "policies"("companyId", "isActive", "effectiveAt");

-- CreateIndex
CREATE INDEX "policies_isActive_idx" ON "policies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "easy_orders_settings_companyId_key" ON "easy_orders_settings"("companyId");

-- CreateIndex
CREATE INDEX "easy_orders_sync_logs_companyId_idx" ON "easy_orders_sync_logs"("companyId");

-- CreateIndex
CREATE INDEX "easy_orders_sync_logs_startedAt_idx" ON "easy_orders_sync_logs"("startedAt");

-- CreateIndex
CREATE INDEX "hr_departments_companyId_idx" ON "hr_departments"("companyId");

-- CreateIndex
CREATE INDEX "hr_departments_managerId_idx" ON "hr_departments"("managerId");

-- CreateIndex
CREATE INDEX "hr_departments_parentId_idx" ON "hr_departments"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_departments_companyId_code_key" ON "hr_departments"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_userId_key" ON "hr_employees"("userId");

-- CreateIndex
CREATE INDEX "hr_employees_companyId_idx" ON "hr_employees"("companyId");

-- CreateIndex
CREATE INDEX "hr_employees_departmentId_idx" ON "hr_employees"("departmentId");

-- CreateIndex
CREATE INDEX "hr_employees_managerId_idx" ON "hr_employees"("managerId");

-- CreateIndex
CREATE INDEX "hr_employees_positionId_idx" ON "hr_employees"("positionId");

-- CreateIndex
CREATE INDEX "hr_employees_status_idx" ON "hr_employees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_companyId_employeeNumber_key" ON "hr_employees"("companyId", "employeeNumber");

-- CreateIndex
CREATE INDEX "hr_positions_companyId_idx" ON "hr_positions"("companyId");

-- CreateIndex
CREATE INDEX "hr_positions_departmentId_idx" ON "hr_positions"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_positions_companyId_code_key" ON "hr_positions"("companyId", "code");

-- CreateIndex
CREATE INDEX "hr_attendances_companyId_idx" ON "hr_attendances"("companyId");

-- CreateIndex
CREATE INDEX "hr_attendances_date_idx" ON "hr_attendances"("date");

-- CreateIndex
CREATE INDEX "hr_attendances_status_idx" ON "hr_attendances"("status");

-- CreateIndex
CREATE INDEX "hr_attendances_userId_idx" ON "hr_attendances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_attendances_userId_date_key" ON "hr_attendances"("userId", "date");

-- CreateIndex
CREATE INDEX "hr_leave_requests_approvedBy_idx" ON "hr_leave_requests"("approvedBy");

-- CreateIndex
CREATE INDEX "hr_leave_requests_companyId_idx" ON "hr_leave_requests"("companyId");

-- CreateIndex
CREATE INDEX "hr_leave_requests_startDate_idx" ON "hr_leave_requests"("startDate");

-- CreateIndex
CREATE INDEX "hr_leave_requests_status_idx" ON "hr_leave_requests"("status");

-- CreateIndex
CREATE INDEX "hr_leave_requests_userId_idx" ON "hr_leave_requests"("userId");

-- CreateIndex
CREATE INDEX "hr_permission_requests_companyId_idx" ON "hr_permission_requests"("companyId");

-- CreateIndex
CREATE INDEX "hr_permission_requests_employeeId_idx" ON "hr_permission_requests"("employeeId");

-- CreateIndex
CREATE INDEX "hr_permission_requests_date_idx" ON "hr_permission_requests"("date");

-- CreateIndex
CREATE INDEX "hr_permission_requests_status_idx" ON "hr_permission_requests"("status");

-- CreateIndex
CREATE INDEX "hr_payrolls_companyId_idx" ON "hr_payrolls"("companyId");

-- CreateIndex
CREATE INDEX "hr_payrolls_month_year_idx" ON "hr_payrolls"("month", "year");

-- CreateIndex
CREATE INDEX "hr_payrolls_status_idx" ON "hr_payrolls"("status");

-- CreateIndex
CREATE INDEX "hr_payrolls_userId_idx" ON "hr_payrolls"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_payrolls_userId_month_year_key" ON "hr_payrolls"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "hr_performance_reviews_companyId_idx" ON "hr_performance_reviews"("companyId");

-- CreateIndex
CREATE INDEX "hr_performance_reviews_reviewerId_idx" ON "hr_performance_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "hr_performance_reviews_status_idx" ON "hr_performance_reviews"("status");

-- CreateIndex
CREATE INDEX "hr_performance_reviews_userId_idx" ON "hr_performance_reviews"("userId");

-- CreateIndex
CREATE INDEX "hr_employee_documents_companyId_idx" ON "hr_employee_documents"("companyId");

-- CreateIndex
CREATE INDEX "hr_employee_documents_type_idx" ON "hr_employee_documents"("type");

-- CreateIndex
CREATE INDEX "hr_employee_documents_userId_idx" ON "hr_employee_documents"("userId");

-- CreateIndex
CREATE INDEX "hr_salary_history_companyId_idx" ON "hr_salary_history"("companyId");

-- CreateIndex
CREATE INDEX "hr_salary_history_userId_idx" ON "hr_salary_history"("userId");

-- CreateIndex
CREATE INDEX "hr_employee_warnings_companyId_idx" ON "hr_employee_warnings"("companyId");

-- CreateIndex
CREATE INDEX "hr_employee_warnings_userId_idx" ON "hr_employee_warnings"("userId");

-- CreateIndex
CREATE INDEX "hr_employee_training_companyId_idx" ON "hr_employee_training"("companyId");

-- CreateIndex
CREATE INDEX "hr_employee_training_status_idx" ON "hr_employee_training"("status");

-- CreateIndex
CREATE INDEX "hr_employee_training_userId_idx" ON "hr_employee_training"("userId");

-- CreateIndex
CREATE INDEX "hr_shifts_companyId_idx" ON "hr_shifts"("companyId");

-- CreateIndex
CREATE INDEX "hr_shift_assignments_companyId_idx" ON "hr_shift_assignments"("companyId");

-- CreateIndex
CREATE INDEX "hr_shift_assignments_date_idx" ON "hr_shift_assignments"("date");

-- CreateIndex
CREATE INDEX "hr_shift_assignments_shiftId_idx" ON "hr_shift_assignments"("shiftId");

-- CreateIndex
CREATE INDEX "hr_shift_assignments_userId_idx" ON "hr_shift_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_shift_assignments_userId_shiftId_date_key" ON "hr_shift_assignments"("userId", "shiftId", "date");

-- CreateIndex
CREATE INDEX "hr_benefits_companyId_idx" ON "hr_benefits"("companyId");

-- CreateIndex
CREATE INDEX "hr_benefit_enrollments_benefitId_idx" ON "hr_benefit_enrollments"("benefitId");

-- CreateIndex
CREATE INDEX "hr_benefit_enrollments_companyId_idx" ON "hr_benefit_enrollments"("companyId");

-- CreateIndex
CREATE INDEX "hr_benefit_enrollments_userId_idx" ON "hr_benefit_enrollments"("userId");

-- CreateIndex
CREATE INDEX "hr_goals_companyId_idx" ON "hr_goals"("companyId");

-- CreateIndex
CREATE INDEX "hr_goals_departmentId_idx" ON "hr_goals"("departmentId");

-- CreateIndex
CREATE INDEX "hr_goals_status_idx" ON "hr_goals"("status");

-- CreateIndex
CREATE INDEX "hr_goals_userId_idx" ON "hr_goals"("userId");

-- CreateIndex
CREATE INDEX "hr_feedbacks_companyId_idx" ON "hr_feedbacks"("companyId");

-- CreateIndex
CREATE INDEX "hr_feedbacks_fromUserId_idx" ON "hr_feedbacks"("fromUserId");

-- CreateIndex
CREATE INDEX "hr_feedbacks_toUserId_idx" ON "hr_feedbacks"("toUserId");

-- CreateIndex
CREATE INDEX "hr_feedbacks_type_idx" ON "hr_feedbacks"("type");

-- CreateIndex
CREATE INDEX "hr_resignations_companyId_idx" ON "hr_resignations"("companyId");

-- CreateIndex
CREATE INDEX "hr_resignations_status_idx" ON "hr_resignations"("status");

-- CreateIndex
CREATE INDEX "hr_resignations_userId_idx" ON "hr_resignations"("userId");

-- CreateIndex
CREATE INDEX "hr_audit_logs_companyId_idx" ON "hr_audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "hr_audit_logs_entityType_idx" ON "hr_audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "hr_audit_logs_action_idx" ON "hr_audit_logs"("action");

-- CreateIndex
CREATE INDEX "hr_audit_logs_actorId_idx" ON "hr_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "hr_audit_logs_createdAt_idx" ON "hr_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "hr_audit_logs_companyId_entityType_idx" ON "hr_audit_logs"("companyId", "entityType");

-- CreateIndex
CREATE INDEX "hr_audit_logs_companyId_action_idx" ON "hr_audit_logs"("companyId", "action");

-- CreateIndex
CREATE INDEX "hr_audit_logs_companyId_createdAt_idx" ON "hr_audit_logs"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hr_settings_companyId_key" ON "hr_settings"("companyId");

-- CreateIndex
CREATE INDEX "hr_advance_requests_companyId_idx" ON "hr_advance_requests"("companyId");

-- CreateIndex
CREATE INDEX "hr_advance_requests_userId_idx" ON "hr_advance_requests"("userId");

-- CreateIndex
CREATE INDEX "hr_advance_requests_status_idx" ON "hr_advance_requests"("status");

-- CreateIndex
CREATE INDEX "hr_clearance_checklists_resignationId_idx" ON "hr_clearance_checklists"("resignationId");

-- CreateIndex
CREATE INDEX "hr_late_warnings_companyId_idx" ON "hr_late_warnings"("companyId");

-- CreateIndex
CREATE INDEX "hr_late_warnings_userId_idx" ON "hr_late_warnings"("userId");

-- CreateIndex
CREATE INDEX "hr_late_warnings_month_year_idx" ON "hr_late_warnings"("month", "year");

-- CreateIndex
CREATE INDEX "hr_kudos_companyId_idx" ON "hr_kudos"("companyId");

-- CreateIndex
CREATE INDEX "hr_kudos_fromUserId_idx" ON "hr_kudos"("fromUserId");

-- CreateIndex
CREATE INDEX "hr_kudos_toUserId_idx" ON "hr_kudos"("toUserId");

-- CreateIndex
CREATE INDEX "hr_lateness_balances_companyId_idx" ON "hr_lateness_balances"("companyId");

-- CreateIndex
CREATE INDEX "hr_lateness_balances_employeeId_idx" ON "hr_lateness_balances"("employeeId");

-- CreateIndex
CREATE INDEX "hr_lateness_balances_month_year_idx" ON "hr_lateness_balances"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "hr_lateness_balances_employeeId_month_year_key" ON "hr_lateness_balances"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "hr_manual_deductions_companyId_idx" ON "hr_manual_deductions"("companyId");

-- CreateIndex
CREATE INDEX "hr_manual_deductions_createdBy_idx" ON "hr_manual_deductions"("createdBy");

-- CreateIndex
CREATE INDEX "hr_manual_deductions_effectiveMonth_effectiveYear_idx" ON "hr_manual_deductions"("effectiveMonth", "effectiveYear");

-- CreateIndex
CREATE INDEX "hr_manual_deductions_employeeId_idx" ON "hr_manual_deductions"("employeeId");

-- CreateIndex
CREATE INDEX "hr_manual_deductions_status_idx" ON "hr_manual_deductions"("status");

-- CreateIndex
CREATE INDEX "hr_promotions_companyId_idx" ON "hr_promotions"("companyId");

-- CreateIndex
CREATE INDEX "hr_promotions_fromPositionId_idx" ON "hr_promotions"("fromPositionId");

-- CreateIndex
CREATE INDEX "hr_promotions_promotionDate_idx" ON "hr_promotions"("promotionDate");

-- CreateIndex
CREATE INDEX "hr_promotions_toPositionId_idx" ON "hr_promotions"("toPositionId");

-- CreateIndex
CREATE INDEX "hr_promotions_userId_idx" ON "hr_promotions"("userId");

-- CreateIndex
CREATE INDEX "hr_reward_eligibility_logs_companyId_idx" ON "hr_reward_eligibility_logs"("companyId");

-- CreateIndex
CREATE INDEX "hr_reward_eligibility_logs_evaluationDate_idx" ON "hr_reward_eligibility_logs"("evaluationDate");

-- CreateIndex
CREATE INDEX "hr_reward_eligibility_logs_rewardTypeId_idx" ON "hr_reward_eligibility_logs"("rewardTypeId");

-- CreateIndex
CREATE INDEX "hr_reward_eligibility_logs_userId_idx" ON "hr_reward_eligibility_logs"("userId");

-- CreateIndex
CREATE INDEX "hr_reward_records_appliedMonth_appliedYear_idx" ON "hr_reward_records"("appliedMonth", "appliedYear");

-- CreateIndex
CREATE INDEX "hr_reward_records_companyId_idx" ON "hr_reward_records"("companyId");

-- CreateIndex
CREATE INDEX "hr_reward_records_rewardTypeId_idx" ON "hr_reward_records"("rewardTypeId");

-- CreateIndex
CREATE INDEX "hr_reward_records_status_idx" ON "hr_reward_records"("status");

-- CreateIndex
CREATE INDEX "hr_reward_records_userId_idx" ON "hr_reward_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_reward_settings_companyId_key" ON "hr_reward_settings"("companyId");

-- CreateIndex
CREATE INDEX "hr_reward_types_category_idx" ON "hr_reward_types"("category");

-- CreateIndex
CREATE INDEX "hr_reward_types_companyId_idx" ON "hr_reward_types"("companyId");

-- CreateIndex
CREATE INDEX "hr_reward_types_isActive_idx" ON "hr_reward_types"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "lateness_rules_companyId_key" ON "lateness_rules"("companyId");

-- CreateIndex
CREATE INDEX "lateness_allowances_companyId_idx" ON "lateness_allowances"("companyId");

-- CreateIndex
CREATE INDEX "lateness_allowances_userId_idx" ON "lateness_allowances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lateness_allowances_userId_year_month_key" ON "lateness_allowances"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "lateness_records_companyId_idx" ON "lateness_records"("companyId");

-- CreateIndex
CREATE INDEX "lateness_records_userId_idx" ON "lateness_records"("userId");

-- CreateIndex
CREATE INDEX "lateness_records_date_idx" ON "lateness_records"("date");

-- CreateIndex
CREATE INDEX "lateness_deductions_companyId_idx" ON "lateness_deductions"("companyId");

-- CreateIndex
CREATE INDEX "lateness_deductions_userId_idx" ON "lateness_deductions"("userId");

-- CreateIndex
CREATE INDEX "lateness_deductions_violationDate_idx" ON "lateness_deductions"("violationDate");

-- CreateIndex
CREATE INDEX "lateness_deductions_latenessRecordId_idx" ON "lateness_deductions"("latenessRecordId");

-- CreateIndex
CREATE INDEX "lateness_monthly_summaries_companyId_idx" ON "lateness_monthly_summaries"("companyId");

-- CreateIndex
CREATE INDEX "lateness_monthly_summaries_userId_idx" ON "lateness_monthly_summaries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lateness_monthly_summaries_userId_year_month_key" ON "lateness_monthly_summaries"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "hr_company_policies_companyId_idx" ON "hr_company_policies"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_connections_providerId_consumerId_key" ON "company_connections"("providerId", "consumerId");

-- CreateIndex
CREATE INDEX "company_connection_requests_requesterId_idx" ON "company_connection_requests"("requesterId");

-- CreateIndex
CREATE INDEX "company_connection_requests_receiverId_idx" ON "company_connection_requests"("receiverId");

-- CreateIndex
CREATE INDEX "back_in_stock_notifications_companyId_idx" ON "back_in_stock_notifications"("companyId");

-- CreateIndex
CREATE INDEX "back_in_stock_notifications_isNotified_idx" ON "back_in_stock_notifications"("isNotified");

-- CreateIndex
CREATE INDEX "back_in_stock_notifications_productId_idx" ON "back_in_stock_notifications"("productId");

-- CreateIndex
CREATE INDEX "stock_alerts_isRead_idx" ON "stock_alerts"("isRead");

-- CreateIndex
CREATE INDEX "stock_alerts_priority_idx" ON "stock_alerts"("priority");

-- CreateIndex
CREATE INDEX "stock_alerts_productId_idx" ON "stock_alerts"("productId");

-- CreateIndex
CREATE INDEX "stock_alerts_warehouseId_idx" ON "stock_alerts"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_warehouseId_idx" ON "stock_movements"("warehouseId");

-- CreateIndex
CREATE INDEX "task_categories_companyId_idx" ON "task_categories"("companyId");

-- CreateIndex
CREATE INDEX "task_categories_isActive_idx" ON "task_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "task_categories_companyId_name_key" ON "task_categories"("companyId", "name");

-- CreateIndex
CREATE INDEX "warehouses_companyId_idx" ON "warehouses"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_settings_companyId_key" ON "woocommerce_settings"("companyId");

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_companyId_idx" ON "woocommerce_sync_logs"("companyId");

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_startedAt_idx" ON "woocommerce_sync_logs"("startedAt");

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_status_idx" ON "woocommerce_sync_logs"("status");

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_syncType_idx" ON "woocommerce_sync_logs"("syncType");

-- CreateIndex
CREATE INDEX "purchase_invoice_items_productId_idx" ON "purchase_invoice_items"("productId");

-- CreateIndex
CREATE INDEX "purchase_invoice_items_purchaseInvoiceId_idx" ON "purchase_invoice_items"("purchaseInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoiceNumber_key" ON "purchase_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "purchase_invoices_companyId_idx" ON "purchase_invoices"("companyId");

-- CreateIndex
CREATE INDEX "purchase_invoices_invoiceDate_idx" ON "purchase_invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "purchase_invoices_purchaseOrderId_idx" ON "purchase_invoices"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_invoices_status_idx" ON "purchase_invoices"("status");

-- CreateIndex
CREATE INDEX "purchase_invoices_supplierId_idx" ON "purchase_invoices"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_order_items_productId_idx" ON "purchase_order_items"("productId");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_idx" ON "purchase_orders"("companyId");

-- CreateIndex
CREATE INDEX "purchase_orders_orderDate_idx" ON "purchase_orders"("orderDate");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_paymentNumber_key" ON "supplier_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "supplier_payments_companyId_idx" ON "supplier_payments"("companyId");

-- CreateIndex
CREATE INDEX "supplier_payments_paymentDate_idx" ON "supplier_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payments_purchaseInvoiceId_idx" ON "supplier_payments"("purchaseInvoiceId");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX "suppliers_companyId_idx" ON "suppliers"("companyId");

-- CreateIndex
CREATE INDEX "suppliers_isActive_idx" ON "suppliers"("isActive");

-- CreateIndex
CREATE INDEX "broadcast_campaigns_companyId_idx" ON "broadcast_campaigns"("companyId");

-- CreateIndex
CREATE INDEX "broadcast_campaigns_scheduledAt_idx" ON "broadcast_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "broadcast_campaigns_status_idx" ON "broadcast_campaigns"("status");

-- CreateIndex
CREATE INDEX "broadcast_recipients_campaignId_idx" ON "broadcast_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "broadcast_recipients_conversationId_idx" ON "broadcast_recipients"("conversationId");

-- CreateIndex
CREATE INDEX "broadcast_recipients_status_idx" ON "broadcast_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_settings_companyId_key" ON "broadcast_settings"("companyId");

-- CreateIndex
CREATE INDEX "facebook_ad_accounts_accountId_idx" ON "facebook_ad_accounts"("accountId");

-- CreateIndex
CREATE INDEX "facebook_ad_accounts_companyId_idx" ON "facebook_ad_accounts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_ad_accounts_companyId_accountId_key" ON "facebook_ad_accounts"("companyId", "accountId");

-- CreateIndex
CREATE INDEX "facebook_ad_insights_adId_idx" ON "facebook_ad_insights"("adId");

-- CreateIndex
CREATE INDEX "facebook_ad_insights_date_idx" ON "facebook_ad_insights"("date");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_ad_insights_adId_date_key" ON "facebook_ad_insights"("adId", "date");

-- CreateIndex
CREATE INDEX "facebook_ad_test_variants_adId_idx" ON "facebook_ad_test_variants"("adId");

-- CreateIndex
CREATE INDEX "facebook_ad_test_variants_adSetId_idx" ON "facebook_ad_test_variants"("adSetId");

-- CreateIndex
CREATE INDEX "facebook_ad_test_variants_testId_idx" ON "facebook_ad_test_variants"("testId");

-- CreateIndex
CREATE INDEX "facebook_ad_test_variants_variantType_idx" ON "facebook_ad_test_variants"("variantType");

-- CreateIndex
CREATE INDEX "facebook_ad_tests_campaignId_idx" ON "facebook_ad_tests"("campaignId");

-- CreateIndex
CREATE INDEX "facebook_ad_tests_companyId_idx" ON "facebook_ad_tests"("companyId");

-- CreateIndex
CREATE INDEX "facebook_ad_tests_status_idx" ON "facebook_ad_tests"("status");

-- CreateIndex
CREATE INDEX "facebook_ad_tests_testType_idx" ON "facebook_ad_tests"("testType");

-- CreateIndex
CREATE INDEX "facebook_ads_adSetId_idx" ON "facebook_ads"("adSetId");

-- CreateIndex
CREATE INDEX "facebook_ads_companyId_idx" ON "facebook_ads"("companyId");

-- CreateIndex
CREATE INDEX "facebook_ads_facebookAdId_idx" ON "facebook_ads"("facebookAdId");

-- CreateIndex
CREATE INDEX "facebook_ads_status_idx" ON "facebook_ads"("status");

-- CreateIndex
CREATE INDEX "facebook_adsets_campaignId_idx" ON "facebook_adsets"("campaignId");

-- CreateIndex
CREATE INDEX "facebook_adsets_facebookAdSetId_idx" ON "facebook_adsets"("facebookAdSetId");

-- CreateIndex
CREATE INDEX "facebook_adsets_status_idx" ON "facebook_adsets"("status");

-- CreateIndex
CREATE INDEX "facebook_campaigns_adAccountId_idx" ON "facebook_campaigns"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_campaigns_companyId_idx" ON "facebook_campaigns"("companyId");

-- CreateIndex
CREATE INDEX "facebook_campaigns_facebookCampaignId_idx" ON "facebook_campaigns"("facebookCampaignId");

-- CreateIndex
CREATE INDEX "facebook_campaigns_status_idx" ON "facebook_campaigns"("status");

-- CreateIndex
CREATE INDEX "facebook_catalog_products_catalogId_idx" ON "facebook_catalog_products"("catalogId");

-- CreateIndex
CREATE INDEX "facebook_catalog_products_facebookProductId_idx" ON "facebook_catalog_products"("facebookProductId");

-- CreateIndex
CREATE INDEX "facebook_catalog_products_productId_idx" ON "facebook_catalog_products"("productId");

-- CreateIndex
CREATE INDEX "facebook_catalog_products_syncStatus_idx" ON "facebook_catalog_products"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_catalog_products_catalogId_productId_key" ON "facebook_catalog_products"("catalogId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_catalog_products_catalogId_sku_key" ON "facebook_catalog_products"("catalogId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_comments_commentId_key" ON "facebook_comments"("commentId");

-- CreateIndex
CREATE INDEX "facebook_comments_commentId_idx" ON "facebook_comments"("commentId");

-- CreateIndex
CREATE INDEX "facebook_comments_companyId_idx" ON "facebook_comments"("companyId");

-- CreateIndex
CREATE INDEX "facebook_comments_createdTime_idx" ON "facebook_comments"("createdTime");

-- CreateIndex
CREATE INDEX "facebook_comments_postId_idx" ON "facebook_comments"("postId");

-- CreateIndex
CREATE INDEX "facebook_comments_senderId_idx" ON "facebook_comments"("senderId");

-- CreateIndex
CREATE INDEX "facebook_custom_audiences_adAccountId_idx" ON "facebook_custom_audiences"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_custom_audiences_companyId_idx" ON "facebook_custom_audiences"("companyId");

-- CreateIndex
CREATE INDEX "facebook_custom_audiences_facebookAudienceId_idx" ON "facebook_custom_audiences"("facebookAudienceId");

-- CreateIndex
CREATE INDEX "facebook_custom_audiences_status_idx" ON "facebook_custom_audiences"("status");

-- CreateIndex
CREATE INDEX "facebook_dynamic_ads_adSetId_idx" ON "facebook_dynamic_ads"("adSetId");

-- CreateIndex
CREATE INDEX "facebook_dynamic_ads_catalogId_idx" ON "facebook_dynamic_ads"("catalogId");

-- CreateIndex
CREATE INDEX "facebook_dynamic_ads_companyId_idx" ON "facebook_dynamic_ads"("companyId");

-- CreateIndex
CREATE INDEX "facebook_dynamic_ads_facebookAdId_idx" ON "facebook_dynamic_ads"("facebookAdId");

-- CreateIndex
CREATE INDEX "facebook_dynamic_ads_status_idx" ON "facebook_dynamic_ads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_dynamic_ads_companyId_facebookAdId_key" ON "facebook_dynamic_ads"("companyId", "facebookAdId");

-- CreateIndex
CREATE INDEX "facebook_lookalike_audiences_adAccountId_idx" ON "facebook_lookalike_audiences"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_lookalike_audiences_companyId_idx" ON "facebook_lookalike_audiences"("companyId");

-- CreateIndex
CREATE INDEX "facebook_lookalike_audiences_facebookAudienceId_idx" ON "facebook_lookalike_audiences"("facebookAudienceId");

-- CreateIndex
CREATE INDEX "facebook_lookalike_audiences_sourceAudienceId_idx" ON "facebook_lookalike_audiences"("sourceAudienceId");

-- CreateIndex
CREATE INDEX "facebook_lookalike_audiences_status_idx" ON "facebook_lookalike_audiences"("status");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_pages_pageId_key" ON "facebook_pages"("pageId");

-- CreateIndex
CREATE INDEX "facebook_pages_companyId_idx" ON "facebook_pages"("companyId");

-- CreateIndex
CREATE INDEX "facebook_pixel_configs_isActive_idx" ON "facebook_pixel_configs"("isActive");

-- CreateIndex
CREATE INDEX "facebook_pixel_configs_storefrontSettingsId_idx" ON "facebook_pixel_configs"("storefrontSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_pixel_configs_storefrontSettingsId_pixelId_key" ON "facebook_pixel_configs"("storefrontSettingsId", "pixelId");

-- CreateIndex
CREATE INDEX "facebook_product_catalogs_adAccountId_idx" ON "facebook_product_catalogs"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_product_catalogs_companyId_idx" ON "facebook_product_catalogs"("companyId");

-- CreateIndex
CREATE INDEX "facebook_product_catalogs_facebookCatalogId_idx" ON "facebook_product_catalogs"("facebookCatalogId");

-- CreateIndex
CREATE INDEX "facebook_product_catalogs_status_idx" ON "facebook_product_catalogs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_product_catalogs_companyId_facebookCatalogId_key" ON "facebook_product_catalogs"("companyId", "facebookCatalogId");

-- CreateIndex
CREATE INDEX "facebook_product_feeds_catalogId_idx" ON "facebook_product_feeds"("catalogId");

-- CreateIndex
CREATE INDEX "facebook_product_feeds_facebookFeedId_idx" ON "facebook_product_feeds"("facebookFeedId");

-- CreateIndex
CREATE INDEX "facebook_product_feeds_status_idx" ON "facebook_product_feeds"("status");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_companyId_category_createdAt_idx" ON "whatsapp_notification_logs"("companyId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_companyId_eventType_createdAt_idx" ON "whatsapp_notification_logs"("companyId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_companyId_status_createdAt_idx" ON "whatsapp_notification_logs"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_customerId_idx" ON "whatsapp_notification_logs"("customerId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_orderId_idx" ON "whatsapp_notification_logs"("orderId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_productId_idx" ON "whatsapp_notification_logs"("productId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_recipientPhone_companyId_idx" ON "whatsapp_notification_logs"("recipientPhone", "companyId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_logs_templateId_idx" ON "whatsapp_notification_logs"("templateId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_queue_companyId_status_idx" ON "whatsapp_notification_queue"("companyId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_notification_queue_status_scheduledAt_priority_idx" ON "whatsapp_notification_queue"("status", "scheduledAt", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_notification_settings_companyId_key" ON "whatsapp_notification_settings"("companyId");

-- CreateIndex
CREATE INDEX "whatsapp_notification_templates_companyId_category_idx" ON "whatsapp_notification_templates"("companyId", "category");

-- CreateIndex
CREATE INDEX "conversion_events_companyId_eventType_createdAt_idx" ON "conversion_events"("companyId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "conversion_events_sessionId_companyId_idx" ON "conversion_events"("sessionId", "companyId");

-- CreateIndex
CREATE INDEX "conversion_events_companyId_productId_eventType_createdAt_idx" ON "conversion_events"("companyId", "productId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "conversion_events_productId_companyId_idx" ON "conversion_events"("productId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_apps_slug_key" ON "marketplace_apps"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_apps_companyId_appId_key" ON "company_apps"("companyId", "appId");

-- CreateIndex
CREATE INDEX "app_usage_logs_companyAppId_idx" ON "app_usage_logs"("companyAppId");

-- CreateIndex
CREATE INDEX "app_usage_logs_createdAt_idx" ON "app_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "app_usage_logs_feature_idx" ON "app_usage_logs"("feature");

-- CreateIndex
CREATE INDEX "app_reviews_appId_idx" ON "app_reviews"("appId");

-- CreateIndex
CREATE INDEX "app_reviews_companyId_idx" ON "app_reviews"("companyId");

-- CreateIndex
CREATE INDEX "app_reviews_userId_idx" ON "app_reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "app_reviews_appId_companyId_key" ON "app_reviews"("appId", "companyId");

-- CreateIndex
CREATE INDEX "app_pricing_rules_appId_idx" ON "app_pricing_rules"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "app_bundles_slug_key" ON "app_bundles"("slug");

-- CreateIndex
CREATE INDEX "app_bundles_slug_idx" ON "app_bundles"("slug");

-- CreateIndex
CREATE INDEX "app_bundles_isActive_idx" ON "app_bundles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "company_wallets_companyId_key" ON "company_wallets"("companyId");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "enterprise_plans_companyId_idx" ON "enterprise_plans"("companyId");

-- CreateIndex
CREATE INDEX "image_gallery_companyId_idx" ON "image_gallery"("companyId");

-- CreateIndex
CREATE INDEX "image_gallery_createdAt_idx" ON "image_gallery"("createdAt");

-- CreateIndex
CREATE INDEX "image_gallery_userId_idx" ON "image_gallery"("userId");

-- CreateIndex
CREATE INDEX "media_files_conversationId_idx" ON "media_files"("conversationId");

-- CreateIndex
CREATE INDEX "media_files_fileType_idx" ON "media_files"("fileType");

-- CreateIndex
CREATE INDEX "text_gallery_companyId_idx" ON "text_gallery"("companyId");

-- CreateIndex
CREATE INDEX "text_gallery_createdAt_idx" ON "text_gallery"("createdAt");

-- CreateIndex
CREATE INDEX "text_gallery_userId_idx" ON "text_gallery"("userId");

-- CreateIndex
CREATE INDEX "image_studio_usage_companyId_idx" ON "image_studio_usage"("companyId");

-- CreateIndex
CREATE INDEX "image_studio_usage_date_idx" ON "image_studio_usage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "image_studio_usage_companyId_date_key" ON "image_studio_usage"("companyId", "date");

-- CreateIndex
CREATE INDEX "image_studio_history_companyId_idx" ON "image_studio_history"("companyId");

-- CreateIndex
CREATE INDEX "image_studio_history_createdAt_idx" ON "image_studio_history"("createdAt");

-- CreateIndex
CREATE INDEX "image_studio_history_status_idx" ON "image_studio_history"("status");

-- CreateIndex
CREATE INDEX "image_studio_history_userId_idx" ON "image_studio_history"("userId");

-- CreateIndex
CREATE INDEX "conversations_assignedUserId_idx" ON "conversations"("assignedUserId");

-- CreateIndex
CREATE INDEX "conversations_companyId_idx" ON "conversations"("companyId");

-- CreateIndex
CREATE INDEX "conversations_companyId_lastMessageAt_idx" ON "conversations"("companyId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_companyId_status_lastMessageAt_idx" ON "conversations"("companyId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_companyId_lastMessageIsFromCustomer_status_idx" ON "conversations"("companyId", "lastMessageIsFromCustomer", "status");

-- CreateIndex
CREATE INDEX "conversation_memory_companyId_conversationId_idx" ON "conversation_memory"("companyId", "conversationId");

-- CreateIndex
CREATE INDEX "conversation_memory_companyId_idx" ON "conversation_memory"("companyId");

-- CreateIndex
CREATE INDEX "conversation_memory_companyId_senderId_idx" ON "conversation_memory"("companyId", "senderId");

-- CreateIndex
CREATE INDEX "conversation_memory_conversationId_idx" ON "conversation_memory"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_memory_senderId_idx" ON "conversation_memory"("senderId");

-- CreateIndex
CREATE INDEX "conversation_memory_timestamp_idx" ON "conversation_memory"("timestamp");

-- CreateIndex
CREATE INDEX "conversation_outcomes_companyId_idx" ON "conversation_outcomes"("companyId");

-- CreateIndex
CREATE INDEX "conversation_outcomes_conversationId_idx" ON "conversation_outcomes"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_outcomes_createdAt_idx" ON "conversation_outcomes"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_outcomes_customerId_idx" ON "conversation_outcomes"("customerId");

-- CreateIndex
CREATE INDEX "conversation_outcomes_outcome_idx" ON "conversation_outcomes"("outcome");

-- CreateIndex
CREATE INDEX "messages_conversationId_isFromCustomer_createdAt_idx" ON "messages"("conversationId", "isFromCustomer", "createdAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_isFromCustomer_idx" ON "messages"("isFromCustomer");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "sent_message_stats_messageId_key" ON "sent_message_stats"("messageId");

-- CreateIndex
CREATE INDEX "sent_message_stats_companyId_idx" ON "sent_message_stats"("companyId");

-- CreateIndex
CREATE INDEX "sent_message_stats_companyId_sentAt_idx" ON "sent_message_stats"("companyId", "sentAt");

-- CreateIndex
CREATE INDEX "sent_message_stats_conversationStatus_idx" ON "sent_message_stats"("conversationStatus");

-- CreateIndex
CREATE INDEX "sent_message_stats_messageStatus_idx" ON "sent_message_stats"("messageStatus");

-- CreateIndex
CREATE INDEX "sent_message_stats_recipientFacebookId_idx" ON "sent_message_stats"("recipientFacebookId");

-- CreateIndex
CREATE INDEX "sent_message_stats_sentAt_idx" ON "sent_message_stats"("sentAt");

-- CreateIndex
CREATE INDEX "sent_message_stats_companyId_sentAt_messageStatus_idx" ON "sent_message_stats"("companyId", "sentAt", "messageStatus");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_category_idx" ON "whatsapp_contacts"("category");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_customerId_idx" ON "whatsapp_contacts"("customerId");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_lastMessageAt_idx" ON "whatsapp_contacts"("lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_phoneNumber_idx" ON "whatsapp_contacts"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_sessionId_idx" ON "whatsapp_contacts"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_sessionId_jid_key" ON "whatsapp_contacts"("sessionId", "jid");

-- CreateIndex
CREATE INDEX "whatsapp_event_logs_companyId_idx" ON "whatsapp_event_logs"("companyId");

-- CreateIndex
CREATE INDEX "whatsapp_event_logs_createdAt_idx" ON "whatsapp_event_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_event_logs_eventType_idx" ON "whatsapp_event_logs"("eventType");

-- CreateIndex
CREATE INDEX "whatsapp_event_logs_sessionId_idx" ON "whatsapp_event_logs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_messageId_key" ON "whatsapp_messages"("messageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_createdAt_idx" ON "whatsapp_messages"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_remoteJid_idx" ON "whatsapp_messages"("remoteJid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_senderId_idx" ON "whatsapp_messages"("senderId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_sessionId_idx" ON "whatsapp_messages"("sessionId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_sessionId_remoteJid_idx" ON "whatsapp_messages"("sessionId", "remoteJid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_sessionId_timestamp_idx" ON "whatsapp_messages"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "whatsapp_messages_timestamp_idx" ON "whatsapp_messages"("timestamp");

-- CreateIndex
CREATE INDEX "whatsapp_quick_replies_category_idx" ON "whatsapp_quick_replies"("category");

-- CreateIndex
CREATE INDEX "whatsapp_quick_replies_companyId_idx" ON "whatsapp_quick_replies"("companyId");

-- CreateIndex
CREATE INDEX "whatsapp_quick_replies_isActive_idx" ON "whatsapp_quick_replies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_quick_replies_companyId_shortcut_key" ON "whatsapp_quick_replies"("companyId", "shortcut");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_companyId_idx" ON "whatsapp_sessions"("companyId");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_phoneNumber_idx" ON "whatsapp_sessions"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_status_idx" ON "whatsapp_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_settings_companyId_key" ON "whatsapp_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_statuses_messageId_key" ON "whatsapp_statuses"("messageId");

-- CreateIndex
CREATE INDEX "whatsapp_statuses_expiresAt_idx" ON "whatsapp_statuses"("expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_statuses_remoteJid_idx" ON "whatsapp_statuses"("remoteJid");

-- CreateIndex
CREATE INDEX "whatsapp_statuses_sessionId_idx" ON "whatsapp_statuses"("sessionId");

-- CreateIndex
CREATE INDEX "whatsapp_statuses_timestamp_idx" ON "whatsapp_statuses"("timestamp");

-- CreateIndex
CREATE INDEX "excluded_models_companyId_idx" ON "excluded_models"("companyId");

-- CreateIndex
CREATE INDEX "excluded_models_modelName_keyId_idx" ON "excluded_models"("modelName", "keyId");

-- CreateIndex
CREATE INDEX "excluded_models_retryAt_idx" ON "excluded_models"("retryAt");

-- CreateIndex
CREATE INDEX "inventory_productId_idx" ON "inventory"("productId");

-- CreateIndex
CREATE INDEX "inventory_warehouseId_idx" ON "inventory"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_warehouseId_batchNumber_key" ON "inventory"("productId", "warehouseId", "batchNumber");

-- CreateIndex
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base"("category");

-- CreateIndex
CREATE INDEX "knowledge_base_isActive_idx" ON "knowledge_base"("isActive");

-- CreateIndex
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "post_tracking_companyId_idx" ON "post_tracking"("companyId");

-- CreateIndex
CREATE INDEX "post_tracking_lastVisitAt_idx" ON "post_tracking"("lastVisitAt");

-- CreateIndex
CREATE INDEX "post_tracking_postId_idx" ON "post_tracking"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_tracking_postId_companyId_key" ON "post_tracking"("postId", "companyId");

-- CreateIndex
CREATE INDEX "recently_viewed_companyId_idx" ON "recently_viewed"("companyId");

-- CreateIndex
CREATE INDEX "recently_viewed_productId_idx" ON "recently_viewed"("productId");

-- CreateIndex
CREATE INDEX "recently_viewed_sessionId_companyId_idx" ON "recently_viewed"("sessionId", "companyId");

-- CreateIndex
CREATE INDEX "recently_viewed_viewedAt_idx" ON "recently_viewed"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recently_viewed_sessionId_productId_companyId_key" ON "recently_viewed"("sessionId", "productId", "companyId");

-- CreateIndex
CREATE INDEX "response_effectiveness_companyId_idx" ON "response_effectiveness"("companyId");

-- CreateIndex
CREATE INDEX "response_effectiveness_conversationId_idx" ON "response_effectiveness"("conversationId");

-- CreateIndex
CREATE INDEX "response_effectiveness_createdAt_idx" ON "response_effectiveness"("createdAt");

-- CreateIndex
CREATE INDEX "response_effectiveness_effectivenessScore_idx" ON "response_effectiveness"("effectivenessScore");

-- CreateIndex
CREATE INDEX "response_effectiveness_leadToPurchase_idx" ON "response_effectiveness"("leadToPurchase");

-- CreateIndex
CREATE INDEX "response_effectiveness_responseType_idx" ON "response_effectiveness"("responseType");

-- CreateIndex
CREATE INDEX "skipped_facebook_pages_attemptedCompanyId_idx" ON "skipped_facebook_pages"("attemptedCompanyId");

-- CreateIndex
CREATE INDEX "skipped_facebook_pages_createdAt_idx" ON "skipped_facebook_pages"("createdAt");

-- CreateIndex
CREATE INDEX "skipped_facebook_pages_isResolved_idx" ON "skipped_facebook_pages"("isResolved");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_companyId_idx" ON "faqs"("companyId");

-- CreateIndex
CREATE INDEX "faqs_companyId_isActive_idx" ON "faqs"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "faqs_isActive_idx" ON "faqs"("isActive");

-- CreateIndex
CREATE INDEX "rag_performance_companyId_createdAt_idx" ON "rag_performance"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "rag_performance_companyId_idx" ON "rag_performance"("companyId");

-- CreateIndex
CREATE INDEX "rag_performance_errorOccurred_idx" ON "rag_performance"("errorOccurred");

-- CreateIndex
CREATE INDEX "rag_performance_operation_idx" ON "rag_performance"("operation");

-- CreateIndex
CREATE INDEX "rag_rate_limits_companyId_idx" ON "rag_rate_limits"("companyId");

-- CreateIndex
CREATE INDEX "rag_rate_limits_ipAddress_idx" ON "rag_rate_limits"("ipAddress");

-- CreateIndex
CREATE INDEX "rag_rate_limits_windowStart_idx" ON "rag_rate_limits"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "rag_rate_limits_companyId_ipAddress_windowStart_key" ON "rag_rate_limits"("companyId", "ipAddress", "windowStart");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "appointments_companyId_idx" ON "appointments"("companyId");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_staffId_idx" ON "appointments"("staffId");

-- CreateIndex
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_notification_preferences_companyId_employeeId_key" ON "employee_notification_preferences"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_notification_preferences_companyId_phone_key" ON "employee_notification_preferences"("companyId", "phone");

-- CreateIndex
CREATE INDEX "store_visits_companyId_visitedAt_idx" ON "store_visits"("companyId", "visitedAt");

-- CreateIndex
CREATE INDEX "store_visits_sessionId_companyId_idx" ON "store_visits"("sessionId", "companyId");

-- CreateIndex
CREATE INDEX "dev_member_badges_memberId_idx" ON "dev_member_badges"("memberId");

-- CreateIndex
CREATE INDEX "queue_metrics_timestamp_idx" ON "queue_metrics"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "order_workflow_configs_companyId_key" ON "order_workflow_configs"("companyId");

-- CreateIndex
CREATE INDEX "order_status_definitions_companyId_idx" ON "order_status_definitions"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "order_status_definitions_companyId_code_key" ON "order_status_definitions"("companyId", "code");

-- CreateIndex
CREATE INDEX "order_workflow_transitions_companyId_idx" ON "order_workflow_transitions"("companyId");

-- CreateIndex
CREATE INDEX "order_workflow_transitions_fromStatusId_idx" ON "order_workflow_transitions"("fromStatusId");

-- CreateIndex
CREATE INDEX "order_workflow_transitions_toStatusId_idx" ON "order_workflow_transitions"("toStatusId");

-- CreateIndex
CREATE INDEX "order_status_change_requests_companyId_idx" ON "order_status_change_requests"("companyId");

-- CreateIndex
CREATE INDEX "order_status_change_requests_orderId_idx" ON "order_status_change_requests"("orderId");

-- CreateIndex
CREATE INDEX "order_status_change_requests_status_idx" ON "order_status_change_requests"("status");

-- CreateIndex
CREATE INDEX "order_workflow_audit_logs_companyId_idx" ON "order_workflow_audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "order_workflow_audit_logs_orderId_idx" ON "order_workflow_audit_logs"("orderId");

-- CreateIndex
CREATE INDEX "order_workflow_audit_logs_createdAt_idx" ON "order_workflow_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");

-- CreateIndex
CREATE INDEX "branches_isActive_idx" ON "branches"("isActive");

-- CreateIndex
CREATE INDEX "delivery_options_companyId_idx" ON "delivery_options"("companyId");

-- CreateIndex
CREATE INDEX "delivery_options_isActive_idx" ON "delivery_options"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "guest_carts_cartId_key" ON "guest_carts"("cartId");

-- CreateIndex
CREATE INDEX "guest_carts_cartId_idx" ON "guest_carts"("cartId");

-- CreateIndex
CREATE INDEX "guest_carts_companyId_idx" ON "guest_carts"("companyId");

-- CreateIndex
CREATE INDEX "guest_carts_expiresAt_idx" ON "guest_carts"("expiresAt");

-- CreateIndex
CREATE INDEX "guest_orders_affiliateId_idx" ON "guest_orders"("affiliateId");

-- CreateIndex
CREATE INDEX "guest_orders_companyId_idx" ON "guest_orders"("companyId");

-- CreateIndex
CREATE INDEX "guest_orders_createdAt_idx" ON "guest_orders"("createdAt");

-- CreateIndex
CREATE INDEX "guest_orders_createdBy_idx" ON "guest_orders"("createdBy");

-- CreateIndex
CREATE INDEX "guest_orders_guestEmail_idx" ON "guest_orders"("guestEmail");

-- CreateIndex
CREATE INDEX "guest_orders_orderNumber_idx" ON "guest_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "guest_orders_status_idx" ON "guest_orders"("status");

-- CreateIndex
CREATE INDEX "guest_orders_turboShipmentId_idx" ON "guest_orders"("turboShipmentId");

-- CreateIndex
CREATE INDEX "guest_orders_turboTrackingNumber_idx" ON "guest_orders"("turboTrackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "guest_orders_companyId_orderNumber_key" ON "guest_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- CreateIndex
CREATE INDEX "order_notes_authorId_idx" ON "order_notes"("authorId");

-- CreateIndex
CREATE INDEX "order_notes_guestOrderId_idx" ON "order_notes"("guestOrderId");

-- CreateIndex
CREATE INDEX "order_notes_orderId_idx" ON "order_notes"("orderId");

-- CreateIndex
CREATE INDEX "order_status_configs_companyId_idx" ON "order_status_configs"("companyId");

-- CreateIndex
CREATE INDEX "order_status_configs_source_idx" ON "order_status_configs"("source");

-- CreateIndex
CREATE INDEX "order_status_configs_statusType_idx" ON "order_status_configs"("statusType");

-- CreateIndex
CREATE UNIQUE INDEX "order_status_configs_companyId_code_key" ON "order_status_configs"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_affiliateReferralId_key" ON "orders"("affiliateReferralId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_merchantOrderId_key" ON "orders"("merchantOrderId");

-- CreateIndex
CREATE INDEX "orders_affiliateId_idx" ON "orders"("affiliateId");

-- CreateIndex
CREATE INDEX "orders_companyId_idx" ON "orders"("companyId");

-- CreateIndex
CREATE INDEX "orders_conversationId_idx" ON "orders"("conversationId");

-- CreateIndex
CREATE INDEX "orders_createdBy_idx" ON "orders"("createdBy");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_isScheduled_idx" ON "orders"("isScheduled");

-- CreateIndex
CREATE INDEX "orders_orderSource_idx" ON "orders"("orderSource");

-- CreateIndex
CREATE INDEX "orders_scheduledDeliveryDate_idx" ON "orders"("scheduledDeliveryDate");

-- CreateIndex
CREATE INDEX "orders_turboTrackingNumber_idx" ON "orders"("turboTrackingNumber");

-- CreateIndex
CREATE INDEX "orders_wooCommerceId_idx" ON "orders"("wooCommerceId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_companyId_orderNumber_key" ON "orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "payment_receipts_invoiceId_idx" ON "payment_receipts"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_receipts_walletNumberId_idx" ON "payment_receipts"("walletNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "shipping_zones_companyId_idx" ON "shipping_zones"("companyId");

-- CreateIndex
CREATE INDEX "shipping_zones_isActive_idx" ON "shipping_zones"("isActive");

-- CreateIndex
CREATE INDEX "shipping_zones_pricingType_idx" ON "shipping_zones"("pricingType");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_guestOrderId_idx" ON "OrderStatusHistory"("guestOrderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_invoice_settings_companyId_key" ON "order_invoice_settings"("companyId");

-- CreateIndex
CREATE INDEX "order_invoice_settings_companyId_idx" ON "order_invoice_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "order_invoices_invoiceNumber_key" ON "order_invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "order_invoices_orderId_key" ON "order_invoices"("orderId");

-- CreateIndex
CREATE INDEX "order_invoices_companyId_idx" ON "order_invoices"("companyId");

-- CreateIndex
CREATE INDEX "order_invoices_invoiceNumber_idx" ON "order_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "order_invoices_issueDate_idx" ON "order_invoices"("issueDate");

-- CreateIndex
CREATE INDEX "order_invoices_orderId_idx" ON "order_invoices"("orderId");

-- CreateIndex
CREATE INDEX "order_invoices_paymentStatus_idx" ON "order_invoices"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "platform_partners_userId_key" ON "platform_partners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_partners_partnerCode_key" ON "platform_partners"("partnerCode");

-- CreateIndex
CREATE INDEX "platform_partners_partnerCode_idx" ON "platform_partners"("partnerCode");

-- CreateIndex
CREATE INDEX "platform_partners_parentPartnerId_idx" ON "platform_partners"("parentPartnerId");

-- CreateIndex
CREATE INDEX "platform_partners_title_idx" ON "platform_partners"("title");

-- CreateIndex
CREATE INDEX "platform_partners_status_idx" ON "platform_partners"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partner_referred_companies_companyId_key" ON "partner_referred_companies"("companyId");

-- CreateIndex
CREATE INDEX "partner_referred_companies_partnerId_idx" ON "partner_referred_companies"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commissions_billingHistoryId_key" ON "partner_commissions"("billingHistoryId");

-- CreateIndex
CREATE INDEX "partner_commissions_partnerId_idx" ON "partner_commissions"("partnerId");

-- CreateIndex
CREATE INDEX "partner_commissions_companyId_idx" ON "partner_commissions"("companyId");

-- CreateIndex
CREATE INDEX "partner_commissions_status_idx" ON "partner_commissions"("status");

-- CreateIndex
CREATE INDEX "partner_payouts_partnerId_idx" ON "partner_payouts"("partnerId");

-- CreateIndex
CREATE INDEX "partner_payouts_status_idx" ON "partner_payouts"("status");

-- CreateIndex
CREATE INDEX "customers_companyId_idx" ON "customers"("companyId");

-- CreateIndex
CREATE INDEX "customers_companyId_status_idx" ON "customers"("companyId", "status");

-- CreateIndex
CREATE INDEX "customers_facebookId_idx" ON "customers"("facebookId");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_facebookId_companyId_key" ON "customers"("facebookId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_telegramId_companyId_key" ON "customers"("telegramId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_whatsappId_companyId_key" ON "customers"("whatsappId", "companyId");

-- CreateIndex
CREATE INDEX "blocked_customers_on_page_customerId_idx" ON "blocked_customers_on_page"("customerId");

-- CreateIndex
CREATE INDEX "blocked_customers_on_page_facebookId_idx" ON "blocked_customers_on_page"("facebookId");

-- CreateIndex
CREATE INDEX "blocked_customers_on_page_facebookPageId_idx" ON "blocked_customers_on_page"("facebookPageId");

-- CreateIndex
CREATE INDEX "blocked_customers_on_page_pageId_idx" ON "blocked_customers_on_page"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_customers_on_page_facebookPageId_customerId_key" ON "blocked_customers_on_page"("facebookPageId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_customers_on_page_pageId_facebookId_key" ON "blocked_customers_on_page"("pageId", "facebookId");

-- CreateIndex
CREATE INDEX "categories_companyId_idx" ON "categories"("companyId");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_companyId_slug_key" ON "categories"("companyId", "slug");

-- CreateIndex
CREATE INDEX "coupon_usages_companyId_idx" ON "coupon_usages"("companyId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_customerId_idx" ON "coupon_usages"("customerId");

-- CreateIndex
CREATE INDEX "coupon_usages_orderId_idx" ON "coupon_usages"("orderId");

-- CreateIndex
CREATE INDEX "coupon_usages_usedAt_idx" ON "coupon_usages"("usedAt");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_companyId_idx" ON "coupons"("companyId");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "coupons_validFrom_validTo_idx" ON "coupons"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_companyId_code_key" ON "coupons"("companyId", "code");

-- CreateIndex
CREATE INDEX "customer_lists_companyId_idx" ON "customer_lists"("companyId");

-- CreateIndex
CREATE INDEX "customer_notes_authorId_idx" ON "customer_notes"("authorId");

-- CreateIndex
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes"("customerId");

-- CreateIndex
CREATE INDEX "product_reviews_companyId_idx" ON "product_reviews"("companyId");

-- CreateIndex
CREATE INDEX "product_reviews_isApproved_idx" ON "product_reviews"("isApproved");

-- CreateIndex
CREATE INDEX "product_reviews_productId_idx" ON "product_reviews"("productId");

-- CreateIndex
CREATE INDEX "product_reviews_rating_idx" ON "product_reviews"("rating");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_sku_key" ON "product_variants"("productId", "sku");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_companyId_idx" ON "products"("companyId");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_wooCommerceId_idx" ON "products"("wooCommerceId");

-- CreateIndex
CREATE INDEX "products_externalId_idx" ON "products"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_sku_key" ON "products"("companyId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_slug_key" ON "products"("companyId", "slug");

-- CreateIndex
CREATE INDEX "wishlists_companyId_idx" ON "wishlists"("companyId");

-- CreateIndex
CREATE INDEX "wishlists_customerId_idx" ON "wishlists"("customerId");

-- CreateIndex
CREATE INDEX "wishlists_productId_idx" ON "wishlists"("productId");

-- CreateIndex
CREATE INDEX "wishlists_sessionId_idx" ON "wishlists"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_sessionId_productId_variantId_companyId_key" ON "wishlists"("sessionId", "productId", "variantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_wallets_customerId_key" ON "customer_wallets"("customerId");

-- CreateIndex
CREATE INDEX "customer_wallets_companyId_idx" ON "customer_wallets"("companyId");

-- CreateIndex
CREATE INDEX "customer_loyalty_programs_companyId_idx" ON "customer_loyalty_programs"("companyId");

-- CreateIndex
CREATE INDEX "customer_loyalty_programs_status_idx" ON "customer_loyalty_programs"("status");

-- CreateIndex
CREATE INDEX "customer_loyalty_programs_type_idx" ON "customer_loyalty_programs"("type");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_companyId_idx" ON "customer_loyalty_records"("companyId");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_customerId_idx" ON "customer_loyalty_records"("customerId");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_lastActivity_idx" ON "customer_loyalty_records"("lastActivity");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_programId_idx" ON "customer_loyalty_records"("programId");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_status_idx" ON "customer_loyalty_records"("status");

-- CreateIndex
CREATE INDEX "customer_loyalty_records_tierId_idx" ON "customer_loyalty_records"("tierId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_records_customerId_programId_key" ON "customer_loyalty_records"("customerId", "programId");

-- CreateIndex
CREATE INDEX "customer_loyalty_tiers_companyId_idx" ON "customer_loyalty_tiers"("companyId");

-- CreateIndex
CREATE INDEX "customer_loyalty_tiers_minPoints_idx" ON "customer_loyalty_tiers"("minPoints");

-- CreateIndex
CREATE INDEX "customer_loyalty_tiers_programId_idx" ON "customer_loyalty_tiers"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_customerId_key" ON "customer_notification_preferences"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_companyId_customerId_key" ON "customer_notification_preferences"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_companyId_phone_key" ON "customer_notification_preferences"("companyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_orders_orderId_key" ON "merchant_orders"("orderId");

-- CreateIndex
CREATE INDEX "merchant_orders_merchantId_idx" ON "merchant_orders"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_orders_orderId_idx" ON "merchant_orders"("orderId");

-- CreateIndex
CREATE INDEX "merchant_orders_status_idx" ON "merchant_orders"("status");

-- CreateIndex
CREATE INDEX "merchant_products_merchantId_idx" ON "merchant_products"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_products_productId_idx" ON "merchant_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_products_merchantId_productId_key" ON "merchant_products"("merchantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_apiKey_key" ON "Merchant"("apiKey");

-- CreateIndex
CREATE INDEX "Merchant_companyId_idx" ON "Merchant"("companyId");

-- CreateIndex
CREATE INDEX "Merchant_isActive_idx" ON "Merchant"("isActive");

-- CreateIndex
CREATE INDEX "product_visits_companyId_productId_visitedAt_idx" ON "product_visits"("companyId", "productId", "visitedAt");

-- CreateIndex
CREATE INDEX "product_visits_sessionId_companyId_idx" ON "product_visits"("sessionId", "companyId");

-- CreateIndex
CREATE INDEX "return_reason_categories_companyId_idx" ON "return_reason_categories"("companyId");

-- CreateIndex
CREATE INDEX "shipping_methods_isEnabled_idx" ON "shipping_methods"("isEnabled");

-- CreateIndex
CREATE INDEX "shipping_methods_zoneId_idx" ON "shipping_methods"("zoneId");

-- CreateIndex
CREATE INDEX "hr_job_postings_companyId_idx" ON "hr_job_postings"("companyId");

-- CreateIndex
CREATE INDEX "hr_applicants_companyId_idx" ON "hr_applicants"("companyId");

-- CreateIndex
CREATE INDEX "hr_applicants_jobId_idx" ON "hr_applicants"("jobId");

-- CreateIndex
CREATE INDEX "hr_interviews_companyId_idx" ON "hr_interviews"("companyId");

-- CreateIndex
CREATE INDEX "hr_interviews_applicantId_idx" ON "hr_interviews"("applicantId");

-- CreateIndex
CREATE INDEX "return_reasons_categoryId_idx" ON "return_reasons"("categoryId");

-- CreateIndex
CREATE INDEX "return_reasons_companyId_idx" ON "return_reasons"("companyId");

-- CreateIndex
CREATE INDEX "return_requests_assignedTo_idx" ON "return_requests"("assignedTo");

-- CreateIndex
CREATE INDEX "return_requests_companyId_idx" ON "return_requests"("companyId");

-- CreateIndex
CREATE INDEX "return_requests_customerId_idx" ON "return_requests"("customerId");

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");

-- CreateIndex
CREATE INDEX "return_requests_reasonId_idx" ON "return_requests"("reasonId");

-- CreateIndex
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");

-- CreateIndex
CREATE INDEX "return_contact_attempts_returnRequestId_idx" ON "return_contact_attempts"("returnRequestId");

-- CreateIndex
CREATE INDEX "return_contact_attempts_userId_idx" ON "return_contact_attempts"("userId");

-- CreateIndex
CREATE INDEX "return_activity_logs_returnRequestId_idx" ON "return_activity_logs"("returnRequestId");

-- CreateIndex
CREATE INDEX "return_activity_logs_userId_idx" ON "return_activity_logs"("userId");

-- CreateIndex
CREATE INDEX "call_attempt_logs_orderId_idx" ON "call_attempt_logs"("orderId");

-- CreateIndex
CREATE INDEX "call_attempt_logs_userId_idx" ON "call_attempt_logs"("userId");

-- CreateIndex
CREATE INDEX "sent_message_daily_summaries_companyId_date_idx" ON "sent_message_daily_summaries"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sent_message_daily_summaries_companyId_facebookPageId_date_key" ON "sent_message_daily_summaries"("companyId", "facebookPageId", "date");

-- CreateIndex
CREATE INDEX "PromptTemplate_companyId_idx" ON "PromptTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_companyId_key_key" ON "PromptTemplate"("companyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_form_settings_companyId_key" ON "checkout_form_settings"("companyId");

-- CreateIndex
CREATE INDEX "checkout_form_settings_companyId_idx" ON "checkout_form_settings"("companyId");

-- CreateIndex
CREATE INDEX "few_shot_examples_category_idx" ON "few_shot_examples"("category");

-- CreateIndex
CREATE INDEX "few_shot_examples_companyId_idx" ON "few_shot_examples"("companyId");

-- CreateIndex
CREATE INDEX "few_shot_examples_isActive_idx" ON "few_shot_examples"("isActive");

-- CreateIndex
CREATE INDEX "few_shot_examples_priority_idx" ON "few_shot_examples"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "few_shot_settings_companyId_key" ON "few_shot_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "footer_settings_companyId_key" ON "footer_settings"("companyId");

-- CreateIndex
CREATE INDEX "footer_settings_companyId_idx" ON "footer_settings"("companyId");

-- CreateIndex
CREATE INDEX "homepage_templates_companyId_idx" ON "homepage_templates"("companyId");

-- CreateIndex
CREATE INDEX "homepage_templates_isActive_idx" ON "homepage_templates"("isActive");

-- CreateIndex
CREATE INDEX "page_response_settings_companyId_idx" ON "page_response_settings"("companyId");

-- CreateIndex
CREATE INDEX "page_response_settings_pageId_idx" ON "page_response_settings"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "page_response_settings_pageId_companyId_key" ON "page_response_settings"("pageId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_configurations_planType_key" ON "plan_configurations"("planType");

-- CreateIndex
CREATE INDEX "post_response_settings_companyId_idx" ON "post_response_settings"("companyId");

-- CreateIndex
CREATE INDEX "post_response_settings_featuredProductId_idx" ON "post_response_settings"("featuredProductId");

-- CreateIndex
CREATE INDEX "post_response_settings_postId_idx" ON "post_response_settings"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_response_settings_postId_companyId_key" ON "post_response_settings"("postId", "companyId");

-- CreateIndex
CREATE INDEX "prompt_library_businessType_idx" ON "prompt_library"("businessType");

-- CreateIndex
CREATE INDEX "prompt_library_category_idx" ON "prompt_library"("category");

-- CreateIndex
CREATE INDEX "prompt_library_isActive_idx" ON "prompt_library"("isActive");

-- CreateIndex
CREATE INDEX "prompt_library_isFeatured_idx" ON "prompt_library"("isFeatured");

-- CreateIndex
CREATE INDEX "store_pages_companyId_idx" ON "store_pages"("companyId");

-- CreateIndex
CREATE INDEX "store_pages_isActive_idx" ON "store_pages"("isActive");

-- CreateIndex
CREATE INDEX "store_pages_slug_idx" ON "store_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_pages_companyId_slug_key" ON "store_pages"("companyId", "slug");

-- CreateIndex
CREATE INDEX "landing_pages_companyId_idx" ON "landing_pages"("companyId");

-- CreateIndex
CREATE INDEX "landing_pages_productId_idx" ON "landing_pages"("productId");

-- CreateIndex
CREATE INDEX "landing_pages_slug_idx" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_isPublished_idx" ON "landing_pages"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_companyId_slug_key" ON "landing_pages"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_promotion_settings_companyId_key" ON "store_promotion_settings"("companyId");

-- CreateIndex
CREATE INDEX "store_promotion_settings_companyId_idx" ON "store_promotion_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "storefront_settings_companyId_key" ON "storefront_settings"("companyId");

-- CreateIndex
CREATE INDEX "storefront_settings_companyId_idx" ON "storefront_settings"("companyId");

-- CreateIndex
CREATE INDEX "storefront_settings_facebookConvApiEnabled_idx" ON "storefront_settings"("facebookConvApiEnabled");

-- CreateIndex
CREATE INDEX "storefront_settings_facebookPixelEnabled_idx" ON "storefront_settings"("facebookPixelEnabled");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_idx" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "system_prompts_companyId_idx" ON "system_prompts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_systemName_key" ON "system_settings"("systemName");

-- CreateIndex
CREATE UNIQUE INDEX "return_settings_companyId_key" ON "return_settings"("companyId");

-- CreateIndex
CREATE INDEX "return_settings_companyId_idx" ON "return_settings"("companyId");

-- CreateIndex
CREATE INDEX "shipping_companies_companyId_idx" ON "shipping_companies"("companyId");

-- CreateIndex
CREATE INDEX "shipping_companies_isActive_idx" ON "shipping_companies"("isActive");

-- CreateIndex
CREATE INDEX "shipping_companies_slug_idx" ON "shipping_companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_companies_companyId_slug_key" ON "shipping_companies"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketId_key" ON "SupportTicket"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedUserId_idx" ON "SupportTicket"("assignedUserId");

-- CreateIndex
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_idx" ON "SupportTicket"("companyId");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_senderId_idx" ON "SupportMessage"("senderId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAttachment_messageId_idx" ON "SupportAttachment"("messageId");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "dev_notifications_createdAt_idx" ON "dev_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "dev_notifications_isRead_idx" ON "dev_notifications"("isRead");

-- CreateIndex
CREATE INDEX "dev_notifications_memberId_idx" ON "dev_notifications"("memberId");

-- CreateIndex
CREATE INDEX "dev_projects_managerId_idx" ON "dev_projects"("managerId");

-- CreateIndex
CREATE INDEX "dev_projects_priority_idx" ON "dev_projects"("priority");

-- CreateIndex
CREATE INDEX "dev_projects_status_idx" ON "dev_projects"("status");

-- CreateIndex
CREATE INDEX "dev_releases_projectId_idx" ON "dev_releases"("projectId");

-- CreateIndex
CREATE INDEX "dev_releases_releaseDate_idx" ON "dev_releases"("releaseDate");

-- CreateIndex
CREATE INDEX "dev_releases_status_idx" ON "dev_releases"("status");

-- CreateIndex
CREATE INDEX "dev_task_activities_action_idx" ON "dev_task_activities"("action");

-- CreateIndex
CREATE INDEX "dev_task_activities_createdAt_idx" ON "dev_task_activities"("createdAt");

-- CreateIndex
CREATE INDEX "dev_task_activities_memberId_idx" ON "dev_task_activities"("memberId");

-- CreateIndex
CREATE INDEX "dev_task_activities_taskId_idx" ON "dev_task_activities"("taskId");

-- CreateIndex
CREATE INDEX "dev_task_attachments_taskId_idx" ON "dev_task_attachments"("taskId");

-- CreateIndex
CREATE INDEX "dev_task_checklist_items_checklistId_idx" ON "dev_task_checklist_items"("checklistId");

-- CreateIndex
CREATE INDEX "dev_task_checklists_taskId_idx" ON "dev_task_checklists"("taskId");

-- CreateIndex
CREATE INDEX "dev_task_comments_authorId_idx" ON "dev_task_comments"("authorId");

-- CreateIndex
CREATE INDEX "dev_task_comments_parentCommentId_idx" ON "dev_task_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "dev_task_comments_taskId_idx" ON "dev_task_comments"("taskId");

-- CreateIndex
CREATE INDEX "dev_task_watchers_memberId_idx" ON "dev_task_watchers"("memberId");

-- CreateIndex
CREATE INDEX "dev_task_watchers_taskId_idx" ON "dev_task_watchers"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "dev_task_watchers_taskId_memberId_key" ON "dev_task_watchers"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "dev_tasks_assigneeId_idx" ON "dev_tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "dev_tasks_component_idx" ON "dev_tasks"("component");

-- CreateIndex
CREATE INDEX "dev_tasks_dueDate_idx" ON "dev_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "dev_tasks_order_idx" ON "dev_tasks"("order");

-- CreateIndex
CREATE INDEX "dev_tasks_parentTaskId_idx" ON "dev_tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "dev_tasks_priority_idx" ON "dev_tasks"("priority");

-- CreateIndex
CREATE INDEX "dev_tasks_projectId_idx" ON "dev_tasks"("projectId");

-- CreateIndex
CREATE INDEX "dev_tasks_releaseId_idx" ON "dev_tasks"("releaseId");

-- CreateIndex
CREATE INDEX "dev_tasks_reporterId_idx" ON "dev_tasks"("reporterId");

-- CreateIndex
CREATE INDEX "dev_tasks_status_idx" ON "dev_tasks"("status");

-- CreateIndex
CREATE INDEX "dev_tasks_type_idx" ON "dev_tasks"("type");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_managerId_idx" ON "Project"("managerId");

-- CreateIndex
CREATE INDEX "Project_priority_idx" ON "Project"("priority");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "task_activities_companyId_idx" ON "task_activities"("companyId");

-- CreateIndex
CREATE INDEX "task_activities_createdAt_idx" ON "task_activities"("createdAt");

-- CreateIndex
CREATE INDEX "task_activities_taskId_idx" ON "task_activities"("taskId");

-- CreateIndex
CREATE INDEX "task_activities_userId_idx" ON "task_activities"("userId");

-- CreateIndex
CREATE INDEX "task_attachments_companyId_idx" ON "task_attachments"("companyId");

-- CreateIndex
CREATE INDEX "task_attachments_taskId_idx" ON "task_attachments"("taskId");

-- CreateIndex
CREATE INDEX "task_attachments_userId_idx" ON "task_attachments"("userId");

-- CreateIndex
CREATE INDEX "task_checklist_items_checklistId_idx" ON "task_checklist_items"("checklistId");

-- CreateIndex
CREATE INDEX "task_checklist_items_completedBy_idx" ON "task_checklist_items"("completedBy");

-- CreateIndex
CREATE INDEX "task_checklists_companyId_idx" ON "task_checklists"("companyId");

-- CreateIndex
CREATE INDEX "task_checklists_taskId_idx" ON "task_checklists"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_companyId_idx" ON "task_comments"("companyId");

-- CreateIndex
CREATE INDEX "task_comments_parentCommentId_idx" ON "task_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_userId_idx" ON "task_comments"("userId");

-- CreateIndex
CREATE INDEX "task_dependencies_companyId_idx" ON "task_dependencies"("companyId");

-- CreateIndex
CREATE INDEX "task_dependencies_dependsOnId_idx" ON "task_dependencies"("dependsOnId");

-- CreateIndex
CREATE INDEX "task_dependencies_taskId_idx" ON "task_dependencies"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_taskId_dependsOnId_key" ON "task_dependencies"("taskId", "dependsOnId");

-- CreateIndex
CREATE INDEX "task_notifications_companyId_idx" ON "task_notifications"("companyId");

-- CreateIndex
CREATE INDEX "task_notifications_createdAt_idx" ON "task_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "task_notifications_isRead_idx" ON "task_notifications"("isRead");

-- CreateIndex
CREATE INDEX "task_notifications_userId_idx" ON "task_notifications"("userId");

-- CreateIndex
CREATE INDEX "task_templates_companyId_idx" ON "task_templates"("companyId");

-- CreateIndex
CREATE INDEX "task_templates_createdBy_idx" ON "task_templates"("createdBy");

-- CreateIndex
CREATE INDEX "task_watchers_companyId_idx" ON "task_watchers"("companyId");

-- CreateIndex
CREATE INDEX "task_watchers_taskId_idx" ON "task_watchers"("taskId");

-- CreateIndex
CREATE INDEX "task_watchers_userId_idx" ON "task_watchers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_watchers_taskId_userId_key" ON "task_watchers"("taskId", "userId");

-- CreateIndex
CREATE INDEX "Task_assignedTo_idx" ON "Task"("assignedTo");

-- CreateIndex
CREATE INDEX "Task_categoryId_idx" ON "Task"("categoryId");

-- CreateIndex
CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

-- CreateIndex
CREATE INDEX "Task_createdBy_idx" ON "Task"("createdBy");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_order_idx" ON "Task"("order");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_companyId_idx" ON "TimeEntry"("companyId");

-- CreateIndex
CREATE INDEX "TimeEntry_startTime_idx" ON "TimeEntry"("startTime");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dev_team_members_userId_key" ON "dev_team_members"("userId");

-- CreateIndex
CREATE INDEX "dev_team_members_isActive_idx" ON "dev_team_members"("isActive");

-- CreateIndex
CREATE INDEX "dev_team_members_role_idx" ON "dev_team_members"("role");

-- CreateIndex
CREATE INDEX "dev_team_members_userId_idx" ON "dev_team_members"("userId");

-- CreateIndex
CREATE INDEX "dev_time_logs_isPaused_idx" ON "dev_time_logs"("isPaused");

-- CreateIndex
CREATE INDEX "dev_time_logs_isRunning_idx" ON "dev_time_logs"("isRunning");

-- CreateIndex
CREATE INDEX "dev_time_logs_memberId_idx" ON "dev_time_logs"("memberId");

-- CreateIndex
CREATE INDEX "dev_time_logs_taskId_idx" ON "dev_time_logs"("taskId");

-- CreateIndex
CREATE INDEX "telegram_configs_companyId_idx" ON "telegram_configs"("companyId");

-- CreateIndex
CREATE INDEX "telegram_configs_type_idx" ON "telegram_configs"("type");

-- CreateIndex
CREATE INDEX "telegram_scheduled_messages_userbotConfigId_idx" ON "telegram_scheduled_messages"("userbotConfigId");

-- CreateIndex
CREATE INDEX "telegram_scheduled_messages_companyId_idx" ON "telegram_scheduled_messages"("companyId");

-- CreateIndex
CREATE INDEX "telegram_scheduled_messages_campaignId_idx" ON "telegram_scheduled_messages"("campaignId");

-- CreateIndex
CREATE INDEX "telegram_campaigns_companyId_idx" ON "telegram_campaigns"("companyId");

-- CreateIndex
CREATE INDEX "telegram_campaigns_userbotConfigId_idx" ON "telegram_campaigns"("userbotConfigId");

-- CreateIndex
CREATE INDEX "telegram_auto_reply_rules_userbotConfigId_idx" ON "telegram_auto_reply_rules"("userbotConfigId");

-- CreateIndex
CREATE INDEX "telegram_auto_reply_rules_companyId_idx" ON "telegram_auto_reply_rules"("companyId");

-- CreateIndex
CREATE INDEX "telegram_auto_reply_usage_ruleId_idx" ON "telegram_auto_reply_usage"("ruleId");

-- CreateIndex
CREATE INDEX "telegram_auto_reply_usage_userId_idx" ON "telegram_auto_reply_usage"("userId");

-- CreateIndex
CREATE INDEX "telegram_bulk_messages_companyId_idx" ON "telegram_bulk_messages"("companyId");

-- CreateIndex
CREATE INDEX "telegram_bulk_messages_userbotConfigId_idx" ON "telegram_bulk_messages"("userbotConfigId");

-- CreateIndex
CREATE INDEX "telegram_bulk_message_logs_bulkMessageId_idx" ON "telegram_bulk_message_logs"("bulkMessageId");

-- CreateIndex
CREATE INDEX "telegram_groups_companyId_idx" ON "telegram_groups"("companyId");

-- CreateIndex
CREATE INDEX "telegram_contacts_companyId_idx" ON "telegram_contacts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_contacts_telegramId_companyId_key" ON "telegram_contacts"("telegramId", "companyId");

-- CreateIndex
CREATE INDEX "telegram_forward_rules_companyId_idx" ON "telegram_forward_rules"("companyId");

-- CreateIndex
CREATE INDEX "telegram_forward_rules_userbotConfigId_idx" ON "telegram_forward_rules"("userbotConfigId");

-- CreateIndex
CREATE INDEX "factory_templates_category_idx" ON "factory_templates"("category");

-- CreateIndex
CREATE INDEX "factory_templates_isActive_idx" ON "factory_templates"("isActive");

-- CreateIndex
CREATE INDEX "factory_variant_library_type_idx" ON "factory_variant_library"("type");

-- CreateIndex
CREATE INDEX "factory_variant_library_isActive_idx" ON "factory_variant_library"("isActive");

-- CreateIndex
CREATE INDEX "customer_journeys_companyId_status_nextSendAt_idx" ON "customer_journeys"("companyId", "status", "nextSendAt");

-- CreateIndex
CREATE INDEX "_DepartmentManager_B_index" ON "_DepartmentManager"("B");

-- CreateIndex
CREATE INDEX "_AdSetCustomAudiences_B_index" ON "_AdSetCustomAudiences"("B");

-- CreateIndex
CREATE INDEX "_AdSetLookalikeAudiences_B_index" ON "_AdSetLookalikeAudiences"("B");

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_products" ADD CONSTRAINT "affiliate_products_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_products" ADD CONSTRAINT "affiliate_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_settings" ADD CONSTRAINT "affiliate_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "affiliate_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_keys" ADD CONSTRAINT "ai_keys_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_model_configs" ADD CONSTRAINT "ai_model_configs_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "ai_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_data" ADD CONSTRAINT "learning_data_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_settings" ADD CONSTRAINT "learning_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChatMessage" ADD CONSTRAINT "AIChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChatSession" ADD CONSTRAINT "AIChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dev_team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_trace_steps" ADD CONSTRAINT "ai_trace_steps_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "ai_traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_traces" ADD CONSTRAINT "ai_traces_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_analytics" ADD CONSTRAINT "daily_analytics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_history" ADD CONSTRAINT "asset_custody_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_audits" ADD CONSTRAINT "asset_audits_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_attachments" ADD CONSTRAINT "asset_attachments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_enterprise_plans" ADD CONSTRAINT "platform_enterprise_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_planConfigurationId_fkey" FOREIGN KEY ("planConfigurationId") REFERENCES "plan_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "hr_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easy_orders_settings" ADD CONSTRAINT "easy_orders_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easy_orders_sync_logs" ADD CONSTRAINT "easy_orders_sync_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "hr_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendances" ADD CONSTRAINT "hr_attendances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendances" ADD CONSTRAINT "hr_attendances_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendances" ADD CONSTRAINT "hr_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employeeEmployeeLeavesId_fkey" FOREIGN KEY ("employeeEmployeeLeavesId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employeeLeaveApproverId_fkey" FOREIGN KEY ("employeeLeaveApproverId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_permission_requests" ADD CONSTRAINT "hr_permission_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_permission_requests" ADD CONSTRAINT "hr_permission_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_permission_requests" ADD CONSTRAINT "hr_permission_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payrolls" ADD CONSTRAINT "hr_payrolls_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payrolls" ADD CONSTRAINT "hr_payrolls_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_employeeEmployeeReviewsId_fkey" FOREIGN KEY ("employeeEmployeeReviewsId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_employeeReviewerReviewsId_fkey" FOREIGN KEY ("employeeReviewerReviewsId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_salary_history" ADD CONSTRAINT "hr_salary_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_salary_history" ADD CONSTRAINT "hr_salary_history_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_warnings" ADD CONSTRAINT "hr_employee_warnings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_warnings" ADD CONSTRAINT "hr_employee_warnings_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_training" ADD CONSTRAINT "hr_employee_training_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_training" ADD CONSTRAINT "hr_employee_training_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shifts" ADD CONSTRAINT "hr_shifts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "hr_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefits" ADD CONSTRAINT "hr_benefits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_enrollments" ADD CONSTRAINT "hr_benefit_enrollments_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "hr_benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_enrollments" ADD CONSTRAINT "hr_benefit_enrollments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_enrollments" ADD CONSTRAINT "hr_benefit_enrollments_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_goals" ADD CONSTRAINT "hr_goals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_goals" ADD CONSTRAINT "hr_goals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_goals" ADD CONSTRAINT "hr_goals_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_feedbacks" ADD CONSTRAINT "hr_feedbacks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_feedbacks" ADD CONSTRAINT "hr_feedbacks_employeeFeedbackFromId_fkey" FOREIGN KEY ("employeeFeedbackFromId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_feedbacks" ADD CONSTRAINT "hr_feedbacks_employeeFeedbackToId_fkey" FOREIGN KEY ("employeeFeedbackToId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_resignations" ADD CONSTRAINT "hr_resignations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_resignations" ADD CONSTRAINT "hr_resignations_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_audit_logs" ADD CONSTRAINT "hr_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_audit_logs" ADD CONSTRAINT "hr_audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_settings" ADD CONSTRAINT "hr_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_advance_requests" ADD CONSTRAINT "hr_advance_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_advance_requests" ADD CONSTRAINT "hr_advance_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_advance_requests" ADD CONSTRAINT "hr_advance_requests_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_clearance_checklists" ADD CONSTRAINT "hr_clearance_checklists_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_clearance_checklists" ADD CONSTRAINT "hr_clearance_checklists_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "hr_resignations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_late_warnings" ADD CONSTRAINT "hr_late_warnings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_late_warnings" ADD CONSTRAINT "hr_late_warnings_employeeRelId_fkey" FOREIGN KEY ("employeeRelId") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_kudos" ADD CONSTRAINT "hr_kudos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_kudos" ADD CONSTRAINT "hr_kudos_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_kudos" ADD CONSTRAINT "hr_kudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_lateness_balances" ADD CONSTRAINT "hr_lateness_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_manual_deductions" ADD CONSTRAINT "hr_manual_deductions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_promotions" ADD CONSTRAINT "hr_promotions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_promotions" ADD CONSTRAINT "hr_promotions_fromPositionId_fkey" FOREIGN KEY ("fromPositionId") REFERENCES "hr_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_promotions" ADD CONSTRAINT "hr_promotions_toPositionId_fkey" FOREIGN KEY ("toPositionId") REFERENCES "hr_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_eligibility_logs" ADD CONSTRAINT "hr_reward_eligibility_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_eligibility_logs" ADD CONSTRAINT "hr_reward_eligibility_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_records" ADD CONSTRAINT "hr_reward_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_records" ADD CONSTRAINT "hr_reward_records_rewardTypeId_fkey" FOREIGN KEY ("rewardTypeId") REFERENCES "hr_reward_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_records" ADD CONSTRAINT "hr_reward_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_settings" ADD CONSTRAINT "hr_reward_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reward_types" ADD CONSTRAINT "hr_reward_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_rules" ADD CONSTRAINT "lateness_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_allowances" ADD CONSTRAINT "lateness_allowances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_allowances" ADD CONSTRAINT "lateness_allowances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_records" ADD CONSTRAINT "lateness_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_records" ADD CONSTRAINT "lateness_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_deductions" ADD CONSTRAINT "lateness_deductions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_deductions" ADD CONSTRAINT "lateness_deductions_latenessRecordId_fkey" FOREIGN KEY ("latenessRecordId") REFERENCES "lateness_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_deductions" ADD CONSTRAINT "lateness_deductions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_monthly_summaries" ADD CONSTRAINT "lateness_monthly_summaries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lateness_monthly_summaries" ADD CONSTRAINT "lateness_monthly_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_company_policies" ADD CONSTRAINT "hr_company_policies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_connections" ADD CONSTRAINT "company_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_connections" ADD CONSTRAINT "company_connections_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_connection_requests" ADD CONSTRAINT "company_connection_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_connection_requests" ADD CONSTRAINT "company_connection_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_in_stock_notifications" ADD CONSTRAINT "back_in_stock_notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_in_stock_notifications" ADD CONSTRAINT "back_in_stock_notifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_settings" ADD CONSTRAINT "woocommerce_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_sync_logs" ADD CONSTRAINT "woocommerce_sync_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "broadcast_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_settings" ADD CONSTRAINT "broadcast_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_accounts" ADD CONSTRAINT "facebook_ad_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_insights" ADD CONSTRAINT "facebook_ad_insights_adId_fkey" FOREIGN KEY ("adId") REFERENCES "facebook_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_test_variants" ADD CONSTRAINT "facebook_ad_test_variants_adId_fkey" FOREIGN KEY ("adId") REFERENCES "facebook_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_test_variants" ADD CONSTRAINT "facebook_ad_test_variants_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "facebook_adsets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_test_variants" ADD CONSTRAINT "facebook_ad_test_variants_testId_fkey" FOREIGN KEY ("testId") REFERENCES "facebook_ad_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_tests" ADD CONSTRAINT "facebook_ad_tests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "facebook_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ad_tests" ADD CONSTRAINT "facebook_ad_tests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads" ADD CONSTRAINT "facebook_ads_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "facebook_adsets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_adsets" ADD CONSTRAINT "facebook_adsets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "facebook_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_campaigns" ADD CONSTRAINT "facebook_campaigns_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_campaigns" ADD CONSTRAINT "facebook_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_catalog_products" ADD CONSTRAINT "facebook_catalog_products_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "facebook_product_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_catalog_products" ADD CONSTRAINT "facebook_catalog_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_comments" ADD CONSTRAINT "facebook_comments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_custom_audiences" ADD CONSTRAINT "facebook_custom_audiences_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_custom_audiences" ADD CONSTRAINT "facebook_custom_audiences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_dynamic_ads" ADD CONSTRAINT "facebook_dynamic_ads_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "facebook_adsets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_dynamic_ads" ADD CONSTRAINT "facebook_dynamic_ads_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "facebook_product_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_dynamic_ads" ADD CONSTRAINT "facebook_dynamic_ads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_lookalike_audiences" ADD CONSTRAINT "facebook_lookalike_audiences_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_lookalike_audiences" ADD CONSTRAINT "facebook_lookalike_audiences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_lookalike_audiences" ADD CONSTRAINT "facebook_lookalike_audiences_sourceAudienceId_fkey" FOREIGN KEY ("sourceAudienceId") REFERENCES "facebook_custom_audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_pages" ADD CONSTRAINT "facebook_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_pixel_configs" ADD CONSTRAINT "facebook_pixel_configs_storefrontSettingsId_fkey" FOREIGN KEY ("storefrontSettingsId") REFERENCES "storefront_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_product_catalogs" ADD CONSTRAINT "facebook_product_catalogs_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_product_catalogs" ADD CONSTRAINT "facebook_product_catalogs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_product_feeds" ADD CONSTRAINT "facebook_product_feeds_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "facebook_product_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_logs" ADD CONSTRAINT "whatsapp_notification_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_logs" ADD CONSTRAINT "whatsapp_notification_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_logs" ADD CONSTRAINT "whatsapp_notification_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_logs" ADD CONSTRAINT "whatsapp_notification_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_logs" ADD CONSTRAINT "whatsapp_notification_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "whatsapp_notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_queue" ADD CONSTRAINT "whatsapp_notification_queue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_settings" ADD CONSTRAINT "whatsapp_notification_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notification_templates" ADD CONSTRAINT "whatsapp_notification_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_apps" ADD CONSTRAINT "company_apps_appId_fkey" FOREIGN KEY ("appId") REFERENCES "marketplace_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_apps" ADD CONSTRAINT "company_apps_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_companyAppId_fkey" FOREIGN KEY ("companyAppId") REFERENCES "company_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_reviews" ADD CONSTRAINT "app_reviews_appId_fkey" FOREIGN KEY ("appId") REFERENCES "marketplace_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_reviews" ADD CONSTRAINT "app_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_reviews" ADD CONSTRAINT "app_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_pricing_rules" ADD CONSTRAINT "app_pricing_rules_appId_fkey" FOREIGN KEY ("appId") REFERENCES "marketplace_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_wallets" ADD CONSTRAINT "company_wallets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "company_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_plans" ADD CONSTRAINT "enterprise_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_gallery" ADD CONSTRAINT "image_gallery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_gallery" ADD CONSTRAINT "image_gallery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "text_gallery" ADD CONSTRAINT "text_gallery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "text_gallery" ADD CONSTRAINT "text_gallery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_studio_usage" ADD CONSTRAINT "image_studio_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_studio_history" ADD CONSTRAINT "image_studio_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_studio_history" ADD CONSTRAINT "image_studio_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_memory" ADD CONSTRAINT "conversation_memory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_outcomes" ADD CONSTRAINT "conversation_outcomes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_outcomes" ADD CONSTRAINT "conversation_outcomes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_message_stats" ADD CONSTRAINT "sent_message_stats_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_quick_replies" ADD CONSTRAINT "whatsapp_quick_replies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_settings" ADD CONSTRAINT "whatsapp_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_statuses" ADD CONSTRAINT "whatsapp_statuses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tracking" ADD CONSTRAINT "post_tracking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_effectiveness" ADD CONSTRAINT "response_effectiveness_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "customer_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_notification_preferences" ADD CONSTRAINT "employee_notification_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_visits" ADD CONSTRAINT "store_visits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_member_badges" ADD CONSTRAINT "dev_member_badges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "dev_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_configs" ADD CONSTRAINT "order_workflow_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_definitions" ADD CONSTRAINT "order_status_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_transitions" ADD CONSTRAINT "order_workflow_transitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_transitions" ADD CONSTRAINT "order_workflow_transitions_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "order_status_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_transitions" ADD CONSTRAINT "order_workflow_transitions_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "order_status_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "order_status_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "order_status_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "order_status_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_workflow_audit_logs" ADD CONSTRAINT "order_workflow_audit_logs_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "order_status_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_options" ADD CONSTRAINT "delivery_options_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_carts" ADD CONSTRAINT "guest_carts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_orders" ADD CONSTRAINT "guest_orders_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_orders" ADD CONSTRAINT "guest_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_orders" ADD CONSTRAINT "guest_orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_guestOrderId_fkey" FOREIGN KEY ("guestOrderId") REFERENCES "guest_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_configs" ADD CONSTRAINT "order_status_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userRelId_fkey" FOREIGN KEY ("userRelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_walletNumberId_fkey" FOREIGN KEY ("walletNumberId") REFERENCES "wallet_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_guestOrderId_fkey" FOREIGN KEY ("guestOrderId") REFERENCES "guest_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_invoice_settings" ADD CONSTRAINT "order_invoice_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_invoices" ADD CONSTRAINT "order_invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_partners" ADD CONSTRAINT "platform_partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_partners" ADD CONSTRAINT "platform_partners_parentPartnerId_fkey" FOREIGN KEY ("parentPartnerId") REFERENCES "platform_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referred_companies" ADD CONSTRAINT "partner_referred_companies_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "platform_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referred_companies" ADD CONSTRAINT "partner_referred_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "platform_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_billingHistoryId_fkey" FOREIGN KEY ("billingHistoryId") REFERENCES "billing_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "platform_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_customers_on_page" ADD CONSTRAINT "blocked_customers_on_page_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_customers_on_page" ADD CONSTRAINT "blocked_customers_on_page_facebookPageId_fkey" FOREIGN KEY ("facebookPageId") REFERENCES "facebook_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lists" ADD CONSTRAINT "customer_lists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallets" ADD CONSTRAINT "customer_wallets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallets" ADD CONSTRAINT "customer_wallets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_programs" ADD CONSTRAINT "customer_loyalty_programs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_records" ADD CONSTRAINT "customer_loyalty_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_records" ADD CONSTRAINT "customer_loyalty_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_records" ADD CONSTRAINT "customer_loyalty_records_programId_fkey" FOREIGN KEY ("programId") REFERENCES "customer_loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_records" ADD CONSTRAINT "customer_loyalty_records_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "customer_loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_tiers" ADD CONSTRAINT "customer_loyalty_tiers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_tiers" ADD CONSTRAINT "customer_loyalty_tiers_programId_fkey" FOREIGN KEY ("programId") REFERENCES "customer_loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_orders" ADD CONSTRAINT "merchant_orders_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_orders" ADD CONSTRAINT "merchant_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_products" ADD CONSTRAINT "merchant_products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_products" ADD CONSTRAINT "merchant_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_visits" ADD CONSTRAINT "product_visits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_visits" ADD CONSTRAINT "product_visits_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_reason_categories" ADD CONSTRAINT "return_reason_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_job_postings" ADD CONSTRAINT "hr_job_postings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "hr_job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_interviews" ADD CONSTRAINT "hr_interviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_interviews" ADD CONSTRAINT "hr_interviews_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "hr_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_reasons" ADD CONSTRAINT "return_reasons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "return_reason_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_reasons" ADD CONSTRAINT "return_reasons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "return_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_contact_attempts" ADD CONSTRAINT "return_contact_attempts_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_contact_attempts" ADD CONSTRAINT "return_contact_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_activity_logs" ADD CONSTRAINT "return_activity_logs_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_activity_logs" ADD CONSTRAINT "return_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempt_logs" ADD CONSTRAINT "call_attempt_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_attempt_logs" ADD CONSTRAINT "call_attempt_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_message_daily_summaries" ADD CONSTRAINT "sent_message_daily_summaries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_form_settings" ADD CONSTRAINT "checkout_form_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footer_settings" ADD CONSTRAINT "footer_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_templates" ADD CONSTRAINT "homepage_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_response_settings" ADD CONSTRAINT "page_response_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_response_settings" ADD CONSTRAINT "post_response_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_response_settings" ADD CONSTRAINT "post_response_settings_featuredProductId_fkey" FOREIGN KEY ("featuredProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_pages" ADD CONSTRAINT "store_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_promotion_settings" ADD CONSTRAINT "store_promotion_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefront_settings" ADD CONSTRAINT "storefront_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_prompts" ADD CONSTRAINT "system_prompts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_settings" ADD CONSTRAINT "return_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_companies" ADD CONSTRAINT "shipping_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_notifications" ADD CONSTRAINT "dev_notifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "dev_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_projects" ADD CONSTRAINT "dev_projects_companyRelId_fkey" FOREIGN KEY ("companyRelId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_projects" ADD CONSTRAINT "dev_projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "dev_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_releases" ADD CONSTRAINT "dev_releases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "dev_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_activities" ADD CONSTRAINT "dev_task_activities_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "dev_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_activities" ADD CONSTRAINT "dev_task_activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_attachments" ADD CONSTRAINT "dev_task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_checklist_items" ADD CONSTRAINT "dev_task_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "dev_task_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_checklists" ADD CONSTRAINT "dev_task_checklists_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_comments" ADD CONSTRAINT "dev_task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "dev_team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_comments" ADD CONSTRAINT "dev_task_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "dev_task_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_comments" ADD CONSTRAINT "dev_task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_watchers" ADD CONSTRAINT "dev_task_watchers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "dev_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_watchers" ADD CONSTRAINT "dev_task_watchers_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "dev_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_companyRelId_fkey" FOREIGN KEY ("companyRelId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "dev_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "dev_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "dev_releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "dev_team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "task_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "task_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "task_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_team_members" ADD CONSTRAINT "dev_team_members_companyRelId_fkey" FOREIGN KEY ("companyRelId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_team_members" ADD CONSTRAINT "dev_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_time_logs" ADD CONSTRAINT "dev_time_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "dev_team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_time_logs" ADD CONSTRAINT "dev_time_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "dev_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_configs" ADD CONSTRAINT "telegram_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_scheduled_messages" ADD CONSTRAINT "telegram_scheduled_messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "telegram_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_auto_reply_rules" ADD CONSTRAINT "telegram_auto_reply_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_auto_reply_rules" ADD CONSTRAINT "telegram_auto_reply_rules_userbotConfigId_fkey" FOREIGN KEY ("userbotConfigId") REFERENCES "telegram_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_bulk_messages" ADD CONSTRAINT "telegram_bulk_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_bulk_messages" ADD CONSTRAINT "telegram_bulk_messages_userbotConfigId_fkey" FOREIGN KEY ("userbotConfigId") REFERENCES "telegram_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_forward_rules" ADD CONSTRAINT "telegram_forward_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_forward_rules" ADD CONSTRAINT "telegram_forward_rules_userbotConfigId_fkey" FOREIGN KEY ("userbotConfigId") REFERENCES "telegram_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_follow_up_flows" ADD CONSTRAINT "whatsapp_follow_up_flows_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_follow_up_steps" ADD CONSTRAINT "whatsapp_follow_up_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "whatsapp_follow_up_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "whatsapp_follow_up_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentManager" ADD CONSTRAINT "_DepartmentManager_A_fkey" FOREIGN KEY ("A") REFERENCES "hr_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentManager" ADD CONSTRAINT "_DepartmentManager_B_fkey" FOREIGN KEY ("B") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdSetCustomAudiences" ADD CONSTRAINT "_AdSetCustomAudiences_A_fkey" FOREIGN KEY ("A") REFERENCES "facebook_adsets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdSetCustomAudiences" ADD CONSTRAINT "_AdSetCustomAudiences_B_fkey" FOREIGN KEY ("B") REFERENCES "facebook_custom_audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdSetLookalikeAudiences" ADD CONSTRAINT "_AdSetLookalikeAudiences_A_fkey" FOREIGN KEY ("A") REFERENCES "facebook_adsets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdSetLookalikeAudiences" ADD CONSTRAINT "_AdSetLookalikeAudiences_B_fkey" FOREIGN KEY ("B") REFERENCES "facebook_lookalike_audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
