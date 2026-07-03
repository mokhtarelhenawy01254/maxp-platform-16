# Learned Patterns & Discoveries

<!-- Format:
## Pattern Name
- Context: When this applies
- Pattern: What to do
- Why: Why it works

## Feature Toggles as JSON in Company Settings
- Context: Adding boolean feature flags that vary per company (multi-tenant SaaS)
- Pattern: Store feature flags as a `features` JSON object inside `company.settings`. Frontend uses `<Switch>` in `CompanyActivationCenter` → calls `PUT /api/v1/companies/:companyId/features`. Backend merges the features key into `company.settings` and returns the updated value.
- Why: No Prisma schema migration per feature flag; JSON fields are flexible and the data volume is tiny; Switch component + dedicated endpoint keeps concerns clean-->
