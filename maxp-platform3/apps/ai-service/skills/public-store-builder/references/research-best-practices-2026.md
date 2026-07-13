# Research Best Practices 2026

Updated: 2026-04-22

This file distills current prompt-design and storefront-design guidance into rules that can be applied inside this repo's storefront engine.

## Prompt And Skill Design

- Put instructions first and separate them cleanly from context and examples.
- Be explicit about desired outcome, format, level of detail, and constraints.
- Show output structure with examples whenever formatting consistency matters.
- Tell the model what to do instead of only listing what not to do.
- Use clear structural sections or tags for complex prompts so context, instructions, and examples do not blur together.
- Keep the core prompt lean, then add tactical guidance only where the model actually struggles.
- Use eval-driven iteration instead of "looks good to me" iteration.
- Build narrow graders or checklists for the specific output properties you care about, then manually review before treating the prompt as production-ready.

## What That Means For This Skill

- Keep `SKILL.md` directive-heavy and concise.
- Move detailed theme-authoring workflow and research notes into references.
- When the skill is failing at a specific behavior, tighten one narrow instruction or one validation rule instead of bloating the whole skill.
- For new templates, require a structured output shape: positioning brief, page map, implementation, validation.

## Storefront Theme Quality Bar

- Build a unique and intentional art direction for a clearly defined merchant segment.
- Make templates different in page composition, not only in palette and copy.
- Keep settings predictable and limited; prefer reusable sections and variants over endless knobs.
- Build antifragile layouts that still look professional with imperfect images, uneven copy length, or sparse content.
- Keep the storefront mobile-first and re-test after major redesigns, new themes, or migration-like changes.
- Preserve accessibility basics such as visible keyboard focus, DOM-ordered navigation, valid HTML structure, alt text, and touch-friendly controls.
- Keep dynamic product information accessible when variants change.
- Treat JavaScript as progressive enhancement where possible; avoid heavy dependencies when native/CSS approaches are enough.
- Use responsive images, lazy-load below-the-fold media, and test performance on theme-critical pages.
- Preserve ecommerce SEO basics like stable variant URLs, canonical behavior, and structured data when the change touches those surfaces.

## Theme-Specific UX Heuristics

- `home` should answer what is being sold, why this store is credible, and where to click next within the first fold.
- `shop` should reflect the discovery mechanic that fits the segment: dense catalog, guided category exploration, comparison, seasonal edits, or merch storytelling.
- `pdp` should reduce hesitation for the exact product category: fit, ingredients, specifications, compatibility, warranty, freshness, delivery, or authenticity.
- `cart` and `checkout` should make the next step obvious and preserve trust cues instead of restarting the sales pitch.
- Search-heavy themes should keep search discoverable, lightweight, and usable on mobile.
- Media-heavy PDPs should not rely on autoplay or swipe-only navigation for critical interaction.

## Repo-Specific Application

- Use the current theme engine, presets, blueprints, page overrides, and section registry.
- For every new theme, compare against the nearest existing themes before implementation and document how the new one differs.
- In this workspace, every brand-new theme should introduce at least one brand-new variant id and use it on a key page.
- If the current section library cannot create a genuinely different journey, add a new section variant instead of shipping a near-copy.

## Sources

- OpenAI Help Center, "Best practices for prompt engineering with the OpenAI API" (updated 2026-04-14): https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api
- OpenAI Cookbook, "Codex Prompting Guide" (published 2025-12-04): https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- OpenAI Docs, "Evaluation best practices": https://developers.openai.com/api/docs/guides/evaluation-best-practices
- OpenAI Docs, "Prompt optimizer": https://developers.openai.com/api/docs/guides/prompt-optimizer
- Anthropic Docs, "Prompt engineering overview": https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
- Anthropic Docs, "Use XML tags to structure your prompts": https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags
- Shopify Dev, "Designing Shopify themes": https://shopify.dev/docs/storefronts/themes/best-practices/design/index
- Shopify Dev, "Theme store requirements": https://shopify.dev/docs/storefronts/themes/store/requirements
- Shopify Dev, "Accessibility best practices for Shopify themes": https://shopify.dev/docs/storefronts/themes/best-practices/accessibility
- Shopify Dev, "Performance best practices for Shopify themes": https://shopify.dev/docs/storefronts/themes/best-practices/performance
- Shopify Dev, "Predictive search UX guidelines": https://shopify.dev/docs/storefronts/themes/navigation-search/search/predictive-search-ux
- Shopify Dev, "Product media UX guidelines": https://shopify.dev/docs/storefronts/themes/product-merchandising/media/media-ux
- Shopify Blog, "18 Best Product Page Design Examples for Inspiration in 2026" (updated 2026-03-20): https://www.shopify.com/blog/product-page
- Shopify Blog, "Mobile-First Indexing: Best Practices + Tips for Ecommerce (2026)" (published 2026-01-27): https://www.shopify.com/blog/mobile-first-indexing
- Google Search Central, "Designing a URL structure for ecommerce websites" (published 2025-12-10): https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites
- Google Search Central, "Structured Data for Ecommerce Sites" (last updated 2025-12-10): https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce
