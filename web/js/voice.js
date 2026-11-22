// Text-to-speech in French.
// In the Android app, the native TextToSpeech engine is used through the
// `AndroidBridge` JavaScript interface (WebView has no speechSynthesis).
// In a desktop/mobile browser, the Web Speech API is used instead.

import { settings } from './settings.js';
import { timeScale } from './util.js';

const bridge = window.AndroidBridge;
const pending = new Map();
let counter = 0;
let frVoice = null;

window.__speechDone = (id) => {
  const done = pending.get(String(id));
  if (done) { pending.delete(String(id)); done(); }
};

function pickBrowserVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  const fr = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
  return fr.find((v) => /fr[-_]FR/i.test(v.lang) && v.localService) || fr.find((v) => /fr[-_]FR/i.test(v.lang)) || fr[0] || null;
}
if ('speechSynthesis' in window) {
  frVoice = pickBrowserVoice();
  speechSynthesis.onvoiceschanged = () => { frVoice = pickBrowserVoice(); };
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
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => { if (!finished) { finished = true; pending.delete(id); resolve(); } };
    pending.set(id, finish);
    // Safety net in case the engine never calls back.
    setTimeout(finish, fallbackMs * 2.2 + 1500);
    try {
      if (bridge) {
        bridge.speak(text, id);
      } else if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        if (frVoice) u.voice = frVoice;
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
