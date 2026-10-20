/**
 * MCP deployment status — the single source of truth for whether the MCP
 * servers are actually published in the current environment.
 *
 * Why this file exists (2026-10):
 *   The Developer Hub used to render a copy-ready MCP client config pointing at
 *   `<origin>/mcp/catalog`, but `/mcp/*` is not served in production (MCP
 *   servers are not deployed), so every copied config was a dead link. The hub
 *   now asks this module instead of assuming the servers exist.
 *
 * Source of truth is environment configuration, read on EVERY call (never
 * cached at require-time) so flipping the setting + restarting the API is
 * enough to bring the config UI back — no code change:
 *
 *   MCP_SERVERS_DEPLOYED=true         # servers are published behind the gateway
 *   MCP_GATEWAY_PUBLIC_URL=https://…  # optional public base for the gateway
 *                                     # (defaults to null → client uses origin)
 *
 * Absent/falsey MCP_SERVERS_DEPLOYED means "not deployed" and the API reports
 * `{ available: false, reason: 'not_deployed' }`.
 */

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

/** Servers exposed by the MCP gateway once it is deployed. */
const MCP_SERVERS = Object.freeze([
  Object.freeze({
    id: 'catalog',
    path: '/mcp/catalog',
    tools: Object.freeze(['search', 'inventory_check', 'product_get']),
  }),
  Object.freeze({
    id: 'video',
    path: '/mcp/video',
    tools: Object.freeze(['create_video_task', 'check_video_status', 'list_recent_videos']),
  }),
]);

const parseFlag = (value) => TRUTHY_VALUES.has(String(value ?? '').trim().toLowerCase());

/** True only when the environment explicitly declares the servers deployed. */
const isMcpDeployed = () => parseFlag(process.env.MCP_SERVERS_DEPLOYED);

/** Optional public gateway base URL (e.g. https://mcp.example.com). */
const getGatewayPublicUrl = () => {
  const raw = String(process.env.MCP_GATEWAY_PUBLIC_URL || '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
};

/**
 * Current availability snapshot for external consumers (Developer Hub).
 *
 * @returns {{
 *   available: boolean,
 *   reason: string|null,
 *   gatewayBaseUrl: string|null,
 *   servers: Array<{id: string, path: string, tools: string[], url: string|null}>,
 *   checkedAt: string
 * }}
 */
const getMcpDeploymentStatus = () => {
  const gatewayBaseUrl = getGatewayPublicUrl();
  const checkedAt = new Date().toISOString();

  if (!isMcpDeployed()) {
    return {
      available: false,
      reason: 'not_deployed',
      gatewayBaseUrl: null,
      servers: [],
      checkedAt,
    };
  }

  return {
    available: true,
    reason: null,
    gatewayBaseUrl,
    servers: MCP_SERVERS.map((server) => ({
      id: server.id,
      path: server.path,
      tools: [...server.tools],
      url: gatewayBaseUrl ? `${gatewayBaseUrl}${server.path}` : null,
    })),
    checkedAt,
  };
};

module.exports = {
  MCP_SERVERS,
  isMcpDeployed,
  getGatewayPublicUrl,
  getMcpDeploymentStatus,
};
