// Gentle synthesized sounds (Web Audio API). No sudden loud noises:
// children with Williams syndrome are often sensitive to sound (hyperacusis),
// so everything fades in/out softly and the master volume stays moderate.

import { settings } from './settings.js';

let ctx = null;
let master = null;
let musicGain = null; // synthesized pad (used when no music file is present)
let trackBus = null;  // music files
let musicBus = null;  // all music: on/off setting + lowered while the voice speaks
let music = null;

function now() { return ctx.currentTime; }

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(musicBus);
    trackBus = ctx.createGain();
    trackBus.connect(musicBus);
    applyVolume();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function applyVolume() {
  if (!master) return;
  const v = settings.sound ? settings.volume : 0;
  master.gain.setTargetAtTime(v * 0.7, now(), 0.05);
  updateMusicBus();
}

let ducked = false;
function updateMusicBus() {
  if (!musicBus) return;
  const v = settings.music === false ? 0 : ducked ? 0.4 : 1;
  musicBus.gain.setTargetAtTime(v, now(), ducked ? 0.15 : 0.6);
}
// Lower the music while the voice is speaking, so sentences stay clear.
export function setDuck(on) {
  if (on === ducked) return;
  ducked = on;
  updateMusicBus();
}

export function suspendAudio() {
  if (currentTrack && trackState[currentTrack]) trackState[currentTrack].el.pause();
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  const st = currentTrack && trackState[currentTrack];
  if (st && st.ok !== false && !(st.el.ended && !st.el.loop)) st.el.play().catch(() => {});
}

function ok() { return ctx && settings.sound; }

// A soft bell-like note (sine + quiet harmonic, exponential decay).
function bell(freq, start, dur = 1.2, vol = 0.18) {
  const t0 = now() + start;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(master);
  [[1, 1], [2, 0.25], [3.01, 0.08]].forEach(([mult, amp]) => {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
}

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

export const sfx = {
  tap() { if (ok()) bell(NOTE(84), 0, 0.25, 0.06); },
  select() { if (ok()) { bell(NOTE(76), 0, 0.5, 0.1); bell(NOTE(83), 0.07, 0.6, 0.08); } },
  tick(last = false) { if (ok()) bell(last ? NOTE(84) : NOTE(72), 0, last ? 1.2 : 0.45, 0.12); },
  good() { if (ok()) [72, 76, 79, 84].forEach((n, i) => bell(NOTE(n), i * 0.11, 1.0, 0.13)); },
  gentle() { if (ok()) { bell(NOTE(67), 0, 0.7, 0.09); bell(NOTE(64), 0.22, 0.9, 0.08); } },
  appear() { if (ok()) [79, 86, 91].forEach((n, i) => bell(NOTE(n), i * 0.09, 1.4, 0.05)); },
  victory() {
    if (!ok()) return;
    const melody = [[72, 0], [76, 0.18], [79, 0.36], [84, 0.6], [79, 0.9], [84, 1.08], [88, 1.3]];
    melody.forEach(([n, t]) => bell(NOTE(n), t, 1.6, 0.13));
    [[60, 0], [64, 0.6], [67, 1.3]].forEach(([n, t]) => bell(NOTE(n), t, 2.2, 0.07));
  },
  catchStar() { if (ok()) [84, 88, 91, 96].forEach((n, i) => bell(NOTE(n), i * 0.05, 0.6, 0.07)); },
  hello() { if (ok()) { bell(NOTE(79), 0, 0.5, 0.12); bell(NOTE(76), 0.28, 0.7, 0.12); } },
  melody() { if (ok()) [72, 76, 79, 77, 84].forEach((n, i) => bell(NOTE(n), i * 0.13, 0.6, 0.09)); },
  unlock() { if (ok()) [72, 79, 76, 84, 88, 91].forEach((n, i) => bell(NOTE(n), i * 0.12, 1.4, 0.1)); },
  boing() {
    if (!ok()) return;
    const t0 = now();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(520, t0 + 0.25);
    o.frequency.exponentialRampToValueAtTime(300, t0 + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.75);
  },
  shutter() {
    if (!ok()) return;
    const t0 = now();
    [0, 0.09].forEach((dt) => {
      const src = noiseSource(0.2);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.06);
      src.connect(f).connect(g).connect(master);
      src.start(t0 + dt);
      src.stop(t0 + dt + 0.1);
    });
  },
  whoosh() {
    if (!ok()) return;
    const t0 = now();
    const src = noiseSource(2.2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(1800, t0 + 1.0);
    f.frequency.exponentialRampToValueAtTime(250, t0 + 2.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.10, t0 + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.1);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 2.2);
  },
};

let noiseBuf = null;
function noiseSource(seconds) {
  if (!noiseBuf) {
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // brown-ish noise: deep and soft
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = seconds > 2.9;
  return s;
}

// ---------------------------------------------------------------------------
// Rocket engine.
// If web/sons/decollage.mp3 exists it is played from ignition to space
// (softened by a low-pass filter and a compressor). Otherwise a layered
// synthesized engine is used: deep rumble + roar + crackle + sub-bass.
// ---------------------------------------------------------------------------
let engine = null;       // synthesized engine
let launchFile = null;   // { buffer, ok, src, out }

function makeBuffer(seconds, fill) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  fill(b.getChannelData(0), ctx.sampleRate);
  return b;
}

function engineChain() {
  // all engine layers -> soft limiter -> master
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.05;
  comp.release.value = 0.4;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(comp).connect(master);
  return { out, comp };
}

function startSynthEngine() {
  const { out } = engineChain();
  const loop = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
  // deep rumble (brown noise, low-pass)
  const brown = makeBuffer(4, (d) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
  const rumbleSrc = loop(brown);
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = 'lowpass';
  rumbleLp.frequency.value = 160;
  rumbleLp.Q.value = 0.8;
  const rumbleG = ctx.createGain();
  rumbleG.gain.value = 0.55;
  rumbleSrc.connect(rumbleLp).connect(rumbleG).connect(out);
  // roar (pink-ish noise, band-pass, slowly breathing)
  const pink = makeBuffer(4, (d) => {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
  });
  const roarSrc = loop(pink);
  const roarBp = ctx.createBiquadFilter();
  roarBp.type = 'bandpass';
  roarBp.frequency.value = 420;
  roarBp.Q.value = 0.6;
  const roarG = ctx.createGain();
  roarG.gain.value = 0.0;
  roarSrc.connect(roarBp).connect(roarG).connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.35;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.6;
  lfo.connect(lfoG).connect(roarG.gain);
  // crackle (sparse sharp pops, typical of big rocket engines), kept soft
  const crackle = makeBuffer(3, (d, sr) => {
    for (let i = 0; i < d.length; i++) d[i] = 0;
    const pops = 3 * 260;
    for (let k = 0; k < pops; k++) {
      const at = Math.floor(Math.random() * (d.length - 400));
      const amp = (0.3 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1);
      const dec = 40 + Math.random() * 160;
      for (let j = 0; j < 400; j++) d[at + j] += amp * Math.exp(-j / dec) * (Math.random() * 0.6 + 0.4);
    }
  });
  const crackSrc = loop(crackle);
  const crackHp = ctx.createBiquadFilter();
  crackHp.type = 'bandpass';
  crackHp.frequency.value = 1500;
  crackHp.Q.value = 0.5;
  const crackLp = ctx.createBiquadFilter(); // no harsh highs
  crackLp.type = 'lowpass';
  crackLp.frequency.value = 3500;
  const crackG = ctx.createGain();
  crackG.gain.value = 0;
  crackSrc.connect(crackHp).connect(crackLp).connect(crackG).connect(out);
  // sub-bass (felt more than heard)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 41;
  const sub2 = ctx.createOscillator();
  sub2.type = 'sine';
  sub2.frequency.value = 58;
  const subG = ctx.createGain();
  subG.gain.value = 0;
  sub.connect(subG);
  sub2.connect(subG);
  subG.connect(out);
  const srcs = [rumbleSrc, roarSrc, crackSrc, lfo, sub, sub2];
  srcs.forEach((n) => n.start());
  return { out, rumbleLp, roarG, roarBp, crackG, subG, srcs };
}

// Soft low "whump" when the engine ignites.
function ignitionThump() {
  const t0 = now();
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t0);
  o.frequency.exponentialRampToValueAtTime(38, t0 + 0.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + 1.3);
}

export function hasLaunchSound() { return !!(launchFile && launchFile.buffer); }

// The liftoff file is decoded in memory so that it can loop without any gap
// (a short "seamless" loop works as well as a full liftoff recording).
export function preloadSounds() {
  if (launchFile) return;
  launchFile = { buffer: null, ok: null, src: null, out: null };
  unlockAudio(); // creates the audio context (it may stay paused until a touch)
  fetch('sons/decollage.mp3')
    .then((r) => { if (!r.ok) throw new Error('no file'); return r.arrayBuffer(); })
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .then((buffer) => { launchFile.buffer = buffer; launchFile.ok = true; })
    .catch(() => { launchFile.ok = false; });
}

let engineOn = false;
let usingFile = false;

/**
 * Engine sound during the launch.
 *   envelope: 0..1 overall level (0 before ignition, fades to 0 in space)
 *   thrust:   0..1 how hard the engine pushes
 */
export function setEngine(envelope, thrust = envelope) {
  if (!ctx) return;
  if (!engineOn && envelope > 0.001) {
    engineOn = true;
    preloadSounds();
    usingFile = !!(launchFile && launchFile.buffer);
    if (usingFile) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = launchFile.buffer;
        src.loop = true;
        const lp = ctx.createBiquadFilter(); // soften harsh highs (hyperacusis)
        lp.type = 'lowpass';
        lp.frequency.value = 5000;
        const { out } = engineChain();
        src.connect(lp).connect(out);
        src.start();
        launchFile.src = src;
        launchFile.out = out;
      } catch (e) {
        usingFile = false;
      }
    }
    if (!usingFile) engine = startSynthEngine();
    ignitionThump();
  }
  if (!engineOn) return;
  const t = now();
  if (usingFile) {
    // the recording gets louder with the thrust: soft at ignition, full at lift-off
    launchFile.out.gain.setTargetAtTime(envelope * (0.3 + 0.7 * thrust) * 0.5, t, 0.5);
  } else if (engine) {
    const e = engine;
    // Phone speakers barely play below ~250 Hz: the "roar" in the mid
    // frequencies carries the sound; the deep layers add weight on headphones.
    e.out.gain.setTargetAtTime(envelope * 0.8, t, 0.35);
    e.rumbleLp.frequency.setTargetAtTime(220 + thrust * 380, t, 0.4);
    e.roarG.gain.setTargetAtTime(1.6 + thrust * 2.6, t, 0.4);
    e.roarBp.frequency.setTargetAtTime(480 + thrust * 420, t, 0.6);
    e.crackG.gain.setTargetAtTime(thrust > 0.9 ? 0.5 : thrust * 0.12, t, 0.5);
    e.subG.gain.setTargetAtTime(0.05 + thrust * 0.07, t, 0.4);
  }
  if (envelope <= 0.001) stopEngine();
}

export function stopEngine() {
  if (!engineOn) return;
  engineOn = false;
  if (launchFile && launchFile.src) {
    const { src, out } = launchFile;
    launchFile.src = null;
    out.gain.setTargetAtTime(0, now(), 0.4);
    setTimeout(() => { try { src.stop(); } catch (e) { /* ignore */ } }, 2500);
  }
  if (engine) {
    const e = engine;
    engine = null;
    e.out.gain.setTargetAtTime(0, now(), 0.4);
    setTimeout(() => e.srcs.forEach((n) => { try { n.stop(); } catch (err) { /* ignore */ } }), 2500);
  }
}

// Very quiet ambient "space" pad: slowly changing soft chords.
export function setMusic(on) {
  if (!ctx) return;
  if (on && !music) {
    const chords = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 66]];
    const voices = [0, 1, 2, 3].map(() => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      o.connect(lp);
      o2.connect(lp);
      lp.connect(g).connect(musicGain);
      o.start();
      o2.start();
      return { o, o2 };
    });
    let i = 0;
    const step = () => {
      const c = chords[i++ % chords.length];
      voices.forEach((v, k) => {
        v.o.frequency.setTargetAtTime(NOTE(c[k]), now(), 1.5);
        v.o2.frequency.setTargetAtTime(NOTE(c[k]) * 1.003, now(), 1.5);
      });
    };
    step();
    music = { voices, timer: setInterval(step, 7000) };
    musicGain.gain.setTargetAtTime(0.35, now(), 2.0);
  } else if (!on && music) {
    const m = music;
    music = null;
    musicGain.gain.setTargetAtTime(0, now(), 0.8);
    clearInterval(m.timer);
    setTimeout(() => m.voices.forEach((v) => { try { v.o.stop(); v.o2.stop(); } catch (e) { /* ignore */ } }), 4000);
  }
}

// ---------------------------------------------------------------------------
// Music files (optional): web/musique/accueil.mp3, voyage.mp3, victoire.mp3
// If a file is missing, the soft synthesized pad is used instead (home and
// travel) or nothing (victory, which already has its little bell melody).
// ---------------------------------------------------------------------------
const TRACKS = {
  accueil: { loop: true, level: 0.4, fallbackPad: true },
  voyage: { loop: true, level: 0.32, fallbackPad: true },
  victoire: { loop: false, level: 0.5, fallbackPad: false },
};
const trackState = {};
let currentTrack = null;

function getTrack(name) {
  let st = trackState[name];
  if (st) return st;
  const el = new Audio();
  el.preload = 'auto';
  el.loop = TRACKS[name].loop;
  st = { el, ok: null, gain: null, node: null };
  el.addEventListener('canplay', () => { if (st.ok === null) st.ok = true; });
  el.addEventListener('error', () => {
    st.ok = false;
    if (currentTrack === name && TRACKS[name].fallbackPad) setMusic(true);
  });
  el.src = `musique/${name}.mp3`;
  trackState[name] = st;
  return st;
}

// Start loading the files early so that we know which ones exist.
export function preloadMusic() {
  Object.keys(TRACKS).forEach(getTrack);
}

export function hasTrack(name) {
  return !!(trackState[name] && trackState[name].ok);
}

/** Play one of the music tracks ('accueil' | 'voyage' | 'victoire'), or null for silence. */
export function playMusic(name) {
  unlockAudio();
  if (!ctx) return;
  if (name === currentTrack) {
    const st = name && trackState[name];
    if (st && st.ok === false && TRACKS[name].fallbackPad) setMusic(true);
    return;
  }
  // fade out what is playing
  if (currentTrack) {
    const old = trackState[currentTrack];
    if (old && old.gain) {
      old.gain.gain.setTargetAtTime(0, now(), 0.5);
      const el = old.el;
      setTimeout(() => { if (currentTrack !== old.name) el.pause(); }, 2500);
    }
  }
  setMusic(false);
  currentTrack = name;
  if (!name) return;
  const st = getTrack(name);
  st.name = name;
  if (st.ok === false) {
    if (TRACKS[name].fallbackPad) setMusic(true);
    return;
  }
  if (!st.node) {
    try {
      st.node = ctx.createMediaElementSource(st.el);
      st.gain = ctx.createGain();
      st.node.connect(st.gain).connect(trackBus);
    } catch (e) {
      st.ok = false;
      if (TRACKS[name].fallbackPad) setMusic(true);
      return;
    }
  }
  st.gain.gain.cancelScheduledValues(now());
  st.gain.gain.setValueAtTime(0, now());
  st.gain.gain.setTargetAtTime(TRACKS[name].level, now(), name === 'victoire' ? 0.05 : 0.8);
  try { st.el.currentTime = 0; } catch (e) { /* not loaded yet */ }
  st.el.play().catch(() => {
    // autoplay blocked (browser) or file missing
    if (st.ok === false && TRACKS[name].fallbackPad && currentTrack === name) setMusic(true);
  });
}

// For tests: what is playing right now.
export function audioState() {
  const st = currentTrack && trackState[currentTrack];
  return {
    music: currentTrack,
    musicPlaying: !!(st && !st.el.paused),
    pad: !!music,
    engine: engineOn ? (usingFile ? 'file' : 'synth') : null,
    launchFilePlaying: !!(launchFile && launchFile.src),
  };
}
