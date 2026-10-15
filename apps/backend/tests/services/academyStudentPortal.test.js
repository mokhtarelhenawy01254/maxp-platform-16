const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  academyCourse: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  academyEnrollment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  academyProgress: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  orderStatusHistory: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
}));

const academyService = require('../../services/academyService');

describe('🎓 Academy Student Portal & Digital Checkout Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('✅ Catalog includes UNLISTED course when queried within its own company', async () => {
    mockPrisma.academyCourse.findMany.mockResolvedValue([
      {
        id: 'cmuzmwaxs07r2juml2v04xon5',
        companyId: 'cmopgxu3a07i4jujj6f1oh32h',
        title: 'كورس MaxP — من أول إعلان لأول نظام',
        price: 500,
        visibility: 'UNLISTED',
        isPublished: true,
        isGlobal: false,
        modules: [],
      },
    ]);

    const result = await academyService.getPublishedCatalog({
      companyId: 'cmopgxu3a07i4jujj6f1oh32h',
      includeUnlisted: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cmuzmwaxs07r2juml2v04xon5');
    expect(result[0].title).toContain('كورس MaxP');
  });

  test('✅ Outline guarantees first 2 lessons unlocked when freePreviewLessons = 2', async () => {
    const mockCourse = {
      id: 'cmuzmwaxs07r2juml2v04xon5',
      companyId: 'cmopgxu3a07i4jujj6f1oh32h',
      title: 'كورس MaxP — من أول إعلان لأول نظام',
      price: 500,
      freePreviewLessons: 2,
      modules: [
        {
          id: 'mod-1',
          title: 'الأساس',
          sortOrder: 1,
          lessons: [
            { id: 'les-1', title: 'الدرس 1', sortOrder: 1, durationMin: 6, isFreePreview: false, quiz: null },
            { id: 'les-2', title: 'الدرس 2', sortOrder: 2, durationMin: 8, isFreePreview: false, quiz: null },
            { id: 'les-3', title: 'الدرس 3', sortOrder: 3, durationMin: 7, isFreePreview: false, quiz: null },
          ],
        },
      ],
    };

    mockPrisma.academyCourse.findFirst.mockResolvedValue(mockCourse);

    const outline = await academyService.getCourseOutlineWithProgress({
      courseId: 'cmuzmwaxs07r2juml2v04xon5',
      companyId: 'cmopgxu3a07i4jujj6f1oh32h',
      studentPhone: '01000000099',
    });

    const lessons = outline.modules[0].lessons;
    expect(lessons[0].isFreePreview).toBe(true);
    expect(lessons[0].isUnlocked).toBe(true);
    expect(lessons[1].isFreePreview).toBe(true);
    expect(lessons[1].isUnlocked).toBe(true);
    expect(lessons[2].isFreePreview).toBe(false);
    expect(lessons[2].isUnlocked).toBe(false);
  });

  test('✅ Free preview allows unauthenticated visitors to get lesson content', async () => {
    const mockLesson = {
      id: 'les-1',
      companyId: 'cmopgxu3a07i4jujj6f1oh32h',
      title: 'الدرس 1',
      isFreePreview: true,
      videoUrl: 'https://youtube.com/watch?v=123',
      scriptText: 'سكريبت الدرس 1',
      exerciseText: 'تمرين الدرس 1',
      module: {
        course: {
          id: 'cmuzmwaxs07r2juml2v04xon5',
          companyId: 'cmopgxu3a07i4jujj6f1oh32h',
          freePreviewLessons: 2,
          isGlobal: false,
          modules: [],
        },
      },
      quiz: null,
    };

    mockPrisma.academyLesson = { findFirst: jest.fn().mockResolvedValue(mockLesson) };

    const content = await academyService.getLessonContent({
      lessonId: 'les-1',
      companyId: 'cmopgxu3a07i4jujj6f1oh32h',
    });

    expect(content.success).toBe(true);
    expect(content.lesson.title).toBe('الدرس 1');
    expect(content.lesson.scriptText).toBe('سكريبت الدرس 1');
    expect(content.isEnrolled).toBe(false);
  });
});
