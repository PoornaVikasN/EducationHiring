import { apiClient } from '../api-client';
import type { Dispute, DisputeKind } from './admin';

export const disputesApi = {
  create: (data: { kind: DisputeKind; subject: string; description: string; referenceId?: string }) =>
    apiClient.post<Dispute>('/disputes', data),

  listMine: () =>
    apiClient.get<Dispute[]>('/disputes/mine'),
};
