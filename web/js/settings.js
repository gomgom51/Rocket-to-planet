// Parent settings, saved on the device (localStorage, always wrapped in try/catch).

const KEY = 'fusee-planetes-settings-v1';
const VISITED_KEY = 'fusee-planetes-visited-v1';

const DEFAULTS = {
  name: '',          // child's first name, used in congratulations
  voice: true,       // read every sentence aloud
  sound: true,       // sound effects
  music: true,       // background music
  volume: 0.6,       // master volume (kept moderate: hyperacusis is common)
  countdown: 10,     // 5 or 10
  stops: 'random',   // number of wrong planets before the right one: 'random' | 0 | 1 | 2 | 3
  hint: false,       // show the picture of the destination in the question box
  lang: 'auto',      // 'auto' (follows the phone) | 'fr' | 'en'
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* storage unavailable */ }
  return { ...DEFAULTS };
}

export const settings = load();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}

export function getVisited() {
  try { return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]')); } catch (e) { return new Set(); }
}

export function addVisited(id) {
  const v = getVisited();
  v.add(id);
  try { localStorage.setItem(VISITED_KEY, JSON.stringify([...v])); } catch (e) { /* ignore */ }
}
