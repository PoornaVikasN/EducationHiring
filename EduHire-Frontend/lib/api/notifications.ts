import { apiClient } from '../api-client';
import { NotificationKind } from '../shared/enums';

export interface Notification {
  _id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unread: number;
  };
}

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<NotificationsResponse>('/notifications', { params: { page, limit } }),

  markAllRead: () =>
    apiClient.post('/notifications/read-all'),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),
};
