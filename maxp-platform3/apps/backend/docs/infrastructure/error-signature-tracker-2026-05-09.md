# Error signature tracker

## Context

The production error-only JSONL log gives a focused error stream, but repeated
copies of the same problem still make triage slower than it needs to be.

## Change

- Added `backend/utils/errorSignatureTracker.js` for read-only JSONL parsing,
  signature normalization, category classification, state generation, and report
  formatting.
- Added `backend/scripts/report-error-signatures.js` and the npm shortcut
  `npm run logs:error-report`.
- Added focused coverage for backend error grouping, frontend JSON payloads,
  throttled `suppressedDuplicates`, malformed JSONL lines, rotated log files,
  previous-run deltas, and CLI state writing.

## Operations

Run on production:

```bash
cd /var/www/backend2
npm run logs:error-report -- --limit 20
```

The script reads `logs/errors-only.jsonl` and rotated siblings. It stores tracker
state in `logs/error-signature-state.json`, or in `ERROR_SIGNATURE_STATE_FILE`
when configured.

Use `--since 2h` for a recent window, `--json` for automation, and
`--no-write-state` when sampling without moving the previous-run marker.
