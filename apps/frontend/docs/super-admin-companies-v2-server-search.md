# Super Admin Companies V2 — Server-Side Search

- Search is now server-side: debounced input sends `search` query param to `GET /api/v1/admin/companies`
- Server filters by `name`/`email`/`phone`/`website` via Prisma `contains + mode: insensitive`
- Backend supports `page`, `pageSize`, `status`, `plan`, `savedView`, and `sort` (createdAt/name) params
- `pageSize=0` returns all companies unpaginated (for reports page)
- Frontend `useCompanies()` hook accepts `CompaniesQueryParams` object, uses `queryKey` based on params
- `keepPreviousData` from React Query v5 maintains smooth UX during navigation/filter changes
- CompanyFilters shows a spinner icon during fetch (`searchLoading` prop)
- CompaniesTable empty state displays search-specific message with `Search` icon
- QuickStats uses server `meta.stats` with client fallback
- Removed client-side `filteredCompanies`, `sortedCompanies`, `paginatedCompanies` useMemo
