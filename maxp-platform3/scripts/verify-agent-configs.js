const fs = require('fs');
const path = require('path');

const agentsDir = path.join(__dirname, '../apps/backend/agents');

let failed = false;

// Scan all agent folders
const agents = fs.readdirSync(agentsDir);
for (const agentName of agents) {
  const agentPath = path.join(agentsDir, agentName);
  if (!fs.statSync(agentPath).isDirectory()) continue;

  const agentJsonPath = path.join(agentPath, 'agent.json');
  const toolsMdPath = path.join(agentPath, 'TOOLS.md');

  if (fs.existsSync(agentJsonPath)) {
    let config;
    try {
      config = JSON.parse(fs.readFileSync(agentJsonPath, 'utf8'));
    } catch (e) {
      console.error(`[ERROR] Failed to parse agent.json for "${agentName}":`, e.message);
      failed = true;
      continue;
    }
    
    // Check if the agent has booking_reserve
    const allowedTools = config.allowedTools || [];
    if (allowedTools.includes('booking_reserve') && fs.existsSync(toolsMdPath)) {
      const toolsContent = fs.readFileSync(toolsMdPath, 'utf8');
      if (toolsContent.includes('request') && (toolsContent.includes('واحد فقط') || toolsContent.includes('parameter واحد'))) {
        console.error(`[ERROR] Agent "${agentName}" tools config uses the deprecated single-parameter "request" for booking_reserve in TOOLS.md.`);
        failed = true;
      }
    }
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('[SUCCESS] All agent configs verified successfully.');
}
