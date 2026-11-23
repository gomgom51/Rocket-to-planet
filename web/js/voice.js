// Text-to-speech in the game language (French or English).
// In the Android app, the native TextToSpeech engine is used through the
// `AndroidBridge` JavaScript interface (WebView has no speechSynthesis).
// In a desktop/mobile browser, the Web Speech API is used instead.

import { settings } from './settings.js';
import { timeScale } from './util.js';
import { setDuck } from './audio.js';
import { LANG, locale, onLanguageChange } from './i18n.js';

const bridge = window.AndroidBridge;
const pending = new Map();
let counter = 0;
let browserVoice = null;

window.__speechDone = (id) => {
  const done = pending.get(String(id));
  if (done) { pending.delete(String(id)); done(); }
};

// Best browser voice for the language. Natural/online voices (Edge, Chrome,
// Safari "enhanced") sound much better than the old robotic ones, the exact
// variant is preferred (fr-FR, or the phone's English such as en-GB), and
// Apple's joke voices (Albert, Bubbles, Zarvox…) are never used: without a
// good voice, the browser's default voice for the language is used.
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|princess|bruce|agnes|vicki|eddy|flo|grandma|grandpa|grand-m[eè]re|grand-p[eè]re|reed|rocko|sandy|shelley)\b/i;
const NICE = /natural|neural|online|enhanced|premium|siri/i;
const KNOWN = {
  fr: /google|denise|vivienne|eloise|henri|audrey|aur[eé]lie|marie|thomas|am[eé]lie/i,
  en: /google|aria|jenny|ava|samantha|karen|serena|kate|moira|tessa|daniel|libby|sonia/i,
};
export function pickVoice(voices, lang, loc) {
  const exact = new RegExp('^' + loc.replace('-', '[-_]') + '$', 'i');
  let best = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    if (!v.lang || !v.lang.toLowerCase().replace('_', '-').startsWith(lang) || NOVELTY.test(v.name || '')) continue;
    const score = (exact.test(v.lang) ? 8 : 0) + (NICE.test(v.name) ? 4 : 0)
      + (KNOWN[lang] && KNOWN[lang].test(v.name) ? 3 : 0) + (v.localService ? 1 : 0);
    if (score > bestScore) { best = v; bestScore = score; }
  }
  return best;
}
function pickBrowserVoice() {
  if (!('speechSynthesis' in window)) return null;
  return pickVoice(speechSynthesis.getVoices(), LANG, locale());
}

// Tell the voice which language to use (the Android app picks its own voice).
function updateLanguage() {
  if ('speechSynthesis' in window) browserVoice = pickBrowserVoice();
  try {
    if (bridge && typeof bridge.setLanguage === 'function') bridge.setLanguage(LANG);
  } catch (e) { /* older app: French only */ }
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { browserVoice = pickBrowserVoice(); };
}
updateLanguage();
onLanguageChange(updateLanguage);

// Browsers only let a page talk after a touch (iPhone, Chrome): say an empty
// sentence on the first touch, so that later sentences are allowed too.
if (!bridge && 'speechSynthesis' in window) {
  const prime = () => {
    document.removeEventListener('click', prime, true);
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };
  document.addEventListener('click', prime, true);
}

// Rough duration of a sentence, used as a safety net and when the voice is off.
function estimate(text) {
  return 700 + text.length * 62;
}

export function stopSpeaking() {
  try {
    if (bridge) bridge.stop();
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch (e) { /* ignore */ }
  for (const done of pending.values()) done();
  pending.clear();
}

/**
 * Speak `text`. Resolves when the sentence has been said (or after an
 * estimated reading time if the voice is disabled/unavailable).
 */
export function speak(text, { silentWait = true } = {}) {
  const fallbackMs = estimate(text) / timeScale;
  if (!settings.voice || timeScale > 1) {
    return new Promise((r) => setTimeout(r, silentWait ? fallbackMs : 0));
  }
  stopSpeaking();
  const id = String(++counter);
  setDuck(true);
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      pending.delete(id);
      if (pending.size === 0) setDuck(false);
      resolve();
    };
    pending.set(id, finish);
    // Safety net in case the engine never calls back.
    setTimeout(finish, fallbackMs * 2.2 + 1500);
    try {
      if (bridge) {
        bridge.speak(text, id);
      } else if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = locale();
        if (!browserVoice) browserVoice = pickBrowserVoice();
        if (browserVoice) u.voice = browserVoice;
        u.rate = 0.92;
        u.pitch = 1.08;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
      } else {
        setTimeout(finish, fallbackMs);
      }
    } catch (e) {
      setTimeout(finish, fallbackMs);
    }
  });
}
