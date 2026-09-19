/** Shared timing for visit/stay copy so each line holds, then yields. */

export const BEAT_HEAD = 0.05;
export const BEAT_TAIL = 0.08;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function beatSegment(n: number) {
  return (1 - BEAT_HEAD - BEAT_TAIL) / n;
}

/** Local 0–1 progress of beat `i` (may be <0 or >1). */
export function beatUnit(p: number, i: number, n: number) {
  const seg = beatSegment(n);
  return (p - (BEAT_HEAD + i * seg)) / seg;
}

/**
 * 1 while this line should stay on screen. Neighbours overlap a little
 * so a handoff never blanks the copy.
 */
export function beatHold(u: number) {
  const enterFrom = -0.08;
  const enterUntil = 0.14;
  const exitFrom = 0.86;
  const exitUntil = 1.08;
  if (u <= enterFrom || u >= exitUntil) return 0;
  if (u < enterUntil) return smoothstep((u - enterFrom) / (enterUntil - enterFrom));
  if (u > exitFrom) return 1 - smoothstep((u - exitFrom) / (exitUntil - exitFrom));
  return 1;
}
