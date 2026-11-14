// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FLOW_NODES, SUB_JOURNEYS, FLOW_CONNECTIONS, FLOW_RECORDS, SMART_VARIABLES } from '../constants';

describe('Education Flows Canvas Constants & Journey', () => {
  it('contains all 5 journeys including the End-to-End full journey', () => {
    expect(SUB_JOURNEYS.length).toBe(5);
    const e2e = SUB_JOURNEYS.find((j) => j.id === 'all');
    expect(e2e).toBeDefined();
    expect(e2e?.nodeIds.length).toBeGreaterThan(10);
  });

  it('ensures message nodes contain Arabic text and valid multi-channel identity', () => {
    const messages = FLOW_NODES.filter((n) => n.type === 'message');
    expect(messages.length).toBeGreaterThanOrEqual(5);

    const validChannels = [
      'WHATSAPP',
      'WHATSAPP_WABA',
      'WHATSAPP_BAILEYS',
      'FACEBOOK_MESSENGER',
      'INSTAGRAM_DIRECT',
      'PUSH_FIRST',
    ];

    messages.forEach((msg) => {
      expect(msg.messageText).toBeDefined();
      expect(msg.messageText?.length).toBeGreaterThan(15);
      expect(validChannels).toContain(msg.channel);
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

  it('contains educational flows directory records with telemetry metrics', () => {
    expect(FLOW_RECORDS.length).toBeGreaterThanOrEqual(4);
    FLOW_RECORDS.forEach((flow) => {
      expect(flow.id).toBeDefined();
      expect(flow.name).toBeDefined();
      expect(flow.channels.length).toBeGreaterThan(0);
      expect(flow.deliveryRate).toBeGreaterThan(50);
      expect(flow.responseRate).toBeGreaterThan(50);
    });
  });

  it('contains categorized smart variables for student, session, demoday, and billing', () => {
    expect(SMART_VARIABLES.length).toBeGreaterThanOrEqual(10);
    const studentVar = SMART_VARIABLES.find((v) => v.key === '{studentName}');
    expect(studentVar).toBeDefined();
    expect(studentVar?.category).toBe('student');

    const meetVar = SMART_VARIABLES.find((v) => v.key === '{meetLink}');
    expect(meetVar).toBeDefined();
    expect(meetVar?.category).toBe('demoday');
  });
});
