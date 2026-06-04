import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);
const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const statPromise = util.promisify(fs.stat);

// Configuration
// Assuming mcp-server is a sibling of backend: /root/mcp-server and /root/backend
const BACKEND_PATH = path.resolve(__dirname, "..", "backend");
const LOG_FILE = path.join(BACKEND_PATH, "server_output.txt");

const server = new Server(
    {
        name: "system-control-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Helper Functions
 */
async function findScript(scriptName) {
    const locations = [
        path.join(BACKEND_PATH, scriptName),
        path.join(BACKEND_PATH, "scripts", scriptName)
    ];

    for (const loc of locations) {
        if (fs.existsSync(loc)) {
            // Check if it's a file
            const stats = await statPromise(loc);
            if (stats.isFile()) return loc;
        }
    }

    // Try adding .js if missing
    if (!scriptName.endsWith(".js")) {
        return findScript(scriptName + ".js");
    }
    return null;
}

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_tables",
                description: "List all database tables/models defined in the Prisma schema.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "check_server_health",
                description: "Check the health of the backend server.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "list_scripts",
                description: "List available maintenance and diagnostic scripts in the backend.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "run_script",
                description: "Run a backend maintenance script (e.g., check-db-status.js).",
                inputSchema: {
                    type: "object",
                    properties: {
                        scriptName: { type: "string", description: "Name of the script (e.g., 'check_db_status.js')" },
                        args: { type: "array", items: { type: "string" }, description: "Optional arguments" }
                    },
                    required: ["scriptName"]
                }
            },
            {
                name: "read_logs",
                description: "Read the last N lines of the server log.",
                inputSchema: {
                    type: "object",
                    properties: {
                        lines: { type: "number", description: "Number of lines to read (default: 50)" }
                    }
                }
            }
        ],
    };
});

/**
 * Tool Execution Handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "list_tables") {
            const schemaDir = path.join(BACKEND_PATH, "prisma", "schema");
            try {
                const files = await readdirPromise(schemaDir);
                let models = [];
                for (const file of files) {
                    if (file.endsWith(".prisma")) {
                        const content = await readFilePromise(path.join(schemaDir, file), "utf-8");
                        const matches = content.matchAll(/model\s+(\w+)\s+{/g);
                        for (const match of matches) {
                            models.push(match[1]);
                        }
                    }
                }
                return { content: [{ type: "text", text: JSON.stringify(models.sort(), null, 2) }] };
            } catch (e) {
                return { content: [{ type: "text", text: `Error reading schema: ${e.message}` }], isError: true };
            }
        }

        if (name === "check_server_health") {
            try {
                const response = await fetch("http://localhost:3007/api/health");
                if (!response.ok) throw new Error(`Status: ${response.status}`);
                const data = await response.json();
                return { content: [{ type: "text", text: `Server is UP. Response: ${JSON.stringify(data)}` }] };
            } catch (e) {
                return { content: [{ type: "text", text: `Server might be DOWN or unreachable (checking http://localhost:3007). Error: ${e.message}` }] };
            }
        }

        if (name === "list_scripts") {
            try {
                const rootScripts = (await readdirPromise(BACKEND_PATH)).filter(f => f.endsWith(".js"));
                const subScriptsDir = path.join(BACKEND_PATH, "scripts");
                const subScripts = fs.existsSync(subScriptsDir)
                    ? (await readdirPromise(subScriptsDir)).filter(f => f.endsWith(".js"))
                    : [];

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            root: rootScripts,
                            scripts_dir: subScripts
                        }, null, 2)
                    }]
                };
            } catch (e) {
                return { content: [{ type: "text", text: `Error listing scripts: ${e.message}` }], isError: true };
            }
        }

        if (name === "run_script") {
            const scriptName = args.scriptName;
            const scriptArgs = (args.args || []).join(" ");

            // Find existing script
            const scriptPath = await findScript(scriptName);
            if (!scriptPath) {
                return { content: [{ type: "text", text: `Script '${scriptName}' not found in backend or backend/scripts` }], isError: true };
            }

            // Run it
            try {
                // Executing node.js process independent of the MCP server's process
                // Passing env vars from current process combined with defaults if needed
                const cmd = `node "${scriptPath}" ${scriptArgs}`;
                const { stdout, stderr } = await execPromise(cmd, { cwd: BACKEND_PATH });

                return {
                    content: [{
                        type: "text",
                        text: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
                    }]
                };
            } catch (e) {
                return {
                    content: [{
                        type: "text",
                        text: `Execution failed.\nError: ${e.message}\nSTDOUT:\n${e.stdout}\nSTDERR:\n${e.stderr}`
                    }],
                    isError: true
                };
            }
        }

        if (name === "read_logs") {
            const linesToRead = args.lines || 50;
            try {
                // Use tail if available (windows implies powershell usually) or just read file
                // Reading entire file might be huge. Let's try simple file API with seeking or exec tail
                // Since User is on Windows, 'tail' might not exist.
                // Safe approach: Read file stats, read last N bytes, parse lines.

                if (!fs.existsSync(LOG_FILE)) {
                    return { content: [{ type: "text", text: `Log file not found at ${LOG_FILE}` }] };
                }

                const stats = await statPromise(LOG_FILE);
                const size = stats.size;
                const bufferSize = 1024 * 50; // Read last 50KB
                const start = Math.max(0, size - bufferSize);

                const handle = await fs.promises.open(LOG_FILE, 'r');
                const buffer = Buffer.alloc(size - start);
                await handle.read(buffer, 0, buffer.length, start);
                await handle.close();

                const text = buffer.toString('utf-8');
                const lines = text.split('\n');
                const lastLines = lines.slice(-linesToRead);

                return { content: [{ type: "text", text: lastLines.join('\n') }] };
            } catch (e) {
                return { content: [{ type: "text", text: `Error reading logs: ${e.message}` }], isError: true };
            }
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error executing ${name}: ${error.message}` }],
            isError: true,
        };
    }
});

/**
 * Start Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("System Control MCP Server running on stdio");
