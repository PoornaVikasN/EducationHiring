import { apiClient } from '../api-client';
import { UploadKind } from '../shared/enums';

export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export const uploadsApi = {
  presign: (kind: UploadKind, contentType: string, size: number) =>
    apiClient.post<PresignResponse>('/uploads/presign', { kind, contentType, size }),
};

export async function uploadFile(
  kind: UploadKind,
  file: File,
): Promise<string> {
  const { data } = await uploadsApi.presign(kind, file.type, file.size);
  await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return data.publicUrl;
}
