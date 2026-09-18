const assert = require('assert');
const googleVeoService = require('../../services/googleVeoService');

describe('GoogleVeoService', () => {
  it('should reject empty prompt validation', async () => {
    await expect(googleVeoService.createVideoTask({ prompt: '' })).rejects.toThrow(
      'Prompt is required for video generation'
    );
  });

  it('should create and queue a video generation task', async () => {
    const taskResult = await googleVeoService.createVideoTask({
      companyId: 'test_company_123',
      prompt: 'Cinematic drone shot of Egyptian cotton fabric fluttering in the breeze, golden hour',
      aspectRatio: '9:16',
      durationSeconds: 6,
    });

    expect(taskResult.taskId.startsWith('veo_')).toBe(true);
    expect(['QUEUED', 'PROCESSING']).toContain(taskResult.status);

    const status = googleVeoService.getTaskStatus(taskResult.taskId);
    expect(status).toBeDefined();
    expect(status.id).toBe(taskResult.taskId);

    const companyTasks = googleVeoService.listTasks('test_company_123');
    expect(Array.isArray(companyTasks)).toBe(true);
    expect(companyTasks.some(t => t.id === taskResult.taskId)).toBe(true);
  });
});

