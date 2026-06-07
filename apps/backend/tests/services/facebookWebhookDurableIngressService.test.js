const {
  createFacebookWebhookDurableIngressService,
  extractFacebookWebhookJobs,
  WEBHOOK_QUEUE_NAME,
} = require('../../legacy-ai-agent/aiAgent/facebookWebhookDurableIngressService');

describe('facebookWebhookDurableIngressService', () => {
  test('extracts durable jobs for messages, reads, and comments', () => {
    const body = {
      object: 'page',
      entry: [{
        id: 'page-1',
        messaging: [
          {
            sender: { id: 'customer-1' },
            recipient: { id: 'page-1' },
            message: { mid: 'mid-1', text: 'السعر كام؟' },
          },
          {
            sender: { id: 'customer-1' },
            read: { watermark: 1770000000000 },
          },
        ],
        changes: [{
          field: 'feed',
          value: {
            item: 'comment',
            comment_id: 'comment-1',
            message: 'بكام؟',
          },
        }],
      }],
    };

    const { jobs, hasUnsupportedInteractiveEvent } =
      extractFacebookWebhookJobs(body);

    expect(hasUnsupportedInteractiveEvent).toBe(false);
    expect(jobs.map((job) => job.name)).toEqual([
      'facebook-message',
      'facebook-read-receipt',
      'facebook-comment',
    ]);
    expect(jobs[0].idempotencyKey).toBe('fb-message:page-1:mid-1');
  });

  test('queues webhook jobs before ACK using stable idempotency keys', async () => {
    const add = jest.fn(async (_queueName, _jobName, _data, options) => ({
      id: options.idempotencyKey,
    }));
    const service = createFacebookWebhookDurableIngressService({
      queueService: { add },
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
    });

    const result = await service.enqueueFacebookWebhook({
      object: 'page',
      entry: [{
        id: 'page-1',
        messaging: [{
          sender: { id: 'customer-1' },
          recipient: { id: 'page-1' },
          message: { mid: 'mid-1', text: 'السعر كام؟' },
        }],
      }],
    });

    expect(result).toEqual(expect.objectContaining({
      handled: true,
      queued: true,
      jobCount: 1,
    }));
    expect(add).toHaveBeenCalledWith(
      WEBHOOK_QUEUE_NAME,
      'facebook-message',
      expect.objectContaining({ mid: 'mid-1', pageId: 'page-1' }),
      expect.objectContaining({ idempotencyKey: 'fb-message:page-1:mid-1' })
    );
  });

  test('returns legacy fallback signal for page echo events not owned by customer AI', async () => {
    const service = createFacebookWebhookDurableIngressService({
      queueService: { add: jest.fn() },
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
    });

    const result = await service.enqueueFacebookWebhook({
      object: 'page',
      entry: [{
        id: 'page-1',
        messaging: [{
          sender: { id: 'page-1' },
          recipient: { id: 'customer-1' },
          message: { mid: 'echo-1', is_echo: true, text: 'human reply' },
        }],
      }],
    });

    expect(result.handled).toBe(false);
    expect(result.reason).toBe('contains_page_echo_event');
  });

  test('does not fall back to legacy processing for mixed customer and echo payloads', async () => {
    const add = jest.fn(async (_queueName, _jobName, _data, options) => ({
      id: options.idempotencyKey,
    }));
    const service = createFacebookWebhookDurableIngressService({
      queueService: { add },
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
    });

    const result = await service.enqueueFacebookWebhook({
      object: 'page',
      entry: [{
        id: 'page-1',
        messaging: [
          {
            sender: { id: 'customer-1' },
            recipient: { id: 'page-1' },
            message: { mid: 'mid-1', text: 'السعر كام؟' },
          },
          {
            sender: { id: 'page-1' },
            recipient: { id: 'customer-1' },
            message: { mid: 'echo-1', is_echo: true, text: 'human reply' },
          },
        ],
      }],
    });

    expect(result.handled).toBe(true);
    expect(result.queued).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
  });

  test('throws before ACK when durable queue is unavailable', async () => {
    const service = createFacebookWebhookDurableIngressService({
      queueService: { add: jest.fn(async () => null) },
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
    });

    await expect(service.enqueueFacebookWebhook({
      object: 'page',
      entry: [{
        id: 'page-1',
        messaging: [{
          sender: { id: 'customer-1' },
          recipient: { id: 'page-1' },
          message: { mid: 'mid-1', text: 'السعر كام؟' },
        }],
      }],
    })).rejects.toThrow('webhook_queue_unavailable');
  });
});
