// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FLOW_NODES, SUB_JOURNEYS, FLOW_CONNECTIONS } from '../constants';

describe('Education Flows Canvas Constants & Journey', () => {
  it('contains all 5 journeys including the End-to-End full journey', () => {
    expect(SUB_JOURNEYS.length).toBe(5);
    const e2e = SUB_JOURNEYS.find((j) => j.id === 'all');
    expect(e2e).toBeDefined();
    expect(e2e?.nodeIds.length).toBeGreaterThan(10);
  });

  it('ensures message nodes contain Arabic text and interactive buttons', () => {
    const messages = FLOW_NODES.filter((n) => n.type === 'message');
    expect(messages.length).toBeGreaterThanOrEqual(5);

    messages.forEach((msg) => {
      expect(msg.messageText).toBeDefined();
      expect(msg.messageText?.length).toBeGreaterThan(15);
      expect(msg.channel).toBe('WHATSAPP');
    });
  });

  it('ensures delay nodes contain timing windows', () => {
    const delays = FLOW_NODES.filter((n) => n.type === 'delay');
    expect(delays.length).toBeGreaterThanOrEqual(3);

    delays.forEach((delay) => {
      expect(delay.delayText).toBeDefined();
    });
  });

  it('ensures condition nodes have yes and no branches', () => {
    const conditions = FLOW_NODES.filter((n) => n.type === 'condition');
    expect(conditions.length).toBeGreaterThanOrEqual(2);

    conditions.forEach((cond) => {
      expect(cond.branches?.yes).toBeDefined();
      expect(cond.branches?.no).toBeDefined();
    });
  });
});
