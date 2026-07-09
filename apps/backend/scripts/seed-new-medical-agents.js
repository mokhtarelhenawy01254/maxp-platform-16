const fs = require("fs");
const path = require("path");
const http = require("http");

const AGENTS_DIR = "/var/www/backend2/agents";
const TOKEN = process.env.AI_SERVICE_TOKEN || "f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97";
const SLUGS = ["aesthetic-advisor","physio-coordinator","dental-care-specialist","medical-lab-analyst","mental-health-counselor"];

function readMd(dir, name) {
  if (!name) return "";
  const p = path.join(dir, name);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const opts = {
      hostname: "localhost", port: 8000,
      path: path, method: method,
      headers: {
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => resolve({ status: res.statusCode, body, ok: res.statusCode < 400 }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  for (const slug of SLUGS) {
    const dir = path.join(AGENTS_DIR, slug);
    const config = JSON.parse(fs.readFileSync(path.join(dir, "agent.json"), "utf8"));
    const data = {
      slug: config.slug, role: config.role, name: config.name, version: config.version,
      model_policy: config.modelPolicy, allowed_tools: config.allowedTools,
      allowed_skills: config.allowedSkills, channels: config.channels,
      guardrails: config.guardrails, persona_meta: config.personaMeta,
      instructions_soul: readMd(dir, config.instructions?.soul),
      instructions_agents: readMd(dir, config.instructions?.agents),
      instructions_tools: readMd(dir, config.instructions?.tools),
      instructions_persona: readMd(dir, config.instructions?.persona),
      human_approval: config.humanApproval, handoffs: config.handoffs,
      mcp_servers: config.mcpServers, budget: config.budget,
      output_schema: config.outputSchema, is_active: true
    };

    process.stdout.write(slug + " (" + config.name + ")... ");
    const result = await apiRequest("POST", "/admin/agent-templates", data);
    if (result.ok) {
      console.log("CREATED");
    } else {
      console.log("POST failed (" + result.status + "), trying PUT...");
      const result2 = await apiRequest("PUT", "/admin/agent-templates/" + encodeURIComponent(slug), data);
      console.log(result2.ok ? "  UPDATED" : "  FAILED: " + result2.body);
    }
  }
  console.log("\nDone seeding.");
}

main().catch(console.error);
