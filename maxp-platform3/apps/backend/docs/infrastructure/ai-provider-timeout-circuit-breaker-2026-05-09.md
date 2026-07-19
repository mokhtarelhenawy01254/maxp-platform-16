# AI provider timeout circuit breaker

## Context

The production error signature tracker showed `ai.nvidia_timeout` as one of the
highest-volume signatures. A single NVIDIA timeout could be mirrored by the
provider log and the response-generator wrapper logs, and the timed-out key was
not cooled down before later requests selected it again.

## Change

- Response generation now treats provider timeouts as temporary key failures.
- Timed-out keys are marked in the existing simple key rotator with a configurable
  cooldown, defaulting to `AI_PROVIDER_TIMEOUT_COOLDOWN_MS=120000`.
- If another attempt is allowed, generation rotates to the next available key
  after the timeout cooldown is applied.
- NVIDIA request timeouts are logged as warnings while still throwing the same
  `TIMEOUT` error so fallback behavior is preserved without feeding the
  error-only ledger with expected transient provider timeouts.
- Final response-generator timeout wrappers now use `console.warn` when the
  provider already emitted the concrete timeout error, reducing error-only log
  duplication while keeping failure queue logging intact.

## Operations

To tune the cooldown on production:

```bash
AI_PROVIDER_TIMEOUT_COOLDOWN_MS=120000
```

Use the signature report to verify the effect after deploy:

```bash
cd /var/www/backend2
npm run logs:error-report -- --since 30m --limit 10
```

`ai.nvidia_timeout` should stop growing for expected NVIDIA request timeouts, and
repeated requests should rotate away from the timed-out key during the cooldown
window.
