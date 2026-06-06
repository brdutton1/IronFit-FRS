import * as tus from 'tus-js-client';
import { supabase } from './client';

export const REFERENCE_BUCKET = 'reference-videos';
export const THUMBNAIL_BUCKET = 'reference-thumbnails';

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB (spec)
export const MAX_VIDEO_SECONDS = 60; // spec

/**
 * Resumable upload of a reference video to the private bucket via Supabase's
 * tus endpoint. Survives a dropped connection — tus resumes from the last
 * acked chunk. Returns the storage object path on success.
 */
export async function uploadReferenceVideo(
  trainerId: string,
  movementId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video is ${(file.size / 1e6).toFixed(0)}MB; limit is 100MB.`);
  }
  const objectName = `${trainerId}/${movementId}/${Date.now()}-${sanitize(file.name)}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const projectUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${projectUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 4000, 8000, 16000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: REFERENCE_BUCKET,
        objectName,
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // 6MB — required by Supabase tus
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
      onSuccess: () => resolve(),
    });
    // Resume an interrupted upload if a matching one is found.
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });

  return objectName;
}

/** Signed URL for private playback of a reference video. */
export async function signedReferenceUrl(path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REFERENCE_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Upload a thumbnail (PNG/JPEG blob) to the thumbnails bucket. */
export async function uploadThumbnail(path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedThumbnailUrl(path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Grab the first frame of a video File and return a JPEG blob for use as a
 * library thumbnail. Browser-only.
 */
export function generateThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(0.1, video.duration || 0.1);
    });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          blob ? resolve(blob) : reject(new Error('Thumbnail encode failed'));
        },
        'image/jpeg',
        0.8,
      );
    });
    video.addEventListener('error', () => reject(new Error('Could not read video for thumbnail')));
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
