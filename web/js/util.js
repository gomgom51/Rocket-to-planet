// Small helpers: time scale (for testing), waits, tweens, easing.

const params = new URLSearchParams(location.search);
// ?speed=4 makes every animation 4x faster (used for automated tests).
export const timeScale = Math.max(1, parseFloat(params.get('speed') || '1') || 1);
export const debug = params.has('debug');

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInQuad = (t) => t * t;

// ---- cancellable game flow -------------------------------------------------
// Every round gets a token; going back to the menu cancels it. Any await in
// the game flow goes through `guard`, which throws if the round is cancelled.
export class Cancelled extends Error {}
let flowId = 0;
export function newFlow() { flowId++; tweens.length = 0; return flowId; }
export function cancelFlow() { flowId++; tweens.length = 0; }
export function guard(id) { if (id !== flowId) throw new Cancelled(); }

// ---- tweens driven by the render loop --------------------------------------
const tweens = [];
export function tween(seconds, onUpdate, ease = (t) => t) {
  return new Promise((resolve) => {
    tweens.push({ t: 0, d: Math.max(0.001, seconds), onUpdate, ease, resolve });
  });
}
export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (!tw) continue;
    tw.t = Math.min(tw.d, tw.t + dt);
    const k = tw.t / tw.d;
    tw.onUpdate(tw.ease(k), k);
    if (tw.t >= tw.d) {
      tweens.splice(tweens.indexOf(tw), 1);
      tw.resolve();
    }
  }
}
export function wait(seconds) {
  return tween(seconds, () => {});
}
