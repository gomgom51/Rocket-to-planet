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

// Best voice for the language: the exact variant first (fr-FR, or the phone's
// English such as en-GB), installed on the device if possible.
function pickBrowserVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  const same = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(LANG));
  const exact = new RegExp('^' + locale().replace('-', '[-_]') + '$', 'i');
  return same.find((v) => exact.test(v.lang) && v.localService) || same.find((v) => exact.test(v.lang))
    || same.find((v) => v.localService) || same[0] || null;
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
