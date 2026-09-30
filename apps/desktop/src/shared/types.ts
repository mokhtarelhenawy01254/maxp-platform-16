// Shared types for MaxP Desktop Monitor

export interface ActivityInterval {
  intervalStart: string; // ISO timestamp
  intervalEnd: string;
  mouseEvents: number;
  keyboardEvents: number;
  activeSeconds: number;
  activityScore: number; // 0-100
  status: 'active' | 'idle' | 'away';
  isSynthetic?: boolean;
  isMeeting?: boolean;
}

export interface AppUsageRecord {
  appName: string;
  windowTitle: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  category?: string;
}

export interface WebUsageRecord {
  url: string;
  domain: string;
  pageTitle: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  category?: string;
}

export interface DeviceInfo {
  deviceName: string;
  osVersion: string;
  appVersion: string;
  isPaused?: boolean;
  breakReason?: string | null;
}

export interface DailySummary {
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  firstActivityTime: string | null;
  lastActivityTime: string | null;
  totalClockSeconds: number;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  totalProductiveSeconds: number;
  totalUnproductiveSeconds: number;
  productivityScore: number;
  lateStartSeconds: number;
  avgActivityScore: number;
}

export interface TrackerState {
  isTracking: boolean;
  isPaused: boolean;
  currentApp: string | null;
  currentUrl: string | null;
  activityScore: number;
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionStartedAt: string | null;
  shiftEnded?: boolean;
  shiftEndedAt?: string | null;
  deviceType?: 'OFFICE' | 'PERSONAL';
  isOvertime?: boolean;
  activeOvertimeSession?: {
    id: string;
    startedAt: string;
    reason: string;
    taskSummary?: string | null;
  } | null;
  lastHandoverNotes?: string | null;
}


/**
 * Personal preferences the employee controls locally.
 * Every value here MUST be wired to real behavior in the main process.
 */
export interface PersonalPrefs {
  autoLaunchEnabled: boolean;   // default: true — wired to app.setLoginItemSettings
  soundAlerts: boolean;         // default: true — wired to Notification.silent
  idleReminder: boolean;        // default: true — wired to extended-idle reminder notification
}

export interface SyncBatch {
  activities: ActivityInterval[];
  apps: AppUsageRecord[];
  websites: WebUsageRecord[];
  timestamp: string;
}

export type AppCategory = 'productive' | 'neutral' | 'unproductive' | 'unrated';

export interface CategoryRule {
  name: string;        // app name or domain
  type: 'app' | 'website';
  category: AppCategory;
}

// IPC channel names
export const IPC_CHANNELS = {
  // Main -> Renderer
  TRACKER_STATE_UPDATE: 'tracker:state-update',
  NOTIFICATION: 'notification',
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMPLETED: 'task:completed',

  // Renderer -> Main
  GET_TRACKER_STATE: 'tracker:get-state',
  TOGGLE_TRACKING: 'tracker:toggle',
  PAUSE_TRACKING: 'tracker:pause',
  RESUME_TRACKING: 'tracker:resume',
  GET_DAILY_SUMMARY: 'tracker:daily-summary',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_AUTH_STATE: 'auth:get-state',
  CREATE_TASK: 'task:create',
  GET_TASKS: 'task:get-list',
} as const;
