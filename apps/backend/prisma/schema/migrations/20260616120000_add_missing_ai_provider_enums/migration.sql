-- Add CEREBRAS, GITHUB, SAMBANOVA, MISTRAL to GlobalAiProvider enum
ALTER TYPE "GlobalAiProvider" ADD VALUE IF NOT EXISTS 'CEREBRAS';
ALTER TYPE "GlobalAiProvider" ADD VALUE IF NOT EXISTS 'GITHUB';
ALTER TYPE "GlobalAiProvider" ADD VALUE IF NOT EXISTS 'SAMBANOVA';
ALTER TYPE "GlobalAiProvider" ADD VALUE IF NOT EXISTS 'MISTRAL';

-- Add CEREBRAS, GITHUB, SAMBANOVA, MISTRAL to global_ai_configs_defaultProvider enum
ALTER TYPE "global_ai_configs_defaultProvider" ADD VALUE IF NOT EXISTS 'CEREBRAS';
ALTER TYPE "global_ai_configs_defaultProvider" ADD VALUE IF NOT EXISTS 'GITHUB';
ALTER TYPE "global_ai_configs_defaultProvider" ADD VALUE IF NOT EXISTS 'SAMBANOVA';
ALTER TYPE "global_ai_configs_defaultProvider" ADD VALUE IF NOT EXISTS 'MISTRAL';
