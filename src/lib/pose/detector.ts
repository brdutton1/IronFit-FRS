/**
 * MediaPipe Pose Landmarker wrapper. VIDEO mode, full model variant, GPU
 * delegate. Used by both reference extraction (trainer) and live comparison
 * (client) so the geometry is identical on both sides.
 *
 * This module touches the browser/GPU and is not unit-tested; the math it
 * feeds (angles.ts, confidence.ts) is.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { Landmark, PoseFrame } from './landmarks';

// Pinned to the installed @mediapipe/tasks-vision version (see package.json).
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_FULL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

export interface DetectorOptions {
  /** Override the model asset (e.g. self-hosted for offline). */
  modelAssetPath?: string;
  /** 'GPU' (default) or 'CPU' fallback. */
  delegate?: 'GPU' | 'CPU';
  /** Minimum detection confidence; below this no pose is returned. */
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private lastTimestamp = -1;

  constructor(private readonly opts: DetectorOptions = {}) {}

  /** Lazily create the underlying PoseLandmarker. Idempotent. */
  async init(): Promise<void> {
    if (this.landmarker) return;
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.opts.modelAssetPath ?? MODEL_FULL,
        delegate: this.opts.delegate ?? 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: this.opts.minPoseDetectionConfidence ?? 0.5,
      minPosePresenceConfidence: this.opts.minPosePresenceConfidence ?? 0.5,
      minTrackingConfidence: this.opts.minTrackingConfidence ?? 0.5,
      outputSegmentationMasks: false,
    });
  }

  /**
   * Detect a single pose for a video frame at `timestampMs`. Returns the 33
   * landmarks, or null when no person is found. Timestamps must be monotonic in
   * VIDEO mode; we nudge forward if a duplicate is passed.
   */
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null {
    if (!this.landmarker) {
      throw new Error('PoseDetector.detect called before init()');
    }
    let ts = Math.round(timestampMs);
    if (ts <= this.lastTimestamp) ts = this.lastTimestamp + 1;
    this.lastTimestamp = ts;

    const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, ts);
    return extractFrame(result);
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.lastTimestamp = -1;
  }
}

/** Pull the first pose out of a result into our PoseFrame shape. */
export function extractFrame(result: PoseLandmarkerResult): PoseFrame | null {
  const poses = result.landmarks;
  if (!poses || poses.length === 0) return null;
  const lm = poses[0];
  return lm.map(
    (p): Landmark => ({
      x: p.x,
      y: p.y,
      z: p.z ?? 0,
      visibility: p.visibility ?? 0,
    }),
  );
}
