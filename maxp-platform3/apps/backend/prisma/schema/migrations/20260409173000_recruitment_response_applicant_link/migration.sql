ALTER TABLE "hr_applicants"
ADD COLUMN "formResponseId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "hr_applicants_formResponseId_key"
ON "hr_applicants"("formResponseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hr_applicants_formResponseId_fkey'
  ) THEN
    ALTER TABLE "hr_applicants"
    ADD CONSTRAINT "hr_applicants_formResponseId_fkey"
    FOREIGN KEY ("formResponseId")
    REFERENCES "hr_recruitment_form_responses"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
