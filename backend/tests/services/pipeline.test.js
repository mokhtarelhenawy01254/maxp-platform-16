/**
 * Tests for the pipeline executor and resolveIntent stage.
 */

const { execute } = require('../../services/aiAgent/pipeline');
const { extractMessages, extractContext, detectCustomerChannel } = require('../../services/aiAgent/pipeline/stages/resolveIntent');

describe('pipeline.execute', () => {
  test('executes stages sequentially and passes context', async () => {
    const stage1 = jest.fn(async (ctx) => ({ ...ctx, step1: true }));
    const stage2 = jest.fn(async (ctx) => ({ ...ctx, step2: true }));

    const result = await execute({ initial: true }, [stage1, stage2]);

    expect(result.initial).toBe(true);
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
    expect(stage1).toHaveBeenCalledTimes(1);
    expect(stage2).toHaveBeenCalledTimes(1);
  });

  test('stops on earlyReturn', async () => {
    const stage1 = jest.fn(async (ctx) => ({ ...ctx, earlyReturn: { status: 'FAILED' } }));
    const stage2 = jest.fn(async (ctx) => ({ ...ctx, step2: true }));

    const result = await execute({ initial: true }, [stage1, stage2]);

    expect(result.earlyReturn).toEqual({ status: 'FAILED' });
    expect(stage2).not.toHaveBeenCalled();
  });

  test('returns context when no stages', async () => {
    const result = await execute({ initial: true }, []);
    expect(result.initial).toBe(true);
  });
});

describe('extractMessages', () => {
  test('extracts messages from string task', () => {
    const result = extractMessages('hello');
    expect(result.userMessage).toBe('hello');
    expect(result.intentMessage).toBe('hello');
    expect(result.executionMessage).toBe('hello');
    expect(result.isStructuredTask).toBe(false);
  });

  test('extracts messages from structured task', () => {
    const task = {
      description: 'test',
      currentMessage: 'current',
      executionMessage: 'execution',
    };
    const result = extractMessages(task);
    expect(result.userMessage).toBe('test');
    expect(result.intentMessage).toBe('current');
    expect(result.executionMessage).toBe('execution');
    expect(result.isStructuredTask).toBe(true);
  });

  test('falls back to description for intentMessage', () => {
    const task = { description: 'fallback' };
    const result = extractMessages(task);
    expect(result.intentMessage).toBe('fallback');
  });
});

describe('extractContext', () => {
  test('extracts context from structured task', () => {
    const task = {
      intentContext: { channel: 'FACEBOOK' },
      conversationHistory: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'how are you?' },
      ],
    };
    const result = extractContext(task);
    expect(result.intentContext).toEqual({ channel: 'FACEBOOK' });
    expect(result.formattedHistory).toContain('Customer: hi');
    expect(result.formattedHistory).toContain('Assistant: hello');
    // The last message is excluded from formattedHistory
    expect(result.formattedHistory).not.toContain('how are you?');
  });

  test('returns empty context for string task', () => {
    const result = extractContext('hello');
    expect(result.intentContext).toEqual({});
    expect(result.formattedHistory).toBe('');
  });

  test('handles single message history', () => {
    const task = {
      conversationHistory: [{ role: 'user', content: 'hi' }],
    };
    const result = extractContext(task);
    expect(result.formattedHistory).toBe('');
  });
});

describe('detectCustomerChannel', () => {
  test('detects FACEBOOK channel', () => {
    expect(detectCustomerChannel({ channel: 'FACEBOOK' })).toBe(true);
  });

  test('detects MESSENGER channel', () => {
    expect(detectCustomerChannel({ channel: 'MESSENGER' })).toBe(true);
  });

  test('detects WHATSAPP channel', () => {
    expect(detectCustomerChannel({ channel: 'WHATSAPP' })).toBe(true);
  });

  test('detects WA channel', () => {
    expect(detectCustomerChannel({ channel: 'WA' })).toBe(true);
  });

  test('detects FB channel', () => {
    expect(detectCustomerChannel({ channel: 'FB' })).toBe(true);
  });

  test('returns false for admin channel', () => {
    expect(detectCustomerChannel({ channel: 'ADMIN' })).toBe(false);
  });

  test('returns false for empty channel', () => {
    expect(detectCustomerChannel({})).toBe(false);
  });

  test('is case insensitive', () => {
    expect(detectCustomerChannel({ channel: 'facebook' })).toBe(true);
    expect(detectCustomerChannel({ channel: 'whatsapp' })).toBe(true);
  });
});
