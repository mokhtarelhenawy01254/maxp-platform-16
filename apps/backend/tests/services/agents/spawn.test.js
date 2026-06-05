/**
 * @module agentProvisioningService.spawn.test
 * @description Integration tests for role-based agent instantiation via spawn().
 */

const agentProvisioningService = require('../../../legacy-ai-agent/aiAgent/agentProvisioningService');
const CEOAgent = require('../../../legacy-ai-agent/aiAgent/CEOAgent');
const BaseAgent = require('../../../legacy-ai-agent/aiAgent/BaseAgent');

describe('agentProvisioningService.spawn role-based instantiation', () => {
  const companyId = 'test_spawn_company';

  afterEach(() => {
    // Clean up spawned agents
    const agents = agentProvisioningService.listAgents(companyId);
    for (const agent of agents) {
      agentProvisioningService.removeRuntimeAgent(companyId, agent.id);
    }
  });

  test('spawns CEO as CEOAgent', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'CEO' });
    expect(agent).toBeInstanceOf(CEOAgent);
    expect(agent.role).toBe('CEO');
    expect(agent.model).toBeTruthy();
  });

  test('spawns SAS_SALES as BaseAgent from template', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'SAS_SALES' });
    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent.role).toBe('SAS_SALES');
    expect(agent.model).toBeTruthy();
  });

  test('spawns SALES as BaseAgent from template', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'SALES' });
    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent.role).toBe('SALES');
    expect(agent.model).toBeTruthy();
  });

  test('spawns SUPPORT as BaseAgent from template', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'SUPPORT' });
    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent.role).toBe('SUPPORT');
    expect(agent.model).toBeTruthy();
  });

  test('spawns unknown role as BaseAgent', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'UNKNOWN_ROLE' });
    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent.role || agent.constructor.name).toBeTruthy();
  });

  test('spawned agents are registered in listAgents', async () => {
    await agentProvisioningService.spawn(companyId, { role: 'SALES', name: 'Test Sales' });
    const agents = agentProvisioningService.listAgents(companyId);
    expect(agents.length).toBeGreaterThanOrEqual(1);
    const found = agents.find(a => a.name === 'Test Sales');
    expect(found).toBeDefined();
  });
});
