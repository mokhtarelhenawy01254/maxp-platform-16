const SENSITIVE = /(user_?id|company_?id|tenant_?id|session_?id|employee_?id|member_?id)$/i;

export function redactActionParams(params?: Record<string, unknown> | null): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params || {})
      .filter(([k]) => !SENSITIVE.test(k))
      .map(([k, v]) => [k, typeof v === "object" ? v : String(v)])
  );
}
