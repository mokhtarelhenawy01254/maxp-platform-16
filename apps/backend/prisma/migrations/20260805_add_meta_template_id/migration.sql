-- Migration: Add metaTemplateId column to WhatsApp notification templates
-- ╪¬╪º╪▒┘è╪«: 2026-08-05
-- ╪º┘ä┘ê╪╡┘ü: ╪¡┘ü╪╕ ╪º┘ä┘Ç numeric template ID ┘à┘å ┘à┘è╪¬╪º ┘ä╪¬╪╣╪»┘è┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪╣╪¿╪▒ ╪º┘ä┘Ç ID ╪¿╪»┘ä╪º┘ï ┘à┘å ╪º┘ä╪º╪│┘à
--        (┘è┘Å╪╡┘ä╪¡ ╪«╪╖╪ú Meta code 100 / subcode 2388024 ╪╣┘å╪» ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐)

ALTER TABLE whatsapp_notification_templates
  ADD COLUMN IF NOT EXISTS "metaTemplateId" TEXT;

COMMENT ON COLUMN whatsapp_notification_templates."metaTemplateId" IS '┘à╪╣╪▒┘ü ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪▒┘é┘à┘è ┘à┘å Meta Cloud API (┘à╪╖┘ä┘ê╪¿ ┘ä╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ┘à┘ê╪¼┘ê╪»)';

INSERT INTO migration_logs (name, executed_at, description)
VALUES ('20260805_add_meta_template_id', NOW(), 'Added metaTemplateId column for Meta template editing')
ON CONFLICT (name) DO NOTHING;
