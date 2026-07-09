import { apiClient } from '../api-client';

export interface ChatMessage {
  _id: string;
  applicationId: string;
  senderId: string;
  senderRole: string; // TEACHER | RECRUITER
  text: string;
  read: boolean;
  createdAt: string;
}

export const chatApi = {
  getHistory: (applicationId: string) =>
    apiClient.get<ChatMessage[]>(`/chat/${applicationId}`),

  sendMessage: (applicationId: string, text: string) =>
    apiClient.post<ChatMessage>(`/chat/${applicationId}`, { text }),
};
