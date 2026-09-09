import { apiClient } from "@/services/api";

export interface Question {
  id?: string;
  q: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Quiz {
  id?: string;
  lessonId?: string;
  title?: string;
  passScorePercent: number;
  questions: Question[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  moduleTitle?: string;
  courseId?: string;
  courseTitle?: string;
  title: string;
  sortOrder: number;
  videoUrl?: string | null;
  scriptText?: string | null;
  exerciseText?: string | null;
  durationMin?: number;
  isFreePreview: boolean;
  isUnlocked?: boolean;
  hasQuiz?: boolean;
  quiz?: Quiz | null;
  progress?: {
    id?: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
    quizScore?: number | null;
    attemptsCount?: number;
  };
}

export interface Module {
  id: string;
  courseId?: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  price: number;
  thumbnailUrl?: string | null;
  isPublished: boolean;
  freePreviewLessons: number;
  storeProductId?: string | null;
  visibility?: "PUBLIC" | "UNLISTED" | "INVITE_ONLY" | "TAG_GATED";
  allowedTags?: string[];
  enableWatermark?: boolean;
  isEnrolled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  modules?: Module[];
  _count?: {
    enrollments?: number;
  };
}

export interface MyEnrollment {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  completedAt?: string | null;
  progressPercent: number;
  completedCount: number;
  totalLessons: number;
  certificate?: any;
  course: Course & { modulesCount?: number; lessonsCount?: number };
}

export interface StudentProgressRow {
  id: string;
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  status: string;
  enrolledAt: string;
  completedAt?: string | null;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  hasCertificate: boolean;
  certificateNumber?: string | null;
}

// -------------------------------------------------------------
// API Calls
// -------------------------------------------------------------

export const academyApi = {
  // Courses
  async getCourses(): Promise<Course[]> {
    const res = await apiClient.get("/api/v1/academy/courses");
    return res.data.courses || [];
  },

  async getCourseDetails(id: string): Promise<Course> {
    const res = await apiClient.get(`/api/v1/academy/courses/${id}`);
    return res.data.course;
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    const res = await apiClient.post("/api/v1/academy/courses", data);
    return res.data.course;
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const res = await apiClient.put(`/api/v1/academy/courses/${id}`, data);
    return res.data.course;
  },

  async deleteCourse(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/courses/${id}`);
  },

  // Modules
  async addModule(courseId: string, data: { title: string; description?: string; sortOrder?: number }): Promise<Module> {
    const res = await apiClient.post(`/api/v1/academy/courses/${courseId}/modules`, data);
    return res.data.module;
  },

  async updateModule(id: string, data: { title?: string; description?: string; sortOrder?: number }): Promise<Module> {
    const res = await apiClient.put(`/api/v1/academy/modules/${id}`, data);
    return res.data.module;
  },

  async deleteModule(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/modules/${id}`);
  },

  // Lessons
  async addLesson(moduleId: string, data: Partial<Lesson>): Promise<Lesson> {
    const res = await apiClient.post(`/api/v1/academy/modules/${moduleId}/lessons`, data);
    return res.data.lesson;
  },

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const res = await apiClient.put(`/api/v1/academy/lessons/${id}`, data);
    return res.data.lesson;
  },

  async deleteLesson(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/lessons/${id}`);
  },

  async saveLessonQuiz(lessonId: string, data: { title?: string; passScorePercent?: number; questions: Question[] }): Promise<Quiz> {
    const res = await apiClient.post(`/api/v1/academy/lessons/${lessonId}/quiz`, data);
    return res.data.quiz;
  },

  // Student Portal
  async getCatalog(params?: { customerId?: string; phone?: string; tags?: string }): Promise<Course[]> {
    const res = await apiClient.get("/api/v1/academy/catalog", { params });
    return res.data.courses || [];
  },

  async getMyCourses(): Promise<MyEnrollment[]> {
    const res = await apiClient.get("/api/v1/academy/my-courses");
    return res.data.enrollments || [];
  },

  async getCourseOutline(courseId: string, params?: { customerId?: string; phone?: string }): Promise<{
    course: Course;
    isEnrolled: boolean;
    enrollmentId: string | null;
    certificate: any;
    modules: Module[];
  }> {
    const res = await apiClient.get(`/api/v1/academy/courses/${courseId}/outline`, { params });
    return res.data;
  },

  async getLessonContent(lessonId: string, params?: { customerId?: string; phone?: string }): Promise<{
    lesson: Lesson;
    quiz: Quiz | null;
    progress: any;
    isEnrolled: boolean;
    enableWatermark?: boolean;
    studentInfo?: {
      name: string;
      phone: string;
      email: string;
      id: string;
    };
  }> {
    const res = await apiClient.get(`/api/v1/academy/lessons/${lessonId}/content`, { params });
    return res.data;
  },

  async enrollStudent(courseId: string, studentData: { studentName?: string; studentPhone?: string; studentEmail?: string }): Promise<any> {
    const res = await apiClient.post(`/api/v1/academy/courses/${courseId}/enroll`, studentData);
    return res.data.enrollment;
  },

  async completeLesson(lessonId: string, enrollmentId: string): Promise<any> {
    const res = await apiClient.post(`/api/v1/academy/lessons/${lessonId}/complete`, { enrollmentId });
    return res.data.progress;
  },

  async submitQuiz(lessonId: string, enrollmentId: string, answers: number[]): Promise<{
    passed: boolean;
    scorePercent: number;
    passScorePercent: number;
    correctCount: number;
    totalCount: number;
    feedback: Array<{ questionId: string; isCorrect: boolean; explanation?: string; correctIndex?: number }>;
    progress: any;
  }> {
    const res = await apiClient.post(`/api/v1/academy/lessons/${lessonId}/submit-quiz`, { enrollmentId, answers });
    return res.data;
  },

  async askCoach(lessonId: string, message: string): Promise<{ reply: string }> {
    const res = await apiClient.post(`/api/v1/academy/lessons/${lessonId}/coach-chat`, { message });
    return res.data;
  },

  // Analytics
  async getStudentsProgress(courseId: string): Promise<StudentProgressRow[]> {
    const res = await apiClient.get(`/api/v1/academy/courses/${courseId}/students`);
    return res.data.students || [];
  },
};
