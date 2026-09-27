const taskController = require('../controller/taskController');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

jest.mock('../services/sharedDatabase', () => {
  const mockPrisma = {
    task: {
      findFirst: jest.fn(),
    },
    taskComment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskActivity: {
      create: jest.fn(),
    },
  };
  return {
    getSharedPrismaClient: jest.fn(() => mockPrisma),
    getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  };
});

jest.mock('../services/taskNotificationService', () => ({
  notifyTaskStakeholders: jest.fn().mockResolvedValue(true),
  helpers: {
    buildTaskVariables: jest.fn().mockReturnValue({}),
    normalizePriorityLabel: jest.fn().mockReturnValue('متوسط'),
    normalizeStatusLabel: jest.fn().mockReturnValue('قيد التنفيذ'),
    formatDate: jest.fn().mockReturnValue(''),
  },
}));

describe('Task Comments Controller Tests', () => {
  let mockPrisma;
  let req;
  let res;

  beforeEach(() => {
    mockPrisma = getSharedPrismaClient();
    jest.clearAllMocks();

    req = {
      params: { taskId: 'task-123' },
      body: {},
      user: {
        userId: 'user-123',
        companyId: 'company-123',
        firstName: 'Ahmed',
        lastName: 'Ali',
        role: 'AGENT',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('addComment', () => {
    test('rejects empty comment content with 400', async () => {
      req.body = { content: '   ' };
      await taskController.addComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'محتوى التعليق مطلوب' })
      );
    });

    test('returns 404 if task not found', async () => {
      req.body = { content: 'Test comment' };
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await taskController.addComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'المهمة غير موجودة' })
      );
    });

    test('creates comment successfully and returns 201 with formatted user and replies', async () => {
      req.body = {
        content: 'Valid comment content',
        mentions: ['user-1', 'user-2'],
      };

      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-123',
        title: 'Task 1',
        companyId: 'company-123',
      });

      mockPrisma.taskComment.create.mockResolvedValue({
        id: 'comment-1',
        taskId: 'task-123',
        userId: 'user-123',
        content: 'Valid comment content',
        mentions: '["user-1","user-2"]',
        isEdited: false,
        users: { id: 'user-123', firstName: 'Ahmed', lastName: 'Ali', avatar: null },
        other_task_comments: [],
      });

      await taskController.addComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم إضافة التعليق بنجاح',
          data: expect.objectContaining({
            id: 'comment-1',
            content: 'Valid comment content',
            user: expect.objectContaining({ firstName: 'Ahmed' }),
            users: expect.objectContaining({ firstName: 'Ahmed' }),
            replies: [],
          }),
        })
      );

      // Verify mentions was stringified, NOT passed as raw array
      expect(mockPrisma.taskComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mentions: '["user-1","user-2"]',
          }),
          include: expect.objectContaining({
            other_task_comments: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('getComments', () => {
    test('fetches comments and returns 200 with formatted replies and user', async () => {
      mockPrisma.taskComment.findMany.mockResolvedValue([
        {
          id: 'comment-1',
          content: 'Parent comment',
          users: { id: 'user-123', firstName: 'Ahmed', lastName: 'Ali', avatar: null },
          other_task_comments: [
            {
              id: 'reply-1',
              content: 'Nested reply',
              users: { id: 'user-456', firstName: 'Sara', lastName: 'Hassan', avatar: null },
            },
          ],
        },
      ]);

      await taskController.getComments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [
            expect.objectContaining({
              id: 'comment-1',
              user: expect.objectContaining({ firstName: 'Ahmed' }),
              replies: [
                expect.objectContaining({
                  id: 'reply-1',
                  user: expect.objectContaining({ firstName: 'Sara' }),
                }),
              ],
            }),
          ],
        })
      );
    });
  });

  describe('updateComment', () => {
    test('updates comment and returns 200 with isEdited', async () => {
      req.params = { commentId: 'comment-1' };
      req.body = { content: 'Updated content' };

      mockPrisma.taskComment.findFirst.mockResolvedValue({
        id: 'comment-1',
        userId: 'user-123',
        companyId: 'company-123',
      });

      mockPrisma.taskComment.update.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated content',
        isEdited: true,
        users: { id: 'user-123', firstName: 'Ahmed', lastName: 'Ali', avatar: null },
        other_task_comments: [],
      });

      await taskController.updateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            content: 'Updated content',
            isEdited: true,
          }),
        })
      );
    });
  });

  describe('deleteComment', () => {
    test('deletes comment and child replies, returning 200', async () => {
      req.params = { commentId: 'comment-1' };

      mockPrisma.taskComment.findFirst.mockResolvedValue({
        id: 'comment-1',
        userId: 'user-123',
        companyId: 'company-123',
      });

      mockPrisma.taskComment.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.taskComment.delete.mockResolvedValue({ id: 'comment-1' });

      await taskController.deleteComment(req, res);

      expect(mockPrisma.taskComment.deleteMany).toHaveBeenCalledWith({
        where: { parentCommentId: 'comment-1' },
      });
      expect(mockPrisma.taskComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'تم حذف التعليق بنجاح' })
      );
    });
  });
});
