const providerLogs = [];
const approvalRequests = [];
const companyAgents = [];
const agentDepartments = [];
const aiAgentTasks = [];

jest.mock('../../services/sharedDatabase', () => {
  const matchesWhere = (row, where = {}) => {
    if (!where) return true;
    return Object.entries(where).every(([key, expected]) => {
      if (key === 'OR' && Array.isArray(expected)) {
        return expected.some(clause => matchesWhere(row, clause));
      }
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (expected.not !== undefined) {
          return row[key] !== expected.not;
        }
        if (expected.contains !== undefined) {
          return String(row[key] || '').includes(expected.contains);
        }
        if (expected.in !== undefined) {
          return expected.in.includes(row[key]);
        }
        return true;
      }
      return row[key] === expected;
    });
  };

  const aiProviderLog = {
    create: jest.fn(({ data }) => {
      const row = {
        id: `log_${providerLogs.length + 1}`,
        createdAt: new Date(),
        ...data,
      };
      providerLogs.push(row);
      return Promise.resolve(row);
    }),
    findFirst: jest.fn(({ where } = {}) => Promise.resolve(providerLogs.find(row => matchesWhere(row, where)) || null)),
    findMany: jest.fn(({ where } = {}) => Promise.resolve(providerLogs.filter(row => matchesWhere(row, where)))),
    update: jest.fn(({ where, data }) => {
      const row = providerLogs.find(item => item.id === where.id);
      if (!row) return Promise.reject(new Error('log not found'));
      Object.assign(row, data);
      return Promise.resolve(row);
    }),
    updateMany: jest.fn(({ where, data } = {}) => {
      let count = 0;
      for (const row of providerLogs) {
        if (matchesWhere(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    }),
    deleteMany: jest.fn(({ where } = {}) => {
      const before = providerLogs.length;
      for (let index = providerLogs.length - 1; index >= 0; index -= 1) {
        if (matchesWhere(providerLogs[index], where)) providerLogs.splice(index, 1);
      }
      return Promise.resolve({ count: before - providerLogs.length });
    }),
  };

  const aiToolApprovalRequest = {
    create: jest.fn(({ data }) => {
      const row = {
        id: `approval_${approvalRequests.length + 1}`,
        createdAt: new Date(),
        ...data,
      };
      approvalRequests.push(row);
      return Promise.resolve(row);
    }),
    findFirst: jest.fn(({ where } = {}) => Promise.resolve(approvalRequests.find(row => matchesWhere(row, where)) || null)),
    findMany: jest.fn(({ where } = {}) => Promise.resolve(approvalRequests.filter(row => matchesWhere(row, where)))),
    update: jest.fn(({ where, data }) => {
      const row = approvalRequests.find(item => item.id === where.id);
      if (!row) return Promise.reject(new Error('approval not found'));
      Object.assign(row, data);
      return Promise.resolve(row);
    }),
    updateMany: jest.fn(({ where, data } = {}) => {
      let count = 0;
      for (const row of approvalRequests) {
        if (matchesWhere(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    }),
    deleteMany: jest.fn(() => {
      const count = approvalRequests.length;
      approvalRequests.splice(0, approvalRequests.length);
      return Promise.resolve({ count });
    }),
  };

  const companyAgent = {
    upsert: jest.fn(({ where, create, update }) => {
      let row = companyAgents.find(item => item.id === where.id);
      if (row) {
        Object.assign(row, update);
      } else {
        row = {
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        companyAgents.push(row);
      }
      return Promise.resolve(row);
    }),
    findFirst: jest.fn(({ where } = {}) => Promise.resolve(companyAgents.find(row => matchesWhere(row, where)) || null)),
    findMany: jest.fn(({ where } = {}) => Promise.resolve(companyAgents.filter(row => matchesWhere(row, where)))),
    updateMany: jest.fn(({ where, data } = {}) => {
      let count = 0;
      for (const row of companyAgents) {
        if (matchesWhere(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    }),
    deleteMany: jest.fn(({ where } = {}) => {
      const before = companyAgents.length;
      for (let index = companyAgents.length - 1; index >= 0; index -= 1) {
        if (matchesWhere(companyAgents[index], where)) companyAgents.splice(index, 1);
      }
      return Promise.resolve({ count: before - companyAgents.length });
    }),
  };

  const facebookPage = {
    findFirst: jest.fn(({ where } = {}) => Promise.resolve(
      where?.companyId === 'comp_with_facebook'
        ? { id: 'fb_page_1', companyId: 'comp_with_facebook', status: 'connected' }
        : null
    )),
  };

  const agentDepartment = {
    upsert: jest.fn(({ where, create, update }) => {
      let row = agentDepartments.find(item => item.id === where.id);
      if (row) {
        Object.assign(row, update);
      } else {
        row = {
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        agentDepartments.push(row);
      }
      return Promise.resolve(row);
    }),
    findMany: jest.fn(({ where } = {}) => Promise.resolve(agentDepartments.filter(row => {
      if (!where) return true;
      return Object.entries(where).every(([key, expected]) => row[key] === expected);
    }))),
  };

  const aiAgentTask = {
    create: jest.fn(({ data }) => {
      const row = { id: `task_${aiAgentTasks.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      aiAgentTasks.push(row);
      return Promise.resolve(row);
    }),
    findFirst: jest.fn(({ where } = {}) => Promise.resolve(aiAgentTasks.find(row => matchesWhere(row, where)) || null)),
    findMany: jest.fn(({ where } = {}) => Promise.resolve(aiAgentTasks.filter(row => matchesWhere(row, where)))),
    update: jest.fn(({ where, data }) => {
      const row = aiAgentTasks.find(item => item.id === where.id);
      if (!row) return Promise.reject(new Error('task not found'));
      Object.assign(row, data);
      return Promise.resolve(row);
    }),
    updateMany: jest.fn(({ where, data } = {}) => {
      let count = 0;
      for (const row of aiAgentTasks) {
        if (matchesWhere(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    }),
  };

  const defaultDepartmentsForCompany = (companyId) => ([
    { id: `agent_dept_${companyId.slice(-6)}_executive`, companyId, key: 'executive', name: 'الإدارة الرئيسية', icon: '👑', sortOrder: 1 },
    { id: `agent_dept_${companyId.slice(-6)}_sales`, companyId, key: 'sales', name: 'المبيعات', icon: '💼', sortOrder: 10 },
    { id: `agent_dept_${companyId.slice(-6)}_support`, companyId, key: 'support', name: 'الدعم', icon: '🎧', sortOrder: 20 },
    { id: `agent_dept_${companyId.slice(-6)}_inventory`, companyId, key: 'inventory', name: 'المخزون والتسعير', icon: '📦', sortOrder: 30 },
    { id: `agent_dept_${companyId.slice(-6)}_marketing`, companyId, key: 'marketing', name: 'التسويق', icon: '📣', sortOrder: 40 },
    { id: `agent_dept_${companyId.slice(-6)}_messenger`, companyId, key: 'messenger', name: 'فيسبوك وماسنجر', icon: '💬', sortOrder: 50 },
    { id: `agent_dept_${companyId.slice(-6)}_operations`, companyId, key: 'operations', name: 'العمليات', icon: '⚙️', sortOrder: 60 },
  ]);

  const executeRawUnsafe = jest.fn((sql = '') => {
    const text = String(sql);
    if (text.includes('INSERT INTO "agent_departments"')) {
      const companyId = text.match(/'([^']+)',\s*'([^']+)',\s*'([^']+)'/)?.[2];
      if (companyId) {
        for (const dept of defaultDepartmentsForCompany(companyId)) {
          if (!agentDepartments.some(row => row.companyId === companyId && row.key === dept.key)) {
            agentDepartments.push(dept);
          }
        }
      }
    }
    if (text.includes('UPDATE "company_agents"')) {
      const agentId = text.match(/WHERE "id" = '([^']+)'/)?.[1];
      const departmentId = text.match(/"departmentId" = '([^']+)'/)?.[1] || null;
      const managerType = text.match(/"managerType" = '([^']+)'/)?.[1] || 'AGENT';
      const row = companyAgents.find(item => item.id === agentId);
      if (row) Object.assign(row, { departmentId, managerType });
    }
    return Promise.resolve(0);
  });

  const queryRawUnsafe = jest.fn((sql = '') => {
    const text = String(sql);
    const companyId = text.match(/"companyId"\s*=\s*'([^']+)'/)?.[1] || 'comp1';
    if (text.includes('FROM "agent_departments"')) {
      const existing = agentDepartments.filter(row => row.companyId === companyId);
      return Promise.resolve((existing.length ? existing : defaultDepartmentsForCompany(companyId))
        .sort((a, b) => a.sortOrder - b.sortOrder));
    }
    if (text.includes('FROM "company_agents" ca')) {
      return Promise.resolve(companyAgents
        .filter(row => row.companyId === companyId)
        .map(row => {
          const dept = agentDepartments.find(item => item.id === row.departmentId);
          return {
            id: row.id,
            departmentId: row.departmentId || null,
            managerType: row.managerType || null,
            departmentKey: dept?.key || null,
            departmentName: dept?.name || null,
            departmentIcon: dept?.icon || null,
          };
        }));
    }
    return Promise.resolve([]);
  });

  return {
    getSharedPrismaClient: jest.fn(() => ({
      aiProviderLog,
      aiToolApprovalRequest,
      companyAgent,
      facebookPage,
      agentDepartment,
      aiAgentTask,
      agentDefinition: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $executeRawUnsafe: executeRawUnsafe,
      $queryRawUnsafe: queryRawUnsafe,
    })),
  };
});

const agentManagerService = require('../../services/aiAgent/agentManagerService');
const agentInboxService = require('../../services/aiAgent/agentInboxService');
const agentProvisioningService = require('../../services/aiAgent/agentProvisioningService');
const toolOrchestratorService = require('../../services/aiAgent/toolOrchestratorService');
const draftProposalService = require('../../services/aiAgent/draftProposalService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Agent manager runtime layer', () => {
  beforeEach(async () => {
    providerLogs.splice(0, providerLogs.length);
    approvalRequests.splice(0, approvalRequests.length);
    companyAgents.splice(0, companyAgents.length);
    agentDepartments.splice(0, agentDepartments.length);
    aiAgentTasks.splice(0, aiAgentTasks.length);
    toolOrchestratorService.unregisterHandler('product.search');
    await agentInboxService._reset();
    agentProvisioningService._reset();
    agentManagerService.registerToolHandlers(toolOrchestratorService);
  });

  test('hires template-backed agents and returns manager context', async () => {
    const hired = await agentManagerService.hireAgent('comp1', { role: 'SUPPORT' });
    const context = await agentManagerService.getManagerContext('comp1');

    expect(hired.success).toBe(true);
    expect(hired.agent.templateSlug).toBe('support-agent');
    expect(hired.agent.allowedSkills).toEqual(expect.arrayContaining(['order-support']));
    expect(context.manager.templateSlug).toBe('manager-ceo');
    expect(context.agents.map(agent => agent.role)).toEqual(expect.arrayContaining(['CEO', 'SUPPORT']));
    expect(context.departments.map(department => department.key)).toEqual(expect.arrayContaining(['executive', 'support', 'messenger']));
    expect(context.tools.length).toBeGreaterThan(10);
    expect(context.skills.length).toBeGreaterThan(5);
  });

  test('reconciles existing manager agents with updated template tools', async () => {
    const manager = await agentManagerService.getManagerAgent('comp1');
    manager.allowedTools.delete('skill.create');
    manager.allowedTools.delete('product.create');

    const reconciled = await agentManagerService.getManagerAgent('comp1');

    expect(reconciled.canUseTool('skill.create')).toBe(true);
    expect(reconciled.canUseTool('product.create')).toBe(true);
  });

  test('reuses an active agent when hiring the same role and name again', async () => {
    const first = await agentManagerService.hireAgent('comp1', {
      role: 'MARKETING',
      name: 'Wofod Marketing Agent',
    });
    const second = await agentManagerService.hireAgent('comp1', {
      role: 'MARKETING',
      name: 'Wofod Marketing Agent',
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.reused).toBe(true);
    expect(second.agent.id).toBe(first.agent.id);
    const marketingAgents = agentProvisioningService.listAgents('comp1')
      .filter(agent => agent.role === 'MARKETING' && agent.name === 'Wofod Marketing Agent');
    expect(marketingAgents).toHaveLength(1);
  });

  test('does not report a hired agent when durable persistence fails', async () => {
    const prisma = getSharedPrismaClient();
    const originalUpsert = prisma.companyAgent.upsert;
    prisma.companyAgent.upsert = jest.fn(() => Promise.reject(new Error('database unavailable')));

    await expect(agentManagerService.hireAgent('comp1', {
      role: 'SUPPORT',
      name: 'Broken Support Agent',
    })).rejects.toThrow('AGENT_HIRE_PERSIST_FAILED');

    prisma.companyAgent.upsert = originalUpsert;

    expect(agentProvisioningService.listAgents('comp1').some(agent => (
      agent.name === 'Broken Support Agent' && agent.status === 'ACTIVE'
    ))).toBe(false);
  });

  test('auto-registers Facebook Messenger agent for companies with connected Facebook pages', async () => {
    const context = await agentManagerService.getManagerContext('comp_with_facebook');
    const facebookAgent = context.agents.find(agent => agent.role === 'FACEBOOK_SALES_SUPPORT');
    const dbRow = companyAgents.find(row => row.role === 'FACEBOOK_SALES_SUPPORT');

    expect(facebookAgent).toBeTruthy();
    expect(facebookAgent.name).toBe('وكيل فيسبوك وماسنجر');
    expect(facebookAgent.templateSlug).toBe('facebook-sales-support-agent');
    expect(facebookAgent.allowedTools).toEqual(expect.arrayContaining([
      'product.search',
      'order.create_draft',
      'agent.handoff',
    ]));
    expect(facebookAgent.allowedTools).not.toEqual(expect.arrayContaining(['agent.spawn']));
    expect(dbRow.name).toBe('وكيل فيسبوك وماسنجر');
    expect(dbRow.status).toBe('ACTIVE');
    expect(dbRow.templateSlug).toBe('facebook-sales-support-agent');
    expect(dbRow.createdBy).toBe('system_global_template');
    expect(dbRow.departmentId).toContain('_messenger');
    expect(dbRow.managerType).toBe('DEPARTMENT_MANAGER');
    expect(JSON.parse(dbRow.skills)).toEqual(expect.arrayContaining(['facebook-sales-conversion']));
  });

  test('auto-registers Facebook Messenger agent for all companies by default', async () => {
    const context = await agentManagerService.getManagerContext('comp_without_facebook');
    const facebookAgent = context.agents.find(agent => agent.role === 'FACEBOOK_SALES_SUPPORT');
    const dbRow = companyAgents.find(row => row.companyId === 'comp_without_facebook' && row.role === 'FACEBOOK_SALES_SUPPORT');

    expect(facebookAgent).toBeTruthy();
    expect(dbRow).toBeTruthy();
    expect(dbRow.createdBy).toBe('system_global_template');
  });

  test('allows each company to customize the default Facebook Messenger agent name and reply instructions', async () => {
    const context = await agentManagerService.getManagerContext('comp_with_facebook');
    const facebookAgent = context.agents.find(agent => agent.role === 'FACEBOOK_SALES_SUPPORT');
    const customSoul = '# Custom Messenger Voice\nUse a concise premium support voice for this company.';

    const updated = await agentManagerService.updateAgentProfile('comp_with_facebook', {
      agentId: facebookAgent.id,
      name: 'Premium Messenger Agent',
      soulInstructions: customSoul,
      requestedBy: 'company_admin',
    });

    const dbRow = companyAgents.find(row => row.id === facebookAgent.id);

    expect(updated.success).toBe(true);
    expect(updated.agent.name).toBe('Premium Messenger Agent');
    expect(updated.agent.persona.soulInstructions).toBe(customSoul);
    expect(dbRow).toEqual(expect.objectContaining({
      name: 'Premium Messenger Agent',
      soul: customSoul,
    }));
  });

  test('refreshes stale Facebook Messenger template soul snapshots from the current profile', () => {
    const oldTemplateSoul = [
      '# SOUL.md - Agent Identity & Voice Config',
      '',
      'You are a careful Arabic-speaking Messenger sales/support agent for a merchant.',
      'You are warm, concise, and commercially useful, but you never invent prices,',
      'stock, discounts, delivery promises, or order status.',
    ].join('\n');

    const agent = agentProvisioningService._restoreAgent('comp1', {
      id: 'agent_fb_old_soul',
      name: 'وكيل فيسبوك وماسنجر',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'gemini-2.5-flash',
      templateSlug: 'facebook-sales-support-agent',
      soul: oldTemplateSoul,
      status: 'ACTIVE',
    });

    expect(agent.persona.soulInstructions).toContain('dialect:');
    expect(agent.persona.soulInstructions).not.toBe(oldTemplateSoul);
    expect(agent.persona.templateSoulRefreshed).toBe(true);
  });

  test('preserves clearly custom Facebook Messenger soul snapshots', () => {
    const customSoul = '# Custom Wofod Messenger Voice\nUse a concise premium support voice.';

    const agent = agentProvisioningService._restoreAgent('comp1', {
      id: 'agent_fb_custom_soul',
      name: 'وكيل فيسبوك وماسنجر',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'gemini-2.5-flash',
      templateSlug: 'facebook-sales-support-agent',
      soul: customSoul,
      status: 'ACTIVE',
    });

    expect(agent.persona.soulInstructions).toBe(customSoul);
    expect(agent.persona.templateSoulRefreshed).toBeUndefined();
  });

  test('archives agents from both durable storage and runtime lists', async () => {
    const hired = await agentManagerService.hireAgent('comp1', {
      role: 'SALES',
      name: 'Codex Runtime Cleanup Agent',
    });

    expect(agentProvisioningService.getAgent('comp1', hired.agent.id)).toBeTruthy();

    const archived = await agentManagerService.archiveAgent('comp1', hired.agent.id);
    const context = await agentManagerService.getManagerContext('comp1');
    const dbRow = companyAgents.find(row => row.id === hired.agent.id);

    expect(archived).toEqual(expect.objectContaining({
      success: true,
      agentId: hired.agent.id,
      archivedCount: 1,
      removedRuntime: true,
    }));
    expect(dbRow.status).toBe('ARCHIVED');
    expect(agentProvisioningService.getAgent('comp1', hired.agent.id)).toBeNull();
    expect(context.agents.some(agent => agent.id === hired.agent.id)).toBe(false);
  });

  test('delegates goals into inbox tasks with checkout locking', async () => {
    const delegation = await agentManagerService.delegateGoal('comp1', {
      goal: 'Restock inventory for low-stock products',
      autoHire: true,
    });

    expect(delegation.success).toBe(true);
    expect(delegation.tasks.length).toBeGreaterThanOrEqual(2);

    const inbox = await agentInboxService.listTasks('comp1', { activeOnly: true });
    expect(inbox.length).toBe(delegation.tasks.length);

    const task = inbox[0];
    const checkout = await agentInboxService.checkoutTask('comp1', task.id, task.agentId);
    expect(checkout.success).toBe(true);
    expect(checkout.task.status).toBe('CHECKED_OUT');

    const doubleCheckout = await agentInboxService.checkoutTask('comp1', task.id, 'agent_other');
    expect(doubleCheckout.success).toBe(false);
    expect(doubleCheckout.error).toMatch(/TASK_/);

    const completed = await agentInboxService.completeTask('comp1', task.id, task.agentId, { summary: 'done' });
    expect(completed.success).toBe(true);
    expect(completed.task.status).toBe('COMPLETED');
  });

  test('executes read tools through registered handlers', async () => {
    const hired = await agentManagerService.hireAgent('comp1', { role: 'SALES' });
    toolOrchestratorService.registerHandler('product.search', async (companyId, input) => ({
      products: [{ id: 'p1', name: input.query }],
    }));

    const result = await toolOrchestratorService.execute('comp1', {
      agentId: hired.agent.id,
      toolName: 'product.search',
      input: { query: 'sneakers', limit: 3 },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('EXECUTED');
    expect(result.output.products[0].name).toBe('sneakers');
  });

  test('denies invalid input and disallowed tools before execution', async () => {
    const hired = await agentManagerService.hireAgent('comp1', { role: 'SALES' });

    const invalid = await toolOrchestratorService.execute('comp1', {
      agentId: hired.agent.id,
      toolName: 'product.search',
      input: {},
    });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toBe('INVALID_TOOL_INPUT');

    const disallowed = await toolOrchestratorService.execute('comp1', {
      agentId: hired.agent.id,
      toolName: 'product.updatePrice',
      input: { productId: 'p1', newPrice: 100 },
    });
    expect(disallowed.success).toBe(false);
    expect(disallowed.error).toBe('TOOL_NOT_PERMITTED');
  });

  test('converts write tools into approval drafts', async () => {
    const context = await agentManagerService.getManagerContext('comp1');
    expect(draftProposalService.isWriteAction('discount.create_draft')).toBe(true);
    expect(draftProposalService.isWriteAction('order.create_draft')).toBe(true);

    const result = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'discount.create_draft',
      input: { code: 'SUMMER10', discountPercent: 10, reason: 'campaign test' },
      reasoning: 'Marketing proposal needs human review',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.draft.draftId).toBe('approval_1');
    expect(approvalRequests[0].toolName).toBe('discount.create_draft');
  });

  test('runs sales agent order tasks as approval-required order drafts', async () => {
    const hired = await agentManagerService.hireAgent('comp1', {
      role: 'SALES',
      name: 'وكيل مبيعات فيسبوك',
    });

    const result = await agentManagerService.runAgentTask('comp1', {
      agentName: hired.agent.name,
      task: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 2',
      traceId: 'trace_order_task',
    });

    expect(result.success).toBe(true);
    expect(result.result.success).toBe(true);
    expect(result.result.result.draftId).toBe('approval_1');
    expect(approvalRequests[0].toolName).toBe('order.create_draft');
    expect(JSON.parse(approvalRequests[0].inputSnapshot)).toEqual(expect.objectContaining({
      productName: 'كوتشي اختبار',
      productPrice: 100,
      quantity: 2,
      customerName: 'أحمد',
      customerPhone: '01000000000',
    }));
  });

  test('runs a newly hired agent when the user prefixes its name with a generic agent label', async () => {
    const hired = await agentManagerService.hireAgent('comp1', {
      role: 'SALES',
      name: 'Codex Facebook Smoke 775325',
    });

    const result = await agentManagerService.runAgentTask('comp1', {
      agentName: `الوكيل ${hired.agent.name}`,
      task: 'اعمل مسودة اوردر للعميل Codex FB Customer 01011111111 منتج منتج اختبار كودكس السعر 15 الكمية 1',
      traceId: 'trace_prefixed_agent_name',
    });

    expect(result.success).toBe(true);
    expect(result.agent.id).toBe(hired.agent.id);
    expect(result.result.success).toBe(true);
    expect(approvalRequests[0].toolName).toBe('order.create_draft');
    expect(JSON.parse(approvalRequests[0].inputSnapshot)).toEqual(expect.objectContaining({
      productName: 'منتج اختبار كودكس',
      productPrice: 15,
      quantity: 1,
      customerName: 'Codex FB Customer',
      customerPhone: '01011111111',
    }));
  });

  test('deduplicates identical pending order drafts instead of creating duplicates', async () => {
    const context = await agentManagerService.getManagerContext('comp1');
    const input = {
      productName: 'كوتشي اختبار',
      productPrice: 100,
      quantity: 1,
      customerName: 'أحمد',
      customerPhone: '01000000000',
    };

    const first = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'order.create_draft',
      input,
      reasoning: 'First order draft',
    });
    const second = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'order.create_draft',
      input,
      reasoning: 'Same order draft repeated',
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.draft.deduplicated).toBe(true);
    expect(second.draft.draftId).toBe('approval_1');
    expect(approvalRequests).toHaveLength(1);
  });

  test('supersedes older pending order draft revisions instead of blocking the agent', async () => {
    const context = await agentManagerService.getManagerContext('comp1');
    const baseInput = {
      productName: 'كوتشي اختبار',
      productPrice: 100,
      quantity: 1,
      customerName: 'أحمد',
      customerPhone: '01000000000',
    };

    const first = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'order.create_draft',
      input: baseInput,
      reasoning: 'First order draft',
    });
    const revised = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'order.create_draft',
      input: { ...baseInput, quantity: 2 },
      reasoning: 'Quantity correction from the same customer thread',
      traceId: 'trace_revision_1',
    });

    expect(first.success).toBe(true);
    expect(revised.success).toBe(true);
    expect(revised.status).toBe('PENDING_APPROVAL');
    expect(revised.draft.draftId).toBe('approval_2');
    expect(revised.draft.supersedesDraftId).toBe('approval_1');
    expect(approvalRequests[0].status).toBe('SUPERSEDED');
    expect(approvalRequests[1].status).toBe('PENDING');
    expect(JSON.parse(approvalRequests[1].metadata)).toEqual(expect.objectContaining({
      supersedesDraftId: 'approval_1',
    }));
  });

  test('blocks conflicting pending write drafts for the same business resource', async () => {
    const context = await agentManagerService.getManagerContext('comp1');

    const first = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'discount.create_draft',
      input: { code: 'FLASH20', discountPercent: 20, reason: 'first campaign' },
      reasoning: 'First discount draft',
    });

    const second = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'discount.create_draft',
      input: { code: 'FLASH20', discountPercent: 35, reason: 'conflicting campaign' },
      reasoning: 'Second discount draft',
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.status).toBe('DRAFT_FAILED');
    expect(second.draft.error).toBe('CONFLICTING_PENDING_ACTION');
    expect(second.draft.conflict.draftId).toBe('approval_1');
  });

  test('blocks active inbox task conflicts until the current task is completed', async () => {
    const support = await agentManagerService.hireAgent('comp1', { role: 'SUPPORT' });
    const first = await agentManagerService.assignTask('comp1', {
      agentId: support.agent.id,
      title: 'Review price change for product p1',
      conflictKey: 'product:p1:price',
      conflictAction: 'increase-price',
      conflictResource: 'p1',
      conflictScope: 'product-price',
    });

    await expect(agentManagerService.assignTask('comp1', {
      agentId: support.agent.id,
      title: 'Review price rollback for product p1',
      conflictKey: 'product:p1:price',
      conflictAction: 'decrease-price',
      conflictResource: 'p1',
      conflictScope: 'product-price',
    })).rejects.toThrow('ACTIVE_TASK_CONFLICT');

    await agentInboxService.completeTask('comp1', first.task.id, support.agent.id, { summary: 'approved' });
    const next = await agentManagerService.assignTask('comp1', {
      agentId: support.agent.id,
      title: 'Review price rollback for product p1',
      conflictKey: 'product:p1:price',
      conflictAction: 'decrease-price',
      conflictResource: 'p1',
      conflictScope: 'product-price',
    });

    expect(next.success).toBe(true);
    expect(next.task.metadata.conflictKey).toBe('product:p1:price');
  });

  test('manager tools can assign tasks through the orchestrator', async () => {
    const context = await agentManagerService.getManagerContext('comp1');
    const support = await agentManagerService.hireAgent('comp1', { role: 'SUPPORT' });

    const result = await toolOrchestratorService.execute('comp1', {
      agentId: context.manager.id,
      toolName: 'agent.assign_task',
      input: {
        agentId: support.agent.id,
        title: 'Review delayed order',
        description: 'Look up the order and prepare a support summary',
        priority: 'high',
      },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('EXECUTED');
    expect(result.output.agentId).toBe(support.agent.id);
  });
});
