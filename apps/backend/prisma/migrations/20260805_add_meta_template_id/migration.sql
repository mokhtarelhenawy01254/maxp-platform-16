-- Migration: Add metaTemplateId column to WhatsApp notification templates
-- تاريخ: 2026-08-05
-- الوصف: حفظ الـ numeric template ID من ميتا لتعديل القالب عبر الـ ID بدلاً من الاسم
--        (يُصلح خطأ Meta code 100 / subcode 2388024 عند إعادة الإرسال للمراجعة)

ALTER TABLE whatsapp_notification_templates
  ADD COLUMN IF NOT EXISTS "metaTemplateId" TEXT;

COMMENT ON COLUMN whatsapp_notification_templates."metaTemplateId" IS 'معرف القالب الرقمي من Meta Cloud API (مطلوب لتعديل قالب موجود)';

INSERT INTO migration_logs (name, executed_at, description)
VALUES ('20260805_add_meta_template_id', NOW(), 'Added metaTemplateId column for Meta template editing')
ON CONFLICT (name) DO NOTHING;
