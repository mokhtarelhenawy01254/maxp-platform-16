import api from "./api";
import type { NotificationSettings, NotificationType } from "../pages/tasks/types";

export const notificationSettingsService = {
  async getSettings(userId: string): Promise<NotificationSettings> {
    const response = await api.get<{ success: boolean; data: NotificationSettings }>(
      `notifications/settings/${userId}`
    );
    return response.data.data;
  },

  async updateSettings(userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await api.put<{ success: boolean; data: NotificationSettings }>(
      `notifications/settings/${userId}`,
      settings
    );
    return response.data.data;
  },

  async getTypes(): Promise<NotificationType[]> {
    const response = await api.get<{ success: boolean; data: NotificationType[] }>(
      "notifications/types"
    );
    return response.data.data;
  },
};