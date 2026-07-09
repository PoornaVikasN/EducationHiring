import axios from 'axios';
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

// Mirrors eduhire-backend/src/modules/uploads/dto/presign.dto.ts.
// BE is source of truth — if you change those, mirror here so the user gets a
// fast client-side rejection instead of a 400 round-trip.
const MIME_ALLOWLIST: Record<UploadKind, readonly string[]> = {
  [UploadKind.RESUME]:         ['application/pdf'],
  [UploadKind.LOGO]:           ['image/jpeg', 'image/png', 'image/webp'],
  [UploadKind.CERTIFICATE]:    ['application/pdf', 'image/jpeg', 'image/png'],
  [UploadKind.DOCUMENT]:       ['application/pdf', 'image/jpeg', 'image/png'],
  [UploadKind.SCHOOL_PHOTO]: ['image/jpeg', 'image/png', 'image/webp'],
  [UploadKind.INTRO_VIDEO]:    ['video/mp4', 'video/quicktime'],
};

const SIZE_LIMITS_BYTES: Record<UploadKind, number> = {
  [UploadKind.RESUME]:         5 * 1024 * 1024,
  [UploadKind.LOGO]:           2 * 1024 * 1024,
  [UploadKind.CERTIFICATE]:    5 * 1024 * 1024,
  [UploadKind.DOCUMENT]:       5 * 1024 * 1024,
  [UploadKind.SCHOOL_PHOTO]: 5 * 1024 * 1024,
  [UploadKind.INTRO_VIDEO]:    10 * 1024 * 1024,
};

const KIND_DISPLAY: Record<UploadKind, string> = {
  [UploadKind.RESUME]:         'Resume',
  [UploadKind.LOGO]:           'Logo',
  [UploadKind.CERTIFICATE]:    'Certificate',
  [UploadKind.DOCUMENT]:       'Document',
  [UploadKind.SCHOOL_PHOTO]: 'School photo',
  [UploadKind.INTRO_VIDEO]:    'Intro video',
};

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function describeAllowed(kind: UploadKind): string {
  const allowed = MIME_ALLOWLIST[kind]
    .map((m) => m.split('/')[1].toUpperCase().replace('JPEG', 'JPG'))
    .join(' / ');
  const mb = SIZE_LIMITS_BYTES[kind] / 1024 / 1024;
  return `${allowed} under ${mb} MB`;
}

export async function uploadFile(
  kind: UploadKind,
  file: File,
): Promise<string> {
  console.log(`[upload] presign request kind=${kind} contentType=${file.type} size=${file.size}`);

  // Client-side guards: catch obviously-invalid files BEFORE the network roundtrip.
  // The BE re-validates identically — this is purely a UX speedup + clearer message.
  if (!MIME_ALLOWLIST[kind].includes(file.type)) {
    const display = KIND_DISPLAY[kind];
    throw new Error(`${display} must be ${describeAllowed(kind)} (got ${file.type || 'unknown type'}).`);
  }
  if (file.size > SIZE_LIMITS_BYTES[kind]) {
    const display = KIND_DISPLAY[kind];
    throw new Error(`${display} must be ${describeAllowed(kind)} (got ${formatMb(file.size)} MB).`);
  }

  let presignData: PresignResponse;
  try {
    const { data } = await uploadsApi.presign(kind, file.type, file.size);
    presignData = data;
    console.log(`[upload] presign ok key=${data.key} publicUrl=${data.publicUrl}`);
  } catch (err) {
    console.error('[upload] presign failed', err);
    // Re-throw with the BE's user-friendly message when present (e.g. "File too large…").
    if (axios.isAxiosError(err)) {
      const beMsg = err.response?.data?.message;
      if (typeof beMsg === 'string' && beMsg) throw new Error(beMsg);
    }
    throw err;
  }

  console.log(`[upload] S3 PUT start key=${presignData.key}`);
  const res = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!res.ok) {
    console.error(`[upload] S3 PUT failed status=${res.status} statusText=${res.statusText} key=${presignData.key}`);
    throw new Error(`Upload to storage failed (${res.status}). Please try again.`);
  }

  console.log(`[upload] done publicUrl=${presignData.publicUrl} status=${res.status}`);
  return presignData.publicUrl;
}
