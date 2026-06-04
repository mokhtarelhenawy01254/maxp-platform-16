# Product Landing HTML Provider Routing - 2026-05-09

## What changed

- Added a dedicated `productLandingHtmlGeneration` setting inside `GlobalAiConfig.settings`.
- The Super Admin AI Providers screen now exposes a new `Product Landing HTML` routing row.
- When this setting is pinned to a specific AI key, `HTML_GENERATED` product landings resolve that exact key through `ModelManager.getNextKeySimple(...)` with `strictProvider: true`.
- Provider-owned landing HTML generation now passes the resolved key into `aiRuntimeService.generateAIResponse(...)` with `maxKeyRetries: 1`, preventing silent failover to a different provider for this flow.

## Why

- Production was generating provider-owned landing HTML through the global default provider path only.
- With `enableFailover` enabled, a failed NVIDIA attempt could rotate into Google and hit quota/rate limits, which surfaced as `AI_FAILED` for `HTML_GENERATED` landings.
- The product-landing HTML path needed the same kind of dedicated routing control that already existed for Facebook Ads and Product Landing image generation.

## Runtime behavior

- `SYSTEM_DEFAULT`: the landing HTML request still follows the normal runtime routing rules.
- `SPECIFIC_KEY`: the request now loads the configured key and its active model directly from the database, then instantiates that exact provider/model pair. This bypasses both the generic runtime retry/failover loop and the temporary-availability cooldowns inside `ModelManager`, which had been blocking repeated landing HTML runs on an explicitly pinned key.
- If that pinned key times out or is unavailable, the route fails clearly instead of quietly rotating to another provider.
- In production on 2026-05-09, the dedicated `Product Landing HTML` route was switched from the central NVIDIA key to the central Google key `cmos3h462001mju6hzco5j8on`, whose active model is `gemma-4-31b-it`, because NVIDIA `openai/gpt-oss-120b` kept timing out on provider-owned landing HTML requests.

## Reliability hardening

- Reduced the HTML-generation prompt schema to the fields actually needed by the route, which lowers output size and timeout pressure.
- Trimmed the product payload inside the HTML prompt to a compact `variantSummary` plus fewer image URLs and a shorter reference snapshot, so large catalog items do not waste tokens on low-value detail.
- Reduced the pinned-provider response contract even further to a minimal HTML-focused JSON payload, so the model spends its budget on the landing body instead of extra blueprint metadata.
- Increased the provider timeout budget for `HTML_GENERATED` landings specifically, up to a long-form HTML window for pinned providers, instead of using the shorter generic timeout that was clipping NVIDIA before it could finish.
- Added a strict `product_landing_html_json_repair` retry path for malformed provider JSON before the route gives up.
- Added a second provider-assisted repair pass for cases where the JSON is valid but `generatedHtml` fails landing validation (for example, when the model forgets an `<a href="#order-form">...</a>` CTA). The provider still owns the fix; the app only enforces the checklist.
- The route now skips that repair retry when the provider returned only a silent timeout/failure with no usable text, so timeout cases fail fast and clearly instead of burning a second doomed request.
- The direct Google provider path now honors the same `max_tokens` and timeout options that the route passes to NVIDIA/OpenRouter, so provider-owned landing HTML requests stay bounded consistently after the Google/Gemma switchover.
- For Google/Gemini pinned keys, the route now also requests `application/json` plus an explicit response schema at the SDK level, reducing cases where the provider drifts into markdown or partially structured text instead of the strict landing JSON contract.
- The HTML prompt itself was shortened again to the minimum product/brief/reference data needed for a provider-owned landing. This reduces cases where the model spends its budget on verbose instructions and then returns malformed JSON instead of the landing contract.
- When a pinned key has more than one enabled model, the route now keeps ownership on that same key/provider but can try the next enabled model if the first one fails with timeout, quota/rate-limit, or provider-side `5xx`/internal-unavailable errors. This preserves provider ownership while avoiding avoidable `AI_FAILED` runs caused by one weak model at the top of the priority list.
- Production testing on 2026-05-09 showed the central Google key's `gemini-2.5-flash` path can hit free-tier `429 quota exceeded`, `gemma-4-31b-it` can return provider `500 Internal error`, while `gemini-3-flash-preview` still returned valid schema-locked landing JSON for the same key. The pinned-model fallback exists specifically to bridge that reliability gap without reintroducing cross-provider failover.
- Later on 2026-05-09, real browser testing from the public `maxp.online` admin path showed a second failure mode: the request could burn about 90 seconds and then die behind Cloudflare because the pinned model was too slow for provider-owned HTML on a synchronous request. The central Google key was therefore re-ordered in production to put `gemini-2.5-flash-lite` first for `HTML_GENERATED` landings, because a direct benchmark on the same key returned valid landing JSON with `generatedHtml` in about 3.5 seconds.
- The route also now tolerates a common provider-owned failure mode where the model returns the correct top-level fields but the `generatedHtml` string contains inline-style quotes that are not fully JSON-escaped. In that case, the app salvages the provider's own HTML wrapper instead of discarding it and pretending the provider failed. This is still provider-owned output; the app only repairs the transport/parsing layer.
- The route now also accepts valid raw provider HTML directly when the model returns a ready HTML fragment or an `html` fenced block instead of the requested JSON wrapper. If that HTML already passes the landing safety checks, the app stores the provider HTML as-is and only derives fallback metadata such as title, description, and CTA label around it.
- The HTML prompt was then compressed again to match the successful `flash-lite` benchmark shape: fewer repeated JSON blobs, fewer low-value instructions, and a shorter direct-response contract focused on the exact fields the route persists. The non-repair provider timeout ceiling was also lowered to 45 seconds so the route stays well below the public edge timeout budget and fails fast enough to try another enabled model on the same pinned key.

## Coverage

- Controller tests now cover saving and validating `productLandingHtmlGeneration`.
- Product landing route tests now cover:
  - honoring a pinned Product Landing HTML key
  - repairing malformed provider JSON for `HTML_GENERATED`
  - surfacing provider timeout silent failures without triggering a second repair request
  - salvaging provider-owned HTML when only the JSON wrapper is malformed because of unescaped inline-style quotes
  - accepting provider-owned raw HTML directly without forcing a JSON wrapper
