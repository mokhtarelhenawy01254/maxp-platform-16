-- Migration: Add turbo captain, branch, delay/return reason fields
-- ╪¬╪º╪▒┘è╪«: 2026-07-27
-- ╪º┘ä┘ê╪╡┘ü: ╪Ñ╪╢╪º┘ü╪⌐ ╪ú╪╣┘à╪»╪⌐ ┘ä┘ä┘à┘å╪»┘ê╪¿╪î ╪º┘ä┘ü╪▒╪╣╪î ╪ú╪│╪¿╪º╪¿ ╪º┘ä╪¬╪ú╪«┘è╪▒ ┘ê╪º┘ä╪º╪▒╪¬╪¼╪º╪╣ ┘ä┘ä╪╖┘ä╪¿╪º╪¬

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
COMMENT ON COLUMN orders."turboCaptainName" IS '╪º╪│┘à ╪º┘ä┘à┘å╪»┘ê╪¿/╪º┘ä┘â╪º╪¿╪¬┘å ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboCaptainPhone" IS '╪▒┘é┘à ╪º┘ä┘à┘å╪»┘ê╪¿ ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboBranchName" IS '╪º╪│┘à ╪º┘ä┘ü╪▒╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboBranchPhone" IS '╪▒┘é┘à ╪º┘ä┘ü╪▒╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboDelayReason" IS '╪│╪¿╪¿ ╪º┘ä╪¬╪ú╪«┘è╪▒ ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboReturnReason" IS '╪│╪¿╪¿ ╪º┘ä╪º╪▒╪¬╪¼╪º╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN orders."turboExpectedBranch" IS '╪º┘ä┘ü╪▒╪╣ ╪º┘ä┘à╪¬┘ê┘é╪╣ ┘ä┘ä╪¬╪│┘ä┘è┘à ┘à┘å Turbo';

COMMENT ON COLUMN guest_orders."turboCaptainName" IS '╪º╪│┘à ╪º┘ä┘à┘å╪»┘ê╪¿/╪º┘ä┘â╪º╪¿╪¬┘å ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboCaptainPhone" IS '╪▒┘é┘à ╪º┘ä┘à┘å╪»┘ê╪¿ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboBranchName" IS '╪º╪│┘à ╪º┘ä┘ü╪▒╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboBranchPhone" IS '╪▒┘é┘à ╪º┘ä┘ü╪▒╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboBranchId" IS '┘à╪╣╪▒┘ü ╪º┘ä┘ü╪▒╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboDelayReason" IS '╪│╪¿╪¿ ╪º┘ä╪¬╪ú╪«┘è╪▒ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboReturnReason" IS '╪│╪¿╪¿ ╪º┘ä╪º╪▒╪¬╪¼╪º╪╣ ┘à┘å Turbo';
COMMENT ON COLUMN guest_orders."turboExpectedBranch" IS '╪º┘ä┘ü╪▒╪╣ ╪º┘ä┘à╪¬┘ê┘é╪╣ ┘ä┘ä╪¬╪│┘ä┘è┘à ┘à┘å Turbo';

-- =============================================
-- Indexes for better query performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_turbo_captain_name ON orders("turboCaptainName");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_branch_name ON orders("turboBranchName");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_delay_reason ON orders("turboDelayReason");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_return_reason ON orders("turboReturnReason");
CREATE INDEX IF NOT EXISTS idx_orders_turbo_expected_branch ON orders("turboExpectedBranch");

-- =============================================
-- ╪¬╪│╪¼┘è┘ä ╪º┘ä┘à┘ç┘à╪⌐ ┘ü┘è ╪º┘ä╪│╪¼┘ä
-- =============================================
INSERT INTO migration_logs (name, executed_at, description) 
VALUES ('20260727_add_turbo_captain_branch_fields', NOW(), 'Added captain, branch, delay/return reason fields for Turbo shipping')
ON CONFLICT (name) DO NOTHING;
