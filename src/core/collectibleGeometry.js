import { PHYS } from './constants.js';

/** Centro usado na coleta, independente da interpolação visual. */
export function collectibleBody(s) {
  const d = PHYS.GRAB_TO_BODY * 0.55;
  return s.mode === 'vine' && s.vine
    ? { x: s.x + Math.sin(s.vine.theta) * d, y: s.y + Math.cos(s.vine.theta) * d }
    : { x: s.x, y: s.y + d };
}

export function segmentPointDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

export function canCollect(prev, body, item) {
  return Math.abs(item.x - body.x) <= 300 && segmentPointDistance(prev, body, item) <= PHYS.PICKUP_RADIUS;
}
