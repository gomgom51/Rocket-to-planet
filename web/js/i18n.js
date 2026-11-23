// Game language: French (sentences in data.js) or English (lang/en.js).
// "auto" follows the phone's language: French if it is set to French,
// English otherwise. Parents can force it in the settings.
//
// The texts are swapped in place in the objects exported by data.js
// (PLANETS, TEXT…), so the rest of the game simply reads them as before.

import { PLANETS, NUMBERS, FEATURES, QUIZZES, COLORS, DECORS, TEXT } from './data.js';
import EN from './lang/en.js';
import { settings } from './settings.js';

// French texts, copied once from data.js so that we can switch back.
const FR = {
  planets: Object.fromEntries(Object.entries(PLANETS).map(([id, p]) => [id, {
    name: p.name, short: p.short, hint: p.hint, fact: p.fact, facts: p.facts, label: p.activity && p.activity.label,
  }])),
  numbers: NUMBERS.slice(),
  features: Object.fromEntries(FEATURES.map((f) => [f.id, { q: f.q, isYes: f.isYes, isNo: f.isNo }])),
  quizzes: Object.fromEntries(QUIZZES.map((q) => [q.id, q.q])),
  colors: Object.fromEntries(COLORS.map((c) => [c.id, c.name])),
  decors: Object.fromEntries(DECORS.map((d) => [d.id, d.name])),
  text: { ...TEXT },
};

export let LANG = 'fr';
const listeners = [];

export function resolveLang(pref = settings.lang) {
  if (pref === 'fr' || pref === 'en') return pref;
  const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'fr'];
  return /^fr\b/i.test(langs[0] || '') ? 'fr' : 'en';
}

function applyTexts(lang) {
  const L = lang === 'en' ? EN : FR;
  for (const [id, p] of Object.entries(PLANETS)) {
    const t = { ...FR.planets[id], ...((L.planets && L.planets[id]) || {}) };
    p.name = t.name;
    p.short = t.short;
    p.hint = t.hint;
    p.fact = t.fact;
    p.facts = t.facts;
    if (p.activity && t.label) p.activity.label = t.label;
  }
  NUMBERS.splice(0, NUMBERS.length, ...(L.numbers || FR.numbers));
  FEATURES.forEach((f) => Object.assign(f, FR.features[f.id], L.features && L.features[f.id]));
  QUIZZES.forEach((q) => { q.q = (L.quizzes && L.quizzes[q.id]) || FR.quizzes[q.id]; });
  COLORS.forEach((c) => { c.name = (L.colors && L.colors[c.id]) || FR.colors[c.id]; });
  DECORS.forEach((d) => { d.name = (L.decors && L.decors[d.id]) || FR.decors[d.id]; });
  Object.assign(TEXT, FR.text, L.text);
  LANG = lang;
}

// ---- texts written in index.html ------------------------------------------
// data-i18n="key"       → text of the element
// data-i18n-html="key"  → HTML of the element (credits)
// data-i18n-aria="key"  → aria-label (icon buttons)
// data-i18n-ph="key"    → placeholder
// The French version is whatever index.html contains.
const ATTRS = [
  ['i18n', (el) => el.textContent, (el, v) => { el.textContent = v; }],
  ['i18nHtml', (el) => el.innerHTML, (el, v) => { el.innerHTML = v; }],
  ['i18nAria', (el) => el.getAttribute('aria-label'), (el, v) => el.setAttribute('aria-label', v)],
  ['i18nPh', (el) => el.getAttribute('placeholder'), (el, v) => el.setAttribute('placeholder', v)],
];
const attrSelector = (name) => `[data-${name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`;
let frDom = null;

export function applyDomTexts() {
  if (!frDom) {
    frDom = { title: document.title };
    for (const [name, get] of ATTRS) {
      frDom[name] = {};
      document.querySelectorAll(attrSelector(name)).forEach((el) => { frDom[name][el.dataset[name]] = get(el); });
    }
  }
  const en = LANG === 'en';
  document.documentElement.lang = LANG;
  document.title = en ? EN.ui.title : frDom.title;
  // Browser version: name of the app when it is added to the home screen
  const manifest = document.getElementById('manifest');
  if (manifest) manifest.setAttribute('href', `manifest-${LANG}.webmanifest`);
  const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appTitle) appTitle.setAttribute('content', en ? 'Planet Rocket' : 'Fusée Planètes');
  for (const [name, , set] of ATTRS) {
    document.querySelectorAll(attrSelector(name)).forEach((el) => {
      const key = el.dataset[name];
      const v = en && EN.ui[key] != null ? EN.ui[key] : frDom[name][key];
      if (v != null) set(el, v);
    });
  }
}

/** Change the language ('auto' | 'fr' | 'en'): texts, page and voice. */
export function setLanguage(pref) {
  settings.lang = pref;
  applyTexts(resolveLang(pref));
  applyDomTexts();
  listeners.forEach((fn) => fn(LANG));
}

export function onLanguageChange(fn) { listeners.push(fn); }

// Locale for dates (and the voice): French, or the phone's English variant.
export function locale() {
  if (LANG === 'fr') return 'fr-FR';
  const l = navigator.language || '';
  return /^en[-_]/i.test(l) ? l.replace('_', '-') : 'en-US';
}

export function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}

applyTexts(resolveLang());
