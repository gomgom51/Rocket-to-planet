// Game entry point: loading, screens, game flow, render loop.

import { THREE, loadTexture, releaseTexture, planetTexUrl } from './gfx.js';
import { HomeScene, LaunchScene, TravelScene, VictoryScene, renderThumbnails } from './scenes.js';
import { PLANETS, DESTINATIONS, ORDER, NUMBERS, TEXT } from './data.js';
import { settings, saveSettings, getVisited, addVisited } from './settings.js';
import { speak, stopSpeaking } from './voice.js';
import { unlockAudio, applyVolume, sfx, setRumble, setMusic, suspendAudio, resumeAudio } from './audio.js';
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

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
let screen = 'loading';
function show(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
  screen = id;
}
const fadeEl = $('fade');
async function fade(on) {
  fadeEl.classList.toggle('on', on);
  await new Promise((r) => setTimeout(r, 650));
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
const assets = { small: {} };
let thumbs = {};

async function loadAll() {
  const jobs = [
    ['milkyway', 'textures/milkyway.jpg', true],
    ['rings', 'textures/saturn_rings.png', true],
    ['earth', planetTexUrl('earth'), true],
  ];
  ORDER.concat(['sun']).forEach((id) => jobs.push(['small:' + id, planetTexUrl(id, true), true]));
  let done = 0;
  await Promise.all(jobs.map(async ([key, url]) => {
    const t = await loadTexture(url);
    if (key.startsWith('small:')) assets.small[key.slice(6)] = t;
    else assets[key] = t;
    done++;
    $('bar-fill').style.width = `${Math.round((done / jobs.length) * 90)}%`;
  }));
  thumbs = renderThumbnails(ORDER, assets.small, assets.rings);
  $('bar-fill').style.width = '100%';
}

// ---------------------------------------------------------------------------
// Home + choose screens
// ---------------------------------------------------------------------------
let selected = null;

function buildGrid() {
  const grid = $('planet-grid');
  grid.innerHTML = '';
  const visited = getVisited();
  for (const id of DESTINATIONS) {
    const p = PLANETS[id];
    const card = document.createElement('button');
    card.className = 'planet-card' + (selected === id ? ' selected' : '');
    card.dataset.id = id;
    card.innerHTML = `<img src="${thumbs[id]}" alt=""><div class="name">${p.name}</div>` +
      (visited.has(id) ? '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.3l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7z"/></svg>' : '');
    card.addEventListener('click', () => {
      unlockAudio();
      selected = id;
      grid.querySelectorAll('.planet-card').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
      $('go').disabled = false;
      sfx.select();
      speak(TEXT.chosen(p), { silentWait: false });
    });
    grid.appendChild(card);
  }
  $('go').disabled = !selected;
}

function goHome() {
  cancelFlow();
  stopSpeaking();
  setRumble(0);
  hideDialog();
  $('confirm').classList.remove('active');
  scenes.travel.removePlanet();
  setScene(scenes.home);
  show('home');
  setMusic(true);
}

function goChoose() {
  buildGrid();
  setScene(scenes.home);
  show('choose');
  speak(TEXT.choose, { silentWait: false });
}

// ---------------------------------------------------------------------------
// HUD helpers
// ---------------------------------------------------------------------------
const dialog = $('dialog');
let answerResolve = null;
let lastQuestion = '';

function setDestChip(id) {
  const p = PLANETS[id];
  const img = settings.hint ? `<img src="${thumbs[id]}" alt="">` :
    '<svg class="target-ico" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"/></svg>';
  $('dest-chip').innerHTML = `${img}<span>${p.name}</span>`;
  $('dest-chip').style.visibility = 'visible';
}

function showCount(n) {
  const el = $('countdown');
  el.classList.remove('pop');
  void el.offsetWidth; // restart animation
  if (n > 0) {
    el.textContent = String(n);
    el.classList.remove('word');
    sfx.tick(false);
    speak(NUMBERS[n], { silentWait: false });
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

function ask(question, targetId) {
  lastQuestion = question;
  $('dialog-text').textContent = question;
  $('dialog-hint').src = thumbs[targetId];
  dialog.classList.toggle('with-hint', settings.hint);
  dialog.classList.remove('feedback');
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
  const n = settings.stops === 'random' ? 1 + Math.floor(Math.random() * 3) : Math.max(0, Math.min(3, Number(settings.stops) || 0));
  const others = shuffle(DESTINATIONS.filter((d) => d !== dest)).slice(0, n);
  return [...others, dest];
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function playRound(destId) {
  const id = newFlow();
  const T = PLANETS[destId];
  const name = settings.name.trim();
  try {
    setMusic(false);
    await fade(true); guard(id);
    // --- launch pad
    scenes.launch.reset();
    setScene(scenes.launch);
    show('hud');
    setDestChip(destId);
    $('countdown').textContent = '';
    hideLabel();
    hideBanner();
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
    setRumble(0);
    $('countdown').textContent = '';
    scenes.travel.reset();
    setScene(scenes.travel);
    await fade(false); guard(id);
    setMusic(true);
    const space = TEXT.space();
    banner(space);
    speak(space, { silentWait: false });

    const stops = buildStops(destId);
    loadTexture(planetTexUrl(stops[0]));
    for (let i = 0; i < stops.length; i++) {
      const pid = stops[i];
      const P = PLANETS[pid];
      if (stops[i + 1]) loadTexture(planetTexUrl(stops[i + 1])); // preload the next one
      await scenes.travel.warp(i === 0 ? 3.0 : 2.4); guard(id);
      hideBanner();
      const tex = await loadTexture(planetTexUrl(pid)); guard(id);
      scenes.travel.setPlanet(pid, tex);
      sfx.appear();
      const seen = TEXT.approach();
      banner(seen);
      speak(seen, { silentWait: false });
      await scenes.travel.approach(); guard(id);
      hideBanner();

      const ans = await ask(TEXT.question(T), destId); guard(id);
      const isDest = pid === destId;
      let msg;
      if (!isDest && ans === 'no') { sfx.good(); msg = TEXT.goodNo(P, T); }
      else if (!isDest) { sfx.gentle(); msg = TEXT.wrongYes(P, T); }
      else if (ans === 'yes') { sfx.good(); msg = TEXT.goodYes(T, name); }
      else { sfx.gentle(); msg = TEXT.wrongNo(T); }
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
      } else {
        await scenes.travel.flyby(); guard(id);
        releaseTexture(planetTexUrl(pid));
      }
    }

    // --- victory
    await fade(true); guard(id);
    hideBanner();
    hideLabel();
    scenes.travel.removePlanet();
    releaseTexture(planetTexUrl(destId));
    addVisited(destId);
    scenes.victory.setup(destId);
    setScene(scenes.victory);
    $('v-title').textContent = TEXT.victoryTitle(name);
    $('v-line').textContent = TEXT.victoryLine(T);
    $('v-fact').textContent = T.fact;
    $('v-fact').classList.remove('show');
    document.querySelector('.victory-foot').classList.remove('ready');
    buildMapLabels(destId);
    show('victory');
    await fade(false); guard(id);
    await scenes.victory.play(id); guard(id);
    sfx.victory();
    confetti.start();
    $('v-fact').classList.add('show');
    document.querySelector('.victory-foot').classList.add('ready');
    await speak(TEXT.victorySpeech(T, name)); guard(id);
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
    { id: 'earth', text: 'Terre', cls: 'map-label', below: true },
    { id: destId, text: cap(PLANETS[destId].name), cls: 'map-label dest', below: false },
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
  settings.volume = parseFloat($('set-volume').value);
  settings.hint = $('set-hint').checked;
  saveSettings();
  applyVolume();
  $('settings').classList.remove('active');
  $('set-name').blur();
}
document.querySelectorAll('.seg').forEach((seg) => {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = seg.dataset.key;
    const v = b.dataset.v;
    settings[key] = key === 'countdown' ? Number(v) : v === 'random' ? 'random' : Number(v);
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
});
$('set-volume').addEventListener('input', () => { settings.volume = parseFloat($('set-volume').value); applyVolume(); });
$('set-sound').addEventListener('change', () => { settings.sound = $('set-sound').checked; applyVolume(); });

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
$('play').addEventListener('click', () => { unlockAudio(); sfx.tap(); setMusic(true); goChoose(); });
$('go').addEventListener('click', () => { if (!selected) return; unlockAudio(); sfx.tap(); playRound(selected); });
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); stopSpeaking(); goHome(); }));
$('settings-btn').addEventListener('click', () => { unlockAudio(); openSettings(); });
$('settings-close').addEventListener('click', closeSettings);
$('yes').addEventListener('click', () => answer('yes'));
$('no').addEventListener('click', () => answer('no'));
$('repeat').addEventListener('click', () => { unlockAudio(); speak(lastQuestion, { silentWait: false }); });
$('quit').addEventListener('click', () => $('confirm').classList.add('active'));
$('confirm-yes').addEventListener('click', () => { confetti.stop(); goHome(); });
$('confirm-no').addEventListener('click', () => $('confirm').classList.remove('active'));
$('again').addEventListener('click', () => { sfx.tap(); confetti.stop(); stopSpeaking(); cancelFlow(); selected = null; goChoose(); });
$('to-home').addEventListener('click', () => { sfx.tap(); confetti.stop(); goHome(); });

// Android integration: back button and app pause/resume.
window.handleBack = () => {
  if ($('settings').classList.contains('active')) { closeSettings(); return true; }
  if ($('confirm').classList.contains('active')) { $('confirm').classList.remove('active'); return true; }
  if (screen === 'hud') { $('confirm').classList.add('active'); return true; }
  if (screen === 'choose' || screen === 'victory') { confetti.stop(); goHome(); return true; }
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
  resize();
  try {
    await loadAll();
  } catch (e) {
    console.error(e);
    $('loading-error').textContent = 'Oups, le chargement a échoué. Ferme et rouvre le jeu.';
    $('loading-error').classList.remove('hidden');
    return;
  }
  scenes = {
    home: new HomeScene(assets),
    launch: new LaunchScene(assets),
    travel: new TravelScene(assets),
    victory: new VictoryScene(assets),
  };
  setScene(scenes.home);
  // compile shaders up front to avoid hitches later
  Object.values(scenes).forEach((s) => { s.resize(W, H); renderer.compile(s.scene, s.camera); });
  frame();
  show('home');
  window.game = {
    scenes, playRound, goHome, goChoose, answer, settings, get screen() { return screen; },
    // test helpers: jump straight to a scene
    debug: {
      async travel(pid) {
        cancelFlow(); scenes.travel.reset(); setScene(scenes.travel); show('hud'); setDestChip(pid);
        scenes.travel.setPlanet(pid, await loadTexture(planetTexUrl(pid)));
        scenes.travel.planet.group.position.copy(scenes.travel.inspectPos);
      },
      launch() { cancelFlow(); scenes.launch.reset(); setScene(scenes.launch); show('hud'); },
      step(dt, n = 1) { for (let i = 0; i < n; i++) { updateTweens(dt); current.update(dt); } if (current === scenes.victory) updateMapLabels(); renderer.render(current.scene, current.camera); },
      victory(dest) { cancelFlow(); scenes.victory.setup(dest); setScene(scenes.victory); buildMapLabels(dest); show('victory'); scenes.victory.progress = 1; },
    },
  };
})();
