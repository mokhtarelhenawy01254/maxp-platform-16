/**
 * Registry for MCP (Model Context Protocol) servers.
 * Converts MCP tools into agent-compatible tools.
 */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class McpServerRegistry {
  constructor() {
    this._servers = new Map(); // serverName -> { client, tools, transport }
  }

  /**
   * Register an MCP server from command config (like OpenAI SDK).
   * @param {string} name - Server name
   * @param {Object} config - { command, args, env, toolMetadata?: { [toolName]: { readOnly?: boolean, requiresApproval?: boolean } } }
   */
  async registerServer(name, config) {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env || {},
    });

    const client = new Client({ name: 'maxp-agent', version: '1.0.0' });
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    const toolMetadata = config.toolMetadata || {};
    const annotatedTools = tools.map(mcpTool => {
      const meta = toolMetadata[mcpTool.name] || {};
      return {
        ...mcpTool,
        _readOnly: meta.readOnly !== undefined ? Boolean(meta.readOnly) : true,
        _requiresApproval: Boolean(meta.requiresApproval),
      };
    });

    this._servers.set(name, {
      client,
      transport,
      tools: annotatedTools,
      config,
    });

    console.log(`[MCP] Registered server '${name}' with ${tools.length} tools`);
    return { name, toolCount: tools.length };
  }

  /**
   * Convert MCP tools to agent-compatible tool definitions.
   */
  getAgentTools(serverName) {
    const server = this._servers.get(serverName);
    if (!server) return [];

    return server.tools.map(mcpTool => ({
      name: `mcp_${serverName}_${mcpTool.name}`,
      description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
      readOnly: mcpTool._readOnly !== false,
      requiresApproval: mcpTool._requiresApproval === true,
      handler: async (companyId, params) => {
        const result = await server.client.callTool({
          name: mcpTool.name,
          arguments: params,
        });
        return result;
      },
      params: this._convertSchemaToParams(mcpTool.inputSchema),
    }));
  }

  _convertSchemaToParams(schema) {
    if (!schema || !schema.properties) return {};
    const params = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      params[key] = prop.description || `${key} (${prop.type || 'string'})`;
    }
    return params;
  }

  listServers() {
    return Array.from(this._servers.keys());
  }

  getAllAgentTools() {
    const allTools = [];
    for (const serverName of this._servers.keys()) {
      allTools.push(...this.getAgentTools(serverName));
    }
    return allTools;
  }

  async disconnectAll() {
    for (const [name, server] of this._servers) {
      await server.client.close();
      console.log(`[MCP] Disconnected server '${name}'`);
    }
    this._servers.clear();
  }
}

// Singleton instance
let registry = null;
function getMcpRegistry() {
  if (!registry) registry = new McpServerRegistry();
  return registry;
}

module.exports = { McpServerRegistry, getMcpRegistry };
