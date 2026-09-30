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
  isGlobal?: boolean;
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
  expiresAt?: string | null;
  subscriptionDays?: number | null;
  isExpired?: boolean;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  hasCertificate: boolean;
  certificateNumber?: string | null;
}

export interface ExerciseSubmission {
  id: string;
  lessonId: string;
  lessonTitle?: string;
  lessonSortOrder?: number;
  enrollmentId?: string | null;
  studentUserId?: string | null;
  customerId?: string | null;
  studentName?: string;
  studentPhone?: string | null;
  studentEmail?: string | null;
  submissionText?: string | null;
  submissionUrl?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "NEEDS_MORE";
  aiVerdictJson?: {
    verdict: string;
    missing?: string[];
    coachLine?: string;
    nextStep?: string;
  } | null;
  aiFeedback?: string | null;
  instructorNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// API Calls
// -------------------------------------------------------------

export const academyApi = {
  // Courses
  async getCourses(): Promise<Course[]> {
    const res = await apiClient.get<any>("/api/v1/academy/courses");
    return (res.data as any)?.courses || [];
  },

  async getCourseDetails(id: string): Promise<Course> {
    const res = await apiClient.get<any>(`/api/v1/academy/courses/${id}`);
    return (res.data as any)?.course;
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    const res = await apiClient.post<any>("/api/v1/academy/courses", data);
    return (res.data as any)?.course;
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const res = await apiClient.put<any>(`/api/v1/academy/courses/${id}`, data);
    return (res.data as any)?.course;
  },

  async deleteCourse(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/courses/${id}`);
  },

  // Modules
  async addModule(courseId: string, data: { title: string; description?: string; sortOrder?: number }): Promise<Module> {
    const res = await apiClient.post<any>(`/api/v1/academy/courses/${courseId}/modules`, data);
    return (res.data as any)?.module;
  },

  async updateModule(id: string, data: { title?: string; description?: string; sortOrder?: number }): Promise<Module> {
    const res = await apiClient.put<any>(`/api/v1/academy/modules/${id}`, data);
    return (res.data as any)?.module;
  },

  async deleteModule(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/modules/${id}`);
  },

  // Lessons
  async addLesson(moduleId: string, data: Partial<Lesson>): Promise<Lesson> {
    const res = await apiClient.post<any>(`/api/v1/academy/modules/${moduleId}/lessons`, data);
    return (res.data as any)?.lesson;
  },

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const res = await apiClient.put<any>(`/api/v1/academy/lessons/${id}`, data);
    return (res.data as any)?.lesson;
  },

  async deleteLesson(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/academy/lessons/${id}`);
  },

  async saveLessonQuiz(lessonId: string, data: { title?: string; passScorePercent?: number; questions: Question[] }): Promise<Quiz> {
    const res = await apiClient.post<any>(`/api/v1/academy/lessons/${lessonId}/quiz`, data);
    return (res.data as any)?.quiz;
  },

  // Student Portal
  async getCatalog(params?: { customerId?: string; phone?: string; tags?: string }): Promise<Course[]> {
    const res = await apiClient.get<any>("/api/v1/academy/catalog", { params });
    return (res.data as any)?.courses || [];
  },

  async getMyCourses(): Promise<MyEnrollment[]> {
    const res = await apiClient.get<any>("/api/v1/academy/my-courses");
    return (res.data as any)?.enrollments || [];
  },

  async getCourseOutline(courseId: string, params?: { customerId?: string; phone?: string }): Promise<{
    course: Course;
    isEnrolled: boolean;
    enrollmentId: string | null;
    certificate: any;
    modules: Module[];
  }> {
    const res = await apiClient.get<any>(`/api/v1/academy/courses/${courseId}/outline`, { params });
    return res.data as any;
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
    const res = await apiClient.get<any>(`/api/v1/academy/lessons/${lessonId}/content`, { params });
    return res.data as any;
  },

  async enrollStudent(
    courseId: string,
    studentData: {
      studentName?: string;
      studentPhone?: string;
      studentEmail?: string;
      subscriptionDays?: number;
    }
  ): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/academy/courses/${courseId}/enroll`, studentData);
    return (res.data as any)?.enrollment;
  },

  async completeLesson(lessonId: string, enrollmentId: string): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/academy/lessons/${lessonId}/complete`, { enrollmentId });
    return (res.data as any)?.progress;
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
    const res = await apiClient.post<any>(`/api/v1/academy/lessons/${lessonId}/submit-quiz`, { enrollmentId, answers });
    return res.data as any;
  },

  async askCoach(lessonId: string, message: string): Promise<{ reply: string }> {
    const res = await apiClient.post<any>(`/api/v1/academy/lessons/${lessonId}/coach-chat`, { message });
    return res.data as any;
  },

  // Exercise Submissions & AI Grader
  async submitExercise(
    lessonId: string,
    data: { enrollmentId?: string | null; submissionText?: string; submissionUrl?: string }
  ): Promise<{
    submission: ExerciseSubmission;
    gradeResult: {
      verdict: "ACCEPTED" | "REJECTED" | "NEEDS_MORE" | "PENDING";
      missing?: string[];
      coachLine?: string;
      nextStep?: string;
    };
    progress?: any;
  }> {
    const res = await apiClient.post<any>(`/api/v1/academy/lessons/${lessonId}/submit-exercise`, data);
    return res.data as any;
  },

  async getLessonSubmissions(lessonId: string, status?: string): Promise<ExerciseSubmission[]> {
    const res = await apiClient.get<any>(`/api/v1/academy/lessons/${lessonId}/submissions`, {
      params: status ? { status } : undefined,
    });
    return (res.data as any)?.submissions || [];
  },

  async getCourseSubmissions(courseId: string, status?: string): Promise<ExerciseSubmission[]> {
    const res = await apiClient.get<any>(`/api/v1/academy/courses/${courseId}/submissions`, {
      params: status ? { status } : undefined,
    });
    return (res.data as any)?.submissions || [];
  },

  async reviewSubmission(
    submissionId: string,
    data: { status: "ACCEPTED" | "REJECTED" | "NEEDS_MORE" | "PENDING"; instructorNote?: string }
  ): Promise<ExerciseSubmission> {
    const res = await apiClient.post<any>(`/api/v1/academy/submissions/${submissionId}/review`, data);
    return (res.data as any)?.submission;
  },

  // Analytics
  async getStudentsProgress(courseId: string): Promise<StudentProgressRow[]> {
    const res = await apiClient.get<any>(`/api/v1/academy/courses/${courseId}/students`);
    return (res.data as any)?.students || [];
  },

  // Admin: Enrollment management
  async suspendEnrollment(enrollmentId: string): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/academy/enrollments/${enrollmentId}/suspend`);
    return (res.data as any)?.enrollment;
  },

  async reactivateEnrollment(enrollmentId: string): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/academy/enrollments/${enrollmentId}/reactivate`);
    return (res.data as any)?.enrollment;
  },
};
