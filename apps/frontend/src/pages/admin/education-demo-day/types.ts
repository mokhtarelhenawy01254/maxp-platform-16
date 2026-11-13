export interface DemoDayEvent {
  id: string;
  companyId: string;
  title: string;
  description?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  locationType: "ONLINE" | "OFFLINE";
  meetingLink?: string | null;
  room?: string | null;
  capacity: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  createdAt?: string;
  subjectName?: string | null;
  teacherName?: string | null;
  totalAttendees?: number;
  attendedCount?: number;
  convertedCount?: number;
}

export interface DemoDayAttendee {
  id: string;
  companyId: string;
  demoDayId: string;
  customerId?: string | null;
  studentName: string;
  guardianName?: string | null;
  phone: string;
  phone2?: string | null;
  email?: string | null;
  age?: number | null;
  grade?: string | null;
  attendanceStatus: "REGISTERED" | "ATTENDED" | "ABSENT" | "CANCELLED";
  conversionStatus: "PENDING" | "CONVERTED" | "NOT_INTERESTED" | "FOLLOW_UP";
  convertedStudentId?: string | null;
  notes?: string | null;
  createdAt: string;
  leadStage?: string | null;
  leadPriority?: string | null;
}

export interface DemoDayStats {
  totalEvents: number;
  upcomingEvents: number;
  totalAttendees: number;
  attendedCount: number;
  convertedCount: number;
  conversionRate: number;
}
