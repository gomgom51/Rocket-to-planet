// Game entry point: loading, screens, game flow, render loop.

import { applyDomTexts, setLanguage, fmtDate } from './i18n.js';
import { THREE, loadTexture, releaseTexture, planetTexUrl } from './gfx.js';
import { HomeScene, LaunchScene, TravelScene, VictoryScene, renderThumbnails } from './scenes.js';
import { MarsActivity, RingsActivity, MoonActivity } from './activities.js';
import { ENCOUNTERS } from './encounters.js';
import { GarageScene, buildCarnet, buildGarage } from './screens.js';
import {
  PLANETS, DESTINATIONS, BONUS, ORDER, ALL_BODIES, NUMBERS, TEXT, FEATURES, QUIZZES, cap, pick,
} from './data.js';
import { settings, saveSettings } from './settings.js';
import {
  progress, addStars, onStars, recordVisit, visitCount, visitedBase, bonusUnlocked, newDecors, markDecorsSeen, addPhoto, saveProgress,
} from './progress.js';
import { speak, stopSpeaking } from './voice.js';
import {
  unlockAudio, applyVolume, sfx, stopEngine, preloadSounds, playMusic, preloadMusic, hasTrack, hasLaunchSound, audioState,
  suspendAudio, resumeAudio,
} from './audio.js';
import { timeScale, newFlow, cancelFlow, guard, Cancelled, updateTweens, wait } from './util.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x02030a, 1);

let W = 1;
let H = 1;
let scenes = null;
let current = null;
let paused = false;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  renderer.setSize(W, H, false);
  if (scenes) Object.values(scenes).forEach((s) => s.resize(W, H));
}
window.addEventListener('resize', resize);

function setScene(s) {
  current = s;
  s.resize(W, H);
}

// Taps on the 3D view go to the current scene (stars, rocks, crystals…).
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (current && current.onTap) current.onTap(e.clientX, e.clientY);
});

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
let screen = 'loading';
function show(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
  screen = id;
  document.body.dataset.screen = id;
  if (id === 'home') releaseBackGuard(); else armBackGuard();
}

// Browser version: the phone's back button (or swipe) goes through
// handleBack() like in the Android app, instead of leaving the game.
// A history entry is added when leaving the home screen and used up by
// "back"; it is put back as long as the game handles the button.
let backGuard = false;
let skipPop = false;
function armBackGuard() {
  if (window.AndroidBridge || backGuard || screen === 'home' || screen === 'loading') return;
  try { history.pushState({ fusee: 1 }, ''); backGuard = true; } catch (e) { /* ignore */ }
}
function releaseBackGuard() {
  if (!backGuard) return;
  backGuard = false;
  skipPop = true;
  history.back();
}
window.addEventListener('popstate', () => {
  if (skipPop) { skipPop = false; return; }
  backGuard = false;
  if (window.handleBack && window.handleBack()) armBackGuard();
});
const fadeEl = $('fade');
async function fade(on) {
  fadeEl.classList.toggle('on', on);
  await new Promise((r) => setTimeout(r, 650));
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------
const starEl = $('star-count');
function updateStarCount(pop) {
  starEl.querySelector('span').textContent = String(progress.stars);
  if (pop) {
    starEl.classList.remove('pop');
    void starEl.offsetWidth;
    starEl.classList.add('pop');
  }
}
onStars(() => updateStarCount(true));

// Give stars, with a little star flying from (x, y) to the counter.
function giveStars(n = 1, x, y) {
  const r = starEl.getBoundingClientRect();
  const sx = x !== undefined ? x : W / 2;
  const sy = y !== undefined ? y : H / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'flying-star');
    s.innerHTML = '<path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.3l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7z"/>';
    s.style.left = `${sx - 17}px`;
    s.style.top = `${sy - 17}px`;
    document.body.appendChild(s);
    setTimeout(() => {
      s.style.transform = `translate(${r.left + 14 - sx}px, ${r.top + 14 - sy}px) scale(0.6)`;
      s.style.opacity = '0.2';
    }, 30 + i * 120);
    setTimeout(() => s.remove(), 950 + i * 120);
  }
  setTimeout(() => addStars(n), 700);
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
const assets = { small: {} };
let thumbs = {};

async function loadAll() {
  const jobs = [
    ['milkyway', 'textures/milkyway.jpg'],
    ['rings', 'textures/saturn_rings.png'],
    ['earth', planetTexUrl('earth')],
  ];
  ALL_BODIES.concat(['sun']).forEach((id) => jobs.push(['small:' + id, planetTexUrl(id, true)]));
  let done = 0;
  await Promise.all(jobs.map(async ([key, url]) => {
    const t = await loadTexture(url);
    if (key.startsWith('small:')) assets.small[key.slice(6)] = t;
    else assets[key] = t;
    done++;
    $('bar-fill').style.width = `${Math.round((done / jobs.length) * 90)}%`;
  }));
  // the name painted on the rocket uses the game font
  try { await document.fonts.load('900 100px Nunito'); } catch (e) { /* ignore */ }
  thumbs = renderThumbnails(ALL_BODIES, assets.small, assets.rings);
  $('bar-fill').style.width = '100%';
}

// ---------------------------------------------------------------------------
// Home, choose, carnet, garage
// ---------------------------------------------------------------------------
let selected = null;
const STAR_SVG = '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.3l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7z"/></svg>';

function buildGrid() {
  const grid = $('planet-grid');
  grid.innerHTML = '';
  const card = (id) => {
    const p = PLANETS[id];
    const el = document.createElement('button');
    el.className = 'planet-card' + (selected === id ? ' selected' : '');
    el.dataset.id = id;
    el.innerHTML = `<img src="${thumbs[id]}" alt=""><div class="name">${cap(p.name)}</div>` + (visitCount(id) ? STAR_SVG : '');
    el.addEventListener('click', () => {
      unlockAudio();
      selected = id;
      grid.querySelectorAll('.planet-card').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
      $('go').disabled = false;
      sfx.select();
      speak(TEXT.chosen(p), { silentWait: false });
    });
    grid.appendChild(el);
  };
  DESTINATIONS.forEach(card);
  if (bonusUnlocked()) {
    const sep = document.createElement('div');
    sep.className = 'grid-sep';
    sep.textContent = TEXT.bonusTitle;
    grid.appendChild(sep);
    BONUS.forEach(card);
  } else {
    const el = document.createElement('div');
    el.className = 'planet-card locked-card';
    el.innerHTML = `<div class="big">🔒</div>${TEXT.lockedGrid(7 - visitedBase())}`;
    grid.appendChild(el);
  }
  $('go').disabled = !selected;
}

function hideTransient() {
  hideDialog();
  hideBanner();
  hideLabel();
  hideAction();
  $('photo-btn').classList.remove('show');
  $('polaroid').classList.remove('show');
  $('confirm').classList.remove('active');
  $('celebrate').classList.remove('active');
}

function goHome() {
  cancelFlow();
  stopSpeaking();
  stopEngine();
  hideTransient();
  confetti.stop();
  scenes.travel.clearFx();
  scenes.travel.removePlanet();
  scenes.home.restyle();
  setScene(scenes.home);
  show('home');
  playMusic('accueil');
}

function goChoose() {
  cancelFlow();
  hideTransient();
  playMusic('accueil');
  buildGrid();
  scenes.home.restyle();
  setScene(scenes.home);
  show('choose');
  speak(TEXT.choose, { silentWait: false });
}

function goCarnet() {
  cancelFlow();
  stopSpeaking();
  hideTransient();
  confetti.stop();
  buildCarnet(thumbs);
  setScene(scenes.home);
  show('carnet');
  playMusic('accueil');
  speak(TEXT.carnetSpeech(progress.stars), { silentWait: false });
}

function goGarage() {
  cancelFlow();
  hideTransient();
  scenes.garage.restyle();
  setScene(scenes.garage);
  show('garage');
  buildGarage(() => scenes.garage.restyle(), sfx, speak);
  speak(TEXT.garageSpeech, { silentWait: false });
}

// ---------------------------------------------------------------------------
// HUD helpers
// ---------------------------------------------------------------------------
const dialog = $('dialog');
let answerResolve = null;
let lastQuestion = '';

function setDestChip(id) {
  const p = PLANETS[id];
  const img = settings.hint ? `<img src="${thumbs[id]}" alt="">` :
    '<svg class="target-ico" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"/></svg>';
  $('dest-chip').innerHTML = `${img}<span>${cap(p.name)}</span>`;
}

// Shows and says one number of the countdown. Resolves once the number has
// been said (2.5 s at most): the countdown waits for it, so that a slow voice
// (the online voices of Edge or Chrome on a computer start talking late) is
// never cut by the next number.
function showCount(n) {
  const el = $('countdown');
  el.classList.remove('pop');
  void el.offsetWidth; // restart animation
  if (n > 0) {
    el.textContent = String(n);
    el.classList.remove('word');
    sfx.tick(false);
    el.classList.add('pop');
    return Promise.race([speak(NUMBERS[n], { silentWait: false }), wait(2.5)]);
  } else {
    el.textContent = TEXT.liftoff;
    el.classList.add('word');
    sfx.tick(true);
    speak(TEXT.liftoff, { silentWait: false });
  }
  el.classList.add('pop');
}

function showLabel(text) {
  const el = $('planet-label');
  el.textContent = text;
  el.classList.add('show');
}
function hideLabel() { $('planet-label').classList.remove('show'); }

function banner(text) {
  const el = $('banner');
  el.textContent = text;
  el.classList.add('show');
}
function hideBanner() { $('banner').classList.remove('show'); }

let actionFn = null;
function showAction(label, fn) {
  const b = $('action-btn');
  b.textContent = label;
  actionFn = fn;
  b.classList.add('show');
}
function hideAction() { $('action-btn').classList.remove('show'); actionFn = null; }
$('action-btn').addEventListener('click', () => { unlockAudio(); if (actionFn) actionFn(); });

function ask(question, targetId) {
  lastQuestion = question;
  $('dialog-text').textContent = question;
  $('dialog-hint').src = thumbs[targetId];
  dialog.classList.toggle('with-hint', settings.hint);
  dialog.classList.remove('feedback', 'quiz');
  $('yes').disabled = false;
  $('no').disabled = false;
  dialog.classList.add('show');
  speak(question, { silentWait: false });
  return new Promise((resolve) => { answerResolve = resolve; });
}

function feedback(text) {
  $('dialog-text').textContent = text;
  dialog.classList.add('feedback');
  lastQuestion = text;
}

function hideDialog() {
  dialog.classList.remove('show');
  answerResolve = null;
}

function answer(value) {
  if (!answerResolve) return;
  unlockAudio();
  $('yes').disabled = true;
  $('no').disabled = true;
  const r = answerResolve;
  answerResolve = null;
  r(value);
}

// Picture quiz from the on-board computer: errorless, try until right.
function quiz(T) {
  const usable = QUIZZES.filter((q) => q.answer === 'TARGET' ? ORDER.includes(T.id) || bonusUnlocked() : true);
  const q = pick(usable);
  const answerId = q.answer === 'TARGET' ? T.id : q.answer;
  const pool = (ORDER.includes(answerId) ? ORDER : ALL_BODIES).filter((id) => id !== answerId && !q.notWith.includes(id) && id !== 'comet');
  const options = shuffle([answerId, ...shuffle(pool.slice()).slice(0, 2)]);
  const text = typeof q.q === 'function' ? q.q(T) : q.q;
  lastQuestion = text;
  $('dialog-text').textContent = text;
  dialog.classList.remove('feedback', 'with-hint');
  dialog.classList.add('quiz', 'show');
  const box = $('quiz-options');
  box.innerHTML = '';
  const maxSize = Math.max(...options.map((id) => PLANETS[id].size));
  return new Promise((resolve) => {
    let done = false;
    options.forEach((id) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      const scale = q.scaled ? Math.max(0.3, Math.sqrt(PLANETS[id].size / maxSize)) : 1;
      b.innerHTML = `<div class="qimg"><img src="${thumbs[id]}" alt="" style="transform:scale(${scale.toFixed(2)})"></div><div class="name">${cap(PLANETS[id].name)}</div>`;
      b.addEventListener('click', async () => {
        if (done || b.classList.contains('wrong')) return;
        unlockAudio();
        if (id === answerId) {
          done = true;
          b.classList.add('right');
          sfx.good();
          const r = b.getBoundingClientRect();
          giveStars(1, r.left + r.width / 2, r.top + r.height / 2);
          await speak(TEXT.quizGood(PLANETS[id]));
          resolve();
        } else {
          b.classList.add('wrong');
          sfx.gentle();
          speak(TEXT.quizWrong(PLANETS[id]), { silentWait: false });
        }
      });
      box.appendChild(b);
    });
    speak(text, { silentWait: false });
  });
}

// "Does it have rings?" style question about the planet in front.
function pickFeature(P, T) {
  const valid = FEATURES.filter((f) => !f.avoid.includes(P.id));
  const yesF = valid.filter((f) => f.yes.includes(P.id));
  const targetF = valid.filter((f) => f.yes.includes(T.id) && !f.yes.includes(P.id));
  if (yesF.length && (Math.random() < 0.5 || !targetF.length)) return pick(yesF);
  if (targetF.length) return pick(targetF);
  return null;
}

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildStops(dest) {
  const n = settings.stops === 'random' ? 1 + Math.floor(Math.random() * 3) : Math.max(0, Math.min(3, Number(settings.stops) || 0));
  const pool = DESTINATIONS.concat(bonusUnlocked() ? BONUS : []).filter((d) => d !== dest);
  const others = shuffle(pool).slice(0, n);
  return [...others, dest];
}

// Everything scenes may use during encounters and activities.
const api = {
  speak: (t, o) => speak(t, o),
  banner,
  hideBanner,
  sfx,
  wait,
  addStars: (n, x, y) => giveStars(n, x, y),
  showButton: showAction,
  hideButton: hideAction,
  textures: {},
};

async function runEncounter(id, T, used) {
  const all = ['shootingStars', 'station', 'ship', 'quiz', 'asteroids', 'comet'];
  const choices = all.filter((e) => !used.includes(e) && !(e === 'comet' && T.id === 'comet'));
  if (!choices.length) return;
  // shooting stars are the favourite: a bit more often
  const kind = Math.random() < 0.3 && choices.includes('shootingStars') ? 'shootingStars' : pick(choices);
  used.push(kind);
  if (kind === 'quiz') {
    banner(TEXT.quizIntro);
    await speak(TEXT.quizIntro); guard(id);
    hideBanner();
    await quiz(T); guard(id);
    await wait(0.6); guard(id);
    hideDialog();
  } else {
    await ENCOUNTERS[kind](scenes.travel, api); guard(id);
  }
}

async function photoStep(id, T) {
  banner(TEXT.photo);
  speak(TEXT.photo, { silentWait: false });
  const btn = $('photo-btn');
  btn.classList.add('show');
  let taken = false;
  (async () => {
    while (!taken) {
      await wait(12);
      if (!taken) speak(TEXT.photo, { silentWait: false });
    }
  })();
  await new Promise((resolve) => {
    btn.onclick = () => {
      if (taken) return;
      taken = true;
      unlockAudio();
      resolve();
    };
  });
  guard(id);
  btn.classList.remove('show');
  hideBanner();
  sfx.shutter();
  const data = capturePhoto(T);
  $('flash').classList.add('on');
  setTimeout(() => $('flash').classList.remove('on'), 60);
  if (data) {
    addPhoto(T.id, data);
    $('polaroid').querySelector('img').src = data;
    $('polaroid').classList.add('show');
  }
  giveStars(1, W / 2, H * 0.7);
  await Promise.all([speak(TEXT.photoDone), wait(2.6)]); guard(id);
  $('polaroid').classList.remove('show');
  await wait(0.4); guard(id);
}

// Picture of the current 3D view in a white "instant photo" frame.
function capturePhoto(T) {
  try {
    renderer.render(current.scene, current.camera);
    const src = renderer.domElement;
    const cw = src.width;
    const ch = src.height;
    const size = Math.min(cw, ch * 0.62);
    const sx = (cw - size) / 2;
    const sy = Math.max(0, ch * 0.45 - size / 2);
    const out = document.createElement('canvas');
    const S = 440;
    out.width = S + 40;
    out.height = S + 120;
    const g = out.getContext('2d');
    g.fillStyle = '#fbfaf6';
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(src, sx, sy, size, size, 20, 20, S, S);
    g.fillStyle = '#2b2b33';
    g.textAlign = 'center';
    g.font = '900 34px Nunito, sans-serif';
    g.fillText(cap(T.name), out.width / 2, S + 66);
    g.font = '700 20px Nunito, sans-serif';
    const who = settings.name.trim();
    g.fillText(`${who ? who + ' · ' : ''}${fmtDate(Date.now())}`, out.width / 2, S + 98);
    return out.toDataURL('image/jpeg', 0.82);
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function arrivalActivity(id, T) {
  const act = T.activity || { type: 'facts' };
  hideLabel();
  if (act.type === 'spot') {
    await scenes.travel.spotActivity(api); guard(id);
  } else if (act.type === 'facts') {
    await scenes.travel.factsActivity(api); guard(id);
  } else {
    const sc = { rover: scenes.mars, rings: scenes.rings, flag: scenes.moon }[act.type];
    if (act.type === 'rings') assets.saturnTex = await loadTexture(planetTexUrl('saturn'));
    guard(id);
    await fade(true); guard(id);
    hideBanner();
    setScene(sc);
    sc.update(0);
    await fade(false); guard(id);
    await sc.run(api); guard(id);
  }
  hideBanner();
  await wait(0.5); guard(id);
  await photoStep(id, T);
}

async function celebrate(title, ids, text) {
  $('celebrate-title').textContent = title;
  $('celebrate-imgs').innerHTML = ids.map((i) => `<img src="${thumbs[i]}" alt="">`).join('');
  $('celebrate-text').textContent = text;
  $('celebrate').classList.add('active');
  sfx.unlock();
  speak(text, { silentWait: false });
  await new Promise((resolve) => { $('celebrate-ok').onclick = () => { sfx.tap(); resolve(); }; });
  $('celebrate').classList.remove('active');
}

async function playRound(destId) {
  const id = newFlow();
  const T = PLANETS[destId];
  const name = settings.name.trim();
  try {
    playMusic(null); // no music on the launch pad
    await fade(true); guard(id);
    // --- launch pad
    scenes.launch.reset();
    setScene(scenes.launch);
    show('hud');
    hideTransient();
    setDestChip(destId);
    $('countdown').textContent = '';
    await fade(false); guard(id);
    banner(TEXT.go(T));
    await speak(TEXT.go(T)); guard(id);
    await wait(0.4); guard(id);
    banner(TEXT.countdownStart);
    await speak(TEXT.countdownStart); guard(id);
    hideBanner();
    await scenes.launch.run(id, settings.countdown, showCount); guard(id);

    // --- space
    await fade(true); guard(id);
    stopEngine();
    $('countdown').textContent = '';
    scenes.travel.reset();
    setScene(scenes.travel);
    await fade(false); guard(id);
    playMusic('voyage');
    const space = TEXT.space();
    banner(space);
    speak(space, { silentWait: false });

    const stops = buildStops(destId);
    const used = [];
    loadTexture(planetTexUrl(stops[0]));
    for (let i = 0; i < stops.length; i++) {
      const pid = stops[i];
      const P = PLANETS[pid];
      if (stops[i + 1]) loadTexture(planetTexUrl(stops[i + 1])); // preload the next one
      await scenes.travel.warp(i === 0 ? 2.6 : 2.2); guard(id);
      hideBanner();
      // a little surprise on most legs of the trip
      if (Math.random() < 0.8) {
        await runEncounter(id, T, used);
        await scenes.travel.warp(1.6); guard(id);
      }
      const tex = await loadTexture(planetTexUrl(pid)); guard(id);
      scenes.travel.setPlanet(pid, tex);
      sfx.appear();
      const seen = TEXT.approachBody(P) || TEXT.approach();
      banner(seen);
      speak(seen, { silentWait: false });
      await scenes.travel.approach(); guard(id);
      hideBanner();

      const isDest = pid === destId;
      const feature = Math.random() < 0.4 ? pickFeature(P, T) : null;
      let msg;
      if (feature) {
        const ans = await ask(`${TEXT.featureIntro} ${feature.q}`, destId); guard(id);
        const truth = feature.yes.includes(pid);
        const right = (ans === 'yes') === truth;
        if (right) { sfx.good(); giveStars(1); } else sfx.gentle();
        msg = `${right ? TEXT.featureGood() : TEXT.featureWrong} ${truth ? feature.isYes : feature.isNo} ${TEXT.featureReveal(P, T)}`;
      } else {
        const ans = await ask(TEXT.question(T), destId); guard(id);
        if (!isDest && ans === 'no') { sfx.good(); giveStars(1); msg = TEXT.goodNo(P, T); }
        else if (!isDest) { sfx.gentle(); msg = TEXT.wrongYes(P, T); }
        else if (ans === 'yes') { sfx.good(); giveStars(1); msg = TEXT.goodYes(T, name); }
        else { sfx.gentle(); msg = TEXT.wrongNo(T); }
      }
      showLabel(cap(P.name));
      feedback(msg);
      await Promise.all([speak(msg), wait(2.4)]); guard(id);
      hideDialog();
      hideLabel();
      if (isDest) {
        showLabel(cap(T.name));
        await scenes.travel.arrive(); guard(id);
        const arr = TEXT.arrive(T);
        banner(arr);
        sfx.good();
        await Promise.all([speak(arr), wait(3.2)]); guard(id);
        hideBanner();
        await arrivalActivity(id, T);
      } else {
        await scenes.travel.flyby(); guard(id);
        releaseTexture(planetTexUrl(pid));
      }
    }

    // --- victory
    await fade(true); guard(id);
    hideTransient();
    scenes.travel.clearFx();
    scenes.travel.removePlanet();
    releaseTexture(planetTexUrl(destId));
    const wasUnlocked = bonusUnlocked();
    recordVisit(destId);
    scenes.victory.setup(destId);
    setScene(scenes.victory);
    $('v-title').textContent = TEXT.victoryTitle(name);
    $('v-line').textContent = TEXT.victoryLine(T);
    $('v-fact').textContent = T.fact;
    $('v-fact').classList.remove('show');
    document.querySelector('.victory-foot').classList.remove('ready');
    buildMapLabels(destId);
    show('victory');
    playMusic('victoire');
    await fade(false); guard(id);
    await scenes.victory.play(id); guard(id);
    if (!hasTrack('victoire')) sfx.victory();
    confetti.start();
    giveStars(3, W / 2, H * 0.3);
    $('v-fact').classList.add('show');
    await speak(TEXT.victorySpeech(T, name)); guard(id);
    await wait(0.8); guard(id);
    // new destinations, new rocket decorations
    if (!wasUnlocked && bonusUnlocked() && !progress.unlockSeen) {
      progress.unlockSeen = true;
      saveProgress();
      await celebrate(TEXT.unlockTitle, BONUS, TEXT.unlocked); guard(id);
    }
    const decors = newDecors();
    if (decors.length) {
      markDecorsSeen();
      const names = decors.map((d) => d.name);
      await celebrate(TEXT.newDecorTitle(names.length), [], TEXT.newDecor(names)); guard(id);
    }
    document.querySelector('.victory-foot').classList.add('ready');
  } catch (e) {
    if (!(e instanceof Cancelled)) console.error(e);
  }
}

// HTML labels on the victory map
let mapLabels = [];
function buildMapLabels(destId) {
  const box = $('v-labels');
  box.innerHTML = '';
  mapLabels = [
    { id: 'earth', text: cap(PLANETS.earth.short || PLANETS.earth.name), cls: 'map-label', below: true },
    { id: destId, text: cap(PLANETS[destId].short || PLANETS[destId].name), cls: 'map-label dest', below: false },
  ].map((l) => {
    const el = document.createElement('div');
    el.className = l.cls;
    el.textContent = l.text;
    box.appendChild(el);
    return { ...l, el };
  });
}
function updateMapLabels() {
  for (const l of mapLabels) {
    const p = scenes.victory.screenPos(l.id, W, H, l.below);
    if (p) l.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  }
}

// ---------------------------------------------------------------------------
// Confetti (2D canvas over the victory map)
// ---------------------------------------------------------------------------
const confetti = (() => {
  const c = $('confetti');
  const g = c.getContext('2d');
  let parts = [];
  let running = false;
  const colors = ['#ffc94a', '#ff7a59', '#5fd0ff', '#7dff9a', '#ff9ad5', '#ffffff'];
  function start() {
    c.width = W * Math.min(2, window.devicePixelRatio || 1);
    c.height = H * Math.min(2, window.devicePixelRatio || 1);
    const s = c.width / W;
    parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120,
        r: 5 + Math.random() * 6, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 6, col: colors[i % colors.length], star: Math.random() < 0.35,
      });
    }
    g.setTransform(s, 0, 0, s, 0, 0);
    running = true;
  }
  function drawStar(r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }
  function update(dt) {
    if (!running) return;
    g.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of parts) {
      p.vy += 40 * dt;
      p.x += (p.vx + Math.sin(p.a) * 30) * dt;
      p.y += p.vy * dt;
      p.a += p.va * dt;
      if (p.y < H + 30) alive++;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.a);
      g.fillStyle = p.col;
      if (p.star) drawStar(p.r * 1.3);
      else g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
      g.restore();
    }
    if (!alive) { running = false; g.clearRect(0, 0, W, H); }
  }
  function stop() { running = false; g.clearRect(0, 0, W, H); }
  return { start, update, stop };
})();

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------
function openSettings() {
  $('set-name').value = settings.name;
  $('set-voice').checked = settings.voice;
  $('set-sound').checked = settings.sound;
  $('set-music').checked = settings.music !== false;
  $('set-volume').value = settings.volume;
  $('set-hint').checked = settings.hint;
  document.querySelectorAll('.seg').forEach((seg) => {
    const key = seg.dataset.key;
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(settings[key]) === b.dataset.v));
  });
  $('settings').classList.add('active');
}
function closeSettings() {
  settings.name = $('set-name').value.slice(0, 20);
  settings.voice = $('set-voice').checked;
  settings.sound = $('set-sound').checked;
  settings.music = $('set-music').checked;
  settings.volume = parseFloat($('set-volume').value);
  settings.hint = $('set-hint').checked;
  saveSettings();
  applyVolume();
  $('settings').classList.remove('active');
  $('set-name').blur();
  if (scenes) scenes.home.restyle();
}
document.querySelectorAll('.seg').forEach((seg) => {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = seg.dataset.key;
    const v = b.dataset.v;
    if (key === 'lang') { setLanguage(v); sfx.select(); } else settings[key] = key === 'countdown' ? Number(v) : v === 'random' ? 'random' : Number(v);
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
});
$('set-volume').addEventListener('input', () => { settings.volume = parseFloat($('set-volume').value); applyVolume(); });
$('set-sound').addEventListener('change', () => { settings.sound = $('set-sound').checked; applyVolume(); });
$('set-music').addEventListener('change', () => { settings.music = $('set-music').checked; applyVolume(); });
// Browsers only allow sound after a first touch: resume audio on any touch.
document.addEventListener('pointerdown', () => unlockAudio(), { passive: true });

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
$('play').addEventListener('click', () => { unlockAudio(); sfx.tap(); goChoose(); });
$('garage-btn').addEventListener('click', () => { unlockAudio(); sfx.tap(); goGarage(); });
$('carnet-btn').addEventListener('click', () => { unlockAudio(); sfx.tap(); goCarnet(); });
$('go').addEventListener('click', () => { if (!selected) return; unlockAudio(); sfx.tap(); playRound(selected); });
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); stopSpeaking(); goHome(); }));
$('settings-btn').addEventListener('click', () => { unlockAudio(); openSettings(); });
$('settings-close').addEventListener('click', closeSettings);
$('yes').addEventListener('click', () => answer('yes'));
$('no').addEventListener('click', () => answer('no'));
$('repeat').addEventListener('click', () => { unlockAudio(); speak(lastQuestion, { silentWait: false }); });
$('quit').addEventListener('click', () => $('confirm').classList.add('active'));
$('confirm-yes').addEventListener('click', () => goHome());
$('confirm-no').addEventListener('click', () => $('confirm').classList.remove('active'));
$('again').addEventListener('click', () => { sfx.tap(); confetti.stop(); stopSpeaking(); selected = null; goChoose(); });
$('to-home').addEventListener('click', () => { sfx.tap(); goHome(); });
$('to-carnet').addEventListener('click', () => { sfx.tap(); goCarnet(); });

// Android integration: back button and app pause/resume.
window.handleBack = () => {
  if ($('settings').classList.contains('active')) { closeSettings(); return true; }
  if ($('photo-view').classList.contains('active')) { $('photo-view').classList.remove('active'); return true; }
  if ($('confirm').classList.contains('active')) { $('confirm').classList.remove('active'); return true; }
  if (screen === 'hud') { $('confirm').classList.add('active'); return true; }
  if (screen !== 'home' && screen !== 'loading') { goHome(); return true; }
  return false;
};
window.onAppPause = () => { paused = true; stopSpeaking(); suspendAudio(); };
window.onAppResume = () => { paused = false; clock.getDelta(); resumeAudio(); };
document.addEventListener('visibilitychange', () => {
  if (document.hidden) window.onAppPause(); else window.onAppResume();
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const raw = Math.min(clock.getDelta(), 0.05);
  if (paused || !current) return;
  const dt = raw * timeScale;
  updateTweens(dt);
  current.update(dt);
  if (current === scenes.victory) updateMapLabels();
  confetti.update(raw);
  renderer.render(current.scene, current.camera);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
(async function start() {
  applyDomTexts();
  resize();
  try {
    await loadAll();
  } catch (e) {
    console.error(e);
    $('loading-error').textContent = TEXT.loadError;
    $('loading-error').classList.remove('hidden');
    return;
  }
  api.textures.cometSmall = assets.small.comet;
  scenes = {
    home: new HomeScene(assets),
    launch: new LaunchScene(assets),
    travel: new TravelScene(assets),
    victory: new VictoryScene(assets),
    mars: new MarsActivity(assets),
    rings: new RingsActivity(assets),
    moon: new MoonActivity(assets),
    garage: new GarageScene(assets),
  };
  setScene(scenes.home);
  // compile shaders up front to avoid hitches later
  Object.values(scenes).forEach((s) => { s.resize(W, H); renderer.compile(s.scene, s.camera); });
  frame();
  show('home');
  starEl.classList.remove('hidden');
  updateStarCount(false);
  preloadMusic();
  preloadSounds();
  playMusic('accueil'); // starts at once in the app, after the first touch in a browser
  window.game = {
    scenes, playRound, goHome, goChoose, goCarnet, goGarage, answer, settings, progress, get screen() { return screen; }, get current() { return current; },
    // test helpers: jump straight to a scene
    debug: {
      async travel(pid) {
        cancelFlow(); scenes.travel.reset(); setScene(scenes.travel); show('hud'); setDestChip(pid);
        scenes.travel.setPlanet(pid, await loadTexture(planetTexUrl(pid)));
        scenes.travel.planet.group.position.copy(scenes.travel.inspectPos);
      },
      launch() { cancelFlow(); scenes.launch.reset(); setScene(scenes.launch); show('hud'); },
      async activity(kind) {
        cancelFlow(); show('hud'); hideTransient();
        if (kind === 'rings') assets.saturnTex = await loadTexture(planetTexUrl('saturn'));
        const sc = scenes[kind]; setScene(sc); sc.run(api);
      },
      encounter(kind) { return kind === 'quiz' ? quiz(PLANETS.saturn) : ENCOUNTERS[kind](scenes.travel, api); },
      photo(dest) { return photoStep(newFlow(), PLANETS[dest]); },
      audio: () => audioState(),
      music: () => ({ accueil: hasTrack('accueil'), voyage: hasTrack('voyage'), victoire: hasTrack('victoire'), decollage: hasLaunchSound() }),
      step(dt, n = 1) { for (let i = 0; i < n; i++) { updateTweens(dt); current.update(dt); } if (current === scenes.victory) updateMapLabels(); renderer.render(current.scene, current.camera); },
      victory(dest) { cancelFlow(); scenes.victory.setup(dest); setScene(scenes.victory); buildMapLabels(dest); show('victory'); scenes.victory.progress = 1; },
    },
  };
})();
