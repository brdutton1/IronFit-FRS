/**
 * Every numeric threshold the comparison engine uses, in one place, with the
 * reasoning behind each. These are DEFAULTS for Lee to review and adjust — see
 * README "Thresholds I'm least confident in". Do not scatter magic numbers; add
 * them here.
 */

// ── Target joints: how close to the reference end-range counts as correct ──
// We compare the client's running peak ROM to the reference ROM (v1 does NOT
// phase-match tempo; see README). "Shortfall" = fraction of reference ROM still
// unreached.
//   shortfall ≤ 0.15            → GREEN  (within 15% of reference range)
//   0.15 < shortfall ≤ 0.30     → YELLOW (15–30% short)
//   shortfall > 0.30            → RED    (>30% short, or wrong direction)
// Rationale: 15% is roughly the day-to-day ROM variation an able mover shows on
// a CAR; beyond 30% short is a meaningful miss worth flagging. No FRS published
// numeric tolerance exists, so these are defensible defaults, not standards.
export const TARGET_GREEN_SHORTFALL = 0.15;
export const TARGET_YELLOW_SHORTFALL = 0.3;

// A target joint moving opposite to the reference direction by more than this
// (degrees, from the client's own start) is flagged wrong-direction → RED.
export const WRONG_DIRECTION_DEG = 8;

// ── Stillness joints: how much drift counts as compensation ──
//   deviation < 5°              → BLUE  (held still)
//   5° ≤ deviation ≤ 15°        → YELLOW (drifting)
//   deviation > 15°             → RED   (compensating; fire the pattern alert)
// Rationale: ~5° is within 2D pose jitter on a well-seen joint, so below it we
// can't honestly call drift. >15° is a visible, intentional-looking shift.
export const STILLNESS_STILL_DEG = 5;
export const STILLNESS_DRIFT_DEG = 15;

// ── ROM meter display ──
// Cap displayed ROM% so a client who exceeds the reference doesn't see a wild
// number; we still record the true value.
export const ROM_PCT_DISPLAY_CAP = 150;

// ── Frame rate ──
// Target performance; warn below the floor (spec: 24fps min, warn under 15).
export const TARGET_FPS = 24;
export const MIN_ACCEPTABLE_FPS = 15;

// ── Camera angle validation ──
// We estimate angle from the shoulder-width : torso-height ratio. If the live
// estimate differs from the recommended angle by more than this, we prompt a
// reposition (override allowed, session flagged reduced confidence).
export const CAMERA_ANGLE_TOLERANCE_DEG = 30;

// ── Compensation alert debounce ──
// A stillness joint must stay over threshold for this many consecutive frames
// before the banner fires, so a single jittery frame doesn't trigger an alert.
export const COMPENSATION_DEBOUNCE_FRAMES = 3;
