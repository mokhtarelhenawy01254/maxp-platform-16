# MaxP2 GitHub Actions Operating Mode - 2026-05-08

The `maxp2` continuation repository was created so development can continue
outside the original repository's exhausted Actions quota.

## Workflow Policy

- Production deployment runs on push to `main` and can also be started manually.
- Staging deployment runs on push to `staging` and can also be started manually.
- The quick Nginx repair workflow remains available manually for emergency
  server-side repairs.
- Storefront validation runs on pull requests to `main`/`staging` and can also
  be started manually.
- The continuation snapshot excludes runtime uploads, generated Prisma clients,
  old build archives, and local Redis binaries from the new repository history.

## Operating Notes

- Batch changes before triggering a deployment.
- Use local focused tests before pushing when possible.
- Trigger production deployment only after a change is ready for the VPS.
- Upload artifacts only when a workflow needs them for debugging.
- Parity checks compare clean archives against the original `main`; source,
  schema, shared code, and test files should have zero unexpected misses.
