-- Migration: Add turbo captain, branch, delay/return reason fields
-- تاريخ: 2026-07-27
-- الوصف: إضافة أعمدة للمندوب، الفرع، أسباب التأخير والارتجاع للطلبات

-- =============================================
-- Orders table
-- =============================================
ALTER TABLE orders 
  ADD COLUMN "turboCaptainName" TEXT,
  ADD COLUMN "turboCaptainPhone" TEXT,
  ADD COLUMN "turboBranchName" TEXT,
  ADD COLUMN "turboBranchPhone" TEXT,
  ADD COLUMN "turboDelayReason" TEXT,
  ADD COLUMN "turboReturnReason" TEXT,
  ADD COLUMN "turboExpectedBranch" TEXT;

-- =============================================
-- Guest Orders table
-- =============================================
ALTER TABLE guest_orders 
  ADD COLUMN "turboCaptainName" TEXT,
  ADD COLUMN "turboCaptainPhone" TEXT,
  ADD COLUMN "turboBranchName" TEXT,
  ADD COLUMN "turboBranchPhone" TEXT,
  ADD COLUMN "turboBranchId" TEXT,
  ADD COLUMN "turboDelayReason" TEXT,
  ADD COLUMN "turboReturnReason" TEXT,
  ADD COLUMN "turboExpectedBranch" TEXT;

-- =============================================
-- Comments
-- =============================================
COMMENT ON COLUMN orders."turboCaptainName" IS 'اسم المندوب/الكابتن من Turbo';
COMMENT ON COLUMN orders."turboCaptainPhone" IS 'رقم المندوب من Turbo';
COMMENT ON COLUMN orders."turboBranchName" IS 'اسم الفرع من Turbo';
COMMENT ON COLUMN orders."turboBranchPhone" IS 'رقم الفرع من Turbo';
COMMENT ON COLUMN orders."turboDelayReason" IS 'سبب التأخير من Turbo';
COMMENT ON COLUMN orders."turboReturnReason" IS 'سبب الارتجاع من Turbo';
COMMENT ON COLUMN orders."turboExpectedBranch" IS 'الفرع المتوقع للتسليم من Turbo';

COMMENT ON COLUMN guest_orders."turboCaptainName" IS 'اسم المندوب/الكابتن من Turbo';
COMMENT ON COLUMN guest_orders."turboCaptainPhone" IS 'رقم المندوب من Turbo';
COMMENT ON COLUMN guest_orders."turboBranchName" IS 'اسم الفرع من Turbo';
COMMENT ON COLUMN guest_orders."turboBranchPhone" IS 'رقم الفرع من Turbo';
COMMENT ON COLUMN guest_orders."turboBranchId" IS 'معرف الفرع من Turbo';
COMMENT ON COLUMN guest_orders."turboDelayReason" IS 'سبب التأخير من Turbo';
COMMENT ON COLUMN guest_orders."turboReturnReason" IS 'سبب الارتجاع من Turbo';
COMMENT ON COLUMN guest_orders."turboExpectedBranch" IS 'الفرع المتوقع للتسليم من Turbo';

-- =============================================
-- Indexes for better query performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_turbo_captain_name ON orders("turboCaptainName");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_branch_name ON orders("turboBranchName");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_delay_reason ON orders("turboDelayReason");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_return_reason ON orders("turboReturnReason");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_expected_branch ON orders("turboExpectedBranch");

-- =============================================
-- تسجيل المهمة في السجل
-- =============================================
INSERT INTO migration_logs (name, executed_at, description) 
VALUES ('20260727_add_turbo_captain_branch_fields', NOW(), 'Added captain, branch, delay/return reason fields for Turbo shipping')
ON CONFLICT (name) DO NOTHING;
