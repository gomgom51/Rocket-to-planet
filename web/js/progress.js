// Progress kept on the device: stars, stamps (visits), photos, rocket style.
// Everything is wrapped in try/catch: the game works even without storage.

import { DESTINATIONS, DECORS, DEFAULT_STYLE } from './data.js';

const KEY = 'fusee-planetes-progress-v1';
const PHOTOS_KEY = 'fusee-planetes-photos-v1';
const OLD_VISITED_KEY = 'fusee-planetes-visited-v1';
const MAX_PHOTOS = 30;

function load() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
  if (!p) {
    p = { stars: 0, visits: {}, style: { ...DEFAULT_STYLE }, unlockSeen: false, decorsSeen: ['classic', 'none'] };
    // carry over the visits of the first version of the game
    try {
      const old = JSON.parse(localStorage.getItem(OLD_VISITED_KEY) || '[]');
      old.forEach((id) => { p.visits[id] = { count: 1, first: Date.now() }; });
    } catch (e) { /* ignore */ }
  }
  p.style = { ...DEFAULT_STYLE, ...(p.style || {}) };
  p.visits = p.visits || {};
  p.decorsSeen = p.decorsSeen || ['classic', 'none'];
  return p;
}

export const progress = load();

export function saveProgress() {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
}

// ---- stars ------------------------------------------------------------------
const starListeners = [];
export function onStars(fn) { starListeners.push(fn); }
export function addStars(n = 1) {
  progress.stars += n;
  saveProgress();
  starListeners.forEach((fn) => fn(progress.stars, n));
}

// Decorations unlocked by the stars but not announced yet.
export function newDecors() {
  return DECORS.filter((d) => d.stars <= progress.stars && !progress.decorsSeen.includes(d.id));
}
export function markDecorsSeen() {
  DECORS.forEach((d) => { if (d.stars <= progress.stars && !progress.decorsSeen.includes(d.id)) progress.decorsSeen.push(d.id); });
  saveProgress();
}

// ---- visits / stamps -------------------------------------------------------
export function recordVisit(id) {
  const v = progress.visits[id] || { count: 0, first: Date.now() };
  v.count += 1;
  v.last = Date.now();
  progress.visits[id] = v;
  saveProgress();
}
export const visitCount = (id) => (progress.visits[id] ? progress.visits[id].count : 0);
export const visitedBase = () => DESTINATIONS.filter((id) => visitCount(id) > 0).length;
export const bonusUnlocked = () => visitedBase() >= DESTINATIONS.length;

// ---- rocket style ----------------------------------------------------------
export const getStyle = () => progress.style;
export function setStyle(patch) {
  Object.assign(progress.style, patch);
  saveProgress();
}

// ---- photos ----------------------------------------------------------------
export function getPhotos() {
  try { return JSON.parse(localStorage.getItem(PHOTOS_KEY) || '[]'); } catch (e) { return []; }
}
export function addPhoto(body, data) {
  const photos = getPhotos();
  photos.push({ body, date: Date.now(), data });
  while (photos.length > MAX_PHOTOS) photos.shift();
  // if storage is full, drop the oldest photos until it fits
  for (let i = 0; i < 10; i++) {
    try {
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
      return true;
    } catch (e) {
      if (photos.length <= 1) return false;
      photos.shift();
    }
  }
  return false;
}
