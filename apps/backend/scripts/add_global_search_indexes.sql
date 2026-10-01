-- =============================================================
-- Global Search Performance Indexes
-- Supports contains + startsWith queries on searchable fields
-- =============================================================
-- Run on production after deploy:
--   psql $POSTGRES_URL -f scripts/add_global_search_indexes.sql
-- =============================================================

-- Enable pg_trgm for efficient fuzzy text search (LIKE '%term%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- Core entities
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_company_name ON "Company" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_company_email ON "Company" (email);
CREATE INDEX IF NOT EXISTS idx_company_phone ON "Company" (phone);
CREATE INDEX IF NOT EXISTS idx_company_slug ON "Company" (slug);

CREATE INDEX IF NOT EXISTS idx_user_firstName ON "User" (firstName);
CREATE INDEX IF NOT EXISTS idx_user_lastName ON "User" (lastName);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User" (email);

-- =============================================================
-- Products & Orders
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_product_name ON "Product" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_sku ON "Product" (sku);
CREATE INDEX IF NOT EXISTS idx_product_description ON "Product" USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_order_orderNumber ON "Order" (orderNumber);
CREATE INDEX IF NOT EXISTS idx_order_customerName ON "Order" (customerName);
CREATE INDEX IF NOT EXISTS idx_order_customerPhone ON "Order" (customerPhone);

-- =============================================================
-- Customers
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_customer_firstName ON "Customer" (firstName);
CREATE INDEX IF NOT EXISTS idx_customer_lastName ON "Customer" (lastName);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON "Customer" (phone);
CREATE INDEX IF NOT EXISTS idx_customer_email ON "Customer" (email);

-- =============================================================
-- Conversations & Messages
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_conversation_subject ON "Conversation" USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_message_content ON "Message" USING gin (content gin_trgm_ops);

-- =============================================================
-- Support
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_supportTicket_subject ON "SupportTicket" USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_supportTicket_ticketId ON "SupportTicket" (ticketId);
CREATE INDEX IF NOT EXISTS idx_supportMessage_content ON "SupportMessage" USING gin (content gin_trgm_ops);

-- =============================================================
-- Facebook
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_facebookPage_pageName ON "FacebookPage" USING gin (pageName gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_facebookComment_message ON "FacebookComment" USING gin (message gin_trgm_ops);

-- =============================================================
-- WhatsApp
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_whatsAppSession_name ON "WhatsAppSession" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_whatsAppSession_phoneNumber ON "WhatsAppSession" (phoneNumber);
CREATE INDEX IF NOT EXISTS idx_whatsAppQuickReply_title ON "WhatsAppQuickReply" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_whatsAppQuickReply_shortcut ON "WhatsAppQuickReply" (shortcut);
CREATE INDEX IF NOT EXISTS idx_whatsAppQuickReply_content ON "WhatsAppQuickReply" USING gin (content gin_trgm_ops);

-- =============================================================
-- HR / Employees
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_employee_firstName ON "Employee" (firstName);
CREATE INDEX IF NOT EXISTS idx_employee_lastName ON "Employee" (lastName);
CREATE INDEX IF NOT EXISTS idx_employee_employeeNumber ON "Employee" (employeeNumber);
CREATE INDEX IF NOT EXISTS idx_employee_email ON "Employee" (email);

CREATE INDEX IF NOT EXISTS idx_department_name ON "Department" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_department_code ON "Department" (code);
CREATE INDEX IF NOT EXISTS idx_position_title ON "Position" USING gin (title gin_trgm_ops);

-- =============================================================
-- Competitors
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_competitor_name ON "Competitor" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_competitor_slug ON "Competitor" (slug);

-- =============================================================
-- Marketing
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_coupon_code ON "Coupon" (code);
CREATE INDEX IF NOT EXISTS idx_coupon_name ON "Coupon" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_broadcastCampaign_name ON "BroadcastCampaign" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_promotion_name ON "Promotion" USING gin (name gin_trgm_ops);

-- =============================================================
-- Categories
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_category_name ON "Category" USING gin (name gin_trgm_ops);

-- =============================================================
-- Knowledge & FAQ
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_faq_question ON "Faq" USING gin (question gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faq_answer ON "Faq" USING gin (answer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_knowledgeBase_title ON "KnowledgeBase" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_knowledgeBase_content ON "KnowledgeBase" USING gin (content gin_trgm_ops);

-- =============================================================
-- Dev Projects & Tasks
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_devProject_name ON "DevProject" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_devProject_description ON "DevProject" USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_devTask_title ON "DevTask" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_devTask_description ON "DevTask" USING gin (description gin_trgm_ops);

-- =============================================================
-- General Tasks
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_task_title ON "Task" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_task_description ON "Task" USING gin (description gin_trgm_ops);

-- =============================================================
-- Invoices
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_invoice_invoiceNumber ON "Invoice" (invoiceNumber);

-- =============================================================
-- Misc
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_merchant_name ON "Merchant" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_merchant_email ON "Merchant" (email);
CREATE INDEX IF NOT EXISTS idx_storePage_title ON "StorePage" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_storePage_slug ON "StorePage" (slug);
CREATE INDEX IF NOT EXISTS idx_productReview_title ON "ProductReview" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productReview_comment ON "ProductReview" USING gin (comment gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobPosting_title ON "JobPosting" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applicant_name ON "Applicant" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applicant_email ON "Applicant" (email);
CREATE INDEX IF NOT EXISTS idx_applicant_phone ON "Applicant" (phone);
CREATE INDEX IF NOT EXISTS idx_recruitmentForm_title ON "RecruitmentForm" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_goal_title ON "Goal" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_feedback_content ON "Feedback" USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customerNote_content ON "CustomerNote" USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_competitorReport_title ON "CompetitorReport" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_appExplanation_title ON "AppExplanation" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_conversationMemory_userMessage ON "ConversationMemory" USING gin ("userMessage" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_conversationMemory_aiResponse ON "ConversationMemory" USING gin ("aiResponse" gin_trgm_ops);

-- AI Keys
CREATE INDEX IF NOT EXISTS idx_aiKey_name ON "AiKey" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_aiKey_provider ON "AiKey" (provider);

-- WorkReportForm
CREATE INDEX IF NOT EXISTS idx_workReportForm_title ON "WorkReportForm" USING gin (title gin_trgm_ops);

-- =============================================================
-- Verification query
-- =============================================================
-- SELECT tablename, indexname, indexdef FROM pg_indexes
-- WHERE tablename IN ('Company', 'User', 'Customer', 'Product', 'Order')
-- ORDER BY tablename, indexname;
