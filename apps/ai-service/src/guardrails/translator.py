from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.guardrails.merchant_rules import compute_cosine_similarity
from src.llm.client import LLMClient
from src.memory.episodic_memory import episodic_memory_service

logger = structlog.get_logger(__name__)


class GuardrailTranslator:
    """Translates plain merchant feedback text into structured

    Excuse/Rebuttal/Action JSON format using an LLM call.
    Also handles embedding generation and conflict checking.
    """

    async def translate_feedback(
        self,
        feedback_text: str,
        company_id: str,
        agent_context: str = "",
    ) -> dict[str, str]:
        """Convert plain Arabic/English merchant text into structured guardrail."""
        system_msg = (
            "You are a senior guardrails architect. Your task is to translate raw merchant feedback "
            "(written in any Arabic dialect like Egyptian/Gulf, or English) into a structured JSON rule with three keys:\n"
            "1. \"excuse\": A concise summary of the potential shortcut/excuse the AI agent might think of to bypass the rule (in Modern Standard Arabic).\n"
            "2. \"rebuttal\": A clear, professional reason in Arabic why this excuse is wrong and must be rejected.\n"
            "3. \"action\": The exact action in Arabic the agent must perform instead.\n\n"
            "Example input: \"ممنوع ندي خصم يوم الجمعة\"\n"
            "Example output: {\n"
            "  \"excuse\": \"طلب العميل خصماً إضافياً يوم الجمعة ويبدو مستعجلاً أو غاضباً\",\n"
            "  \"rebuttal\": \"يوم الجمعة هو يوم العروض الثابتة بالمركز، ويُمنع تقديم خصومات يدوية إضافية منعاً لتضارب الحسابات\",\n"
            "  \"action\": \"وضح للعميل بلطف أن الجمعة يوم العروض الثابتة، واعرض عليه الباقات والعروض المتاحة المعتمدة رسمياً\"\n"
            "}\n\n"
            "Provide ONLY the valid JSON object. Do not wrap in markdown or markdown code blocks."
        )

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": f"Feedback: \"{feedback_text}\"\nContext: {agent_context}"}
        ]

        try:
            from src.llm.model_manager import model_manager
            # Resolve key for gemini-2.5-flash as default, or fallback
            routing = await model_manager.get_next_key("gemini-2.5-flash", company_id)
            client = LLMClient(
                provider=routing.provider,
                model=routing.model,
                api_key=routing.api_key,
                base_url=routing.base_url,
            )
            response = await client.generate(messages=messages, tools=None, temperature=0.2)
            reply = (response.text or "").strip()

            # Clean markdown code blocks if any
            if reply.startswith("```"):
                reply = re.sub(r"^```(?:json)?\s*", "", reply)
                reply = re.sub(r"\s*```$", "", reply)

            result = json.loads(reply.strip())
            if all(k in result for k in ["excuse", "rebuttal", "action"]):
                return result
        except Exception as exc:
            logger.error("guardrails.translation_failed", error=str(exc))

        # Fallback in case of failure
        return {
            "excuse": f"تجاوز قاعدة: {feedback_text}",
            "rebuttal": "يجب الالتزام بتوجيهات التاجر لمنع حدوث أخطاء تشغيلية.",
            "action": feedback_text
        }

    async def generate_embedding(self, text: str) -> list[float] | None:
        """Generate embedding vector using Gemini Embedding API."""
        try:
            embedding = await episodic_memory_service.generate_embedding_async(
                text=text,
                dimension=768,
            )
            return embedding
        except Exception as exc:
            logger.warning("guardrails.embedding_generation_failed", text=text, error=str(exc))
            return None

    async def check_conflict(
        self,
        new_rule_embedding: list[float],
        existing_rules: list[dict[str, Any]],
        threshold: float = 0.85,
    ) -> dict[str, Any] | None:
        """Check if the new rule semantically conflicts with existing rules."""
        if not new_rule_embedding:
            return None

        for rule in existing_rules:
            rule_embedding = rule.get("embedding")
            if not rule_embedding:
                continue
            similarity = compute_cosine_similarity(new_rule_embedding, rule_embedding)
            if similarity >= threshold:
                logger.info("guardrails.conflict_detected", rule_id=rule.get("id"), similarity=similarity)
                return rule

        return None
