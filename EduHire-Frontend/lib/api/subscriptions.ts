import { apiClient } from '../api-client';
import { SubscriptionStatus } from '../shared/enums';

export interface Subscription {
  _id: string;
  schoolId: string;
  status: SubscriptionStatus;
  expiresAt: string;
  createdAt: string;
}

export const subscriptionsApi = {
  getMine: () =>
    apiClient.get<Subscription | null>('/subscriptions/me'),
};
