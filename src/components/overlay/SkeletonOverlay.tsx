/**
 * Canvas drawing for the live skeleton overlay. Pure drawing helpers (no React
 * state) so PerformanceScreen can call them inside its rAF loop.
 */

import { LM, type AngleKey, type PoseFrame } from '@/lib/pose/landmarks';
import type { JointColor } from '@/lib/compare/liveCompare';
import { JOINT_COLOR_HEX } from './colors';

/** Bone connections we render (mirrored, hands/feet simplified). */
const CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX],
];

/** The landmark we paint to represent each angle's joint (null = torso proxy). */
export function landmarkForAngle(key: AngleKey): number | null {
  if (key.startsWith('shoulder_')) return key.endsWith('left') ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  if (key.startsWith('elbow_')) return key.endsWith('left') ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
  if (key.startsWith('hip_')) return key.endsWith('left') ? LM.LEFT_HIP : LM.RIGHT_HIP;
  if (key.startsWith('knee_')) return key.endsWith('left') ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  if (key.startsWith('ankle_')) return key.endsWith('left') ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;
  if (key.startsWith('cervical_')) return LM.NOSE;
  return null; // spinal_* → drawn as a torso-centre marker
}

export interface JointPaint {
  key: AngleKey;
  color: JointColor;
  /** reduced confidence → paler render. */
  reduced: boolean;
}

export interface DrawOptions {
  width: number;
  height: number;
  /** Mirror horizontally (selfie view). */
  mirror?: boolean;
  joints: JointPaint[];
}

function px(frame: PoseFrame, idx: number, w: number, h: number, mirror: boolean) {
  const p = frame[idx];
  const x = mirror ? (1 - p.x) * w : p.x * w;
  return { x, y: p.y * h, visible: p.visibility >= 0.5 };
}

/** Clear and draw the skeleton with colored joints onto a 2D context. */
export function drawSkeleton(ctx: CanvasRenderingContext2D, frame: PoseFrame | null, opts: DrawOptions): void {
  const { width, height, mirror = true } = opts;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;

  // Bones.
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(226,232,240,0.65)';
  for (const [a, b] of CONNECTIONS) {
    const pa = px(frame, a, width, height, mirror);
    const pb = px(frame, b, width, height, mirror);
    if (!pa.visible || !pb.visible) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  // Highlighted joints.
  for (const jp of opts.joints) {
    const idx = landmarkForAngle(jp.key);
    let x: number;
    let y: number;
    if (idx === null) {
      const sMid = midPx(frame, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, width, height, mirror);
      const hMid = midPx(frame, LM.LEFT_HIP, LM.RIGHT_HIP, width, height, mirror);
      x = (sMid.x + hMid.x) / 2;
      y = (sMid.y + hMid.y) / 2;
    } else {
      const p = px(frame, idx, width, height, mirror);
      x = p.x;
      y = p.y;
    }
    ctx.beginPath();
    ctx.arc(x, y, jp.color === 'gray' ? 7 : 10, 0, Math.PI * 2);
    ctx.globalAlpha = jp.reduced ? 0.5 : 1;
    ctx.fillStyle = JOINT_COLOR_HEX[jp.color];
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#020617';
    ctx.stroke();
  }
}

function midPx(frame: PoseFrame, a: number, b: number, w: number, h: number, mirror: boolean) {
  const pa = px(frame, a, w, h, mirror);
  const pb = px(frame, b, w, h, mirror);
  return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
}
