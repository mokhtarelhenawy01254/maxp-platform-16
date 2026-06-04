DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GlobalAiProvider') THEN
    ALTER TYPE "GlobalAiProvider" ADD VALUE IF NOT EXISTS 'GROQ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_ai_configs_defaultProvider') THEN
    ALTER TYPE "global_ai_configs_defaultProvider" ADD VALUE IF NOT EXISTS 'GROQ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_keys_provider') THEN
    ALTER TYPE "ai_keys_provider" ADD VALUE IF NOT EXISTS 'GROQ';
  END IF;
END $$;
