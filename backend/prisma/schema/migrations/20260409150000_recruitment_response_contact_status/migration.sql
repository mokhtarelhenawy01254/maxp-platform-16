ALTER TABLE "hr_recruitment_form_responses"
ADD COLUMN "isContacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contactedAt" TIMESTAMP(3);
