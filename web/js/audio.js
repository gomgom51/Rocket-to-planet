// Gentle synthesized sounds (Web Audio API). No sudden loud noises:
// children with Williams syndrome are often sensitive to sound (hyperacusis),
// so everything fades in/out softly and the master volume stays moderate.

import { settings } from './settings.js';

let ctx = null;
let master = null;
let musicGain = null;
let rumble = null;
let music = null;

function now() { return ctx.currentTime; }

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    applyVolume();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function applyVolume() {
  if (!master) return;
  const v = settings.sound ? settings.volume : 0;
  master.gain.setTargetAtTime(v * 0.7, now(), 0.05);
}

export function suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

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

// Rocket engine rumble: level 0..1, changed smoothly.
export function setRumble(level) {
  if (!ctx) return;
  if (!rumble && level > 0) {
    const src = noiseSource(10);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 140;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(master);
    src.start();
    rumble = { src, f, g };
  }
  if (rumble) {
    rumble.g.gain.setTargetAtTime(level * 0.55, now(), 0.35);
    rumble.f.frequency.setTargetAtTime(110 + level * 260, now(), 0.4);
    if (level <= 0) {
      const r = rumble;
      rumble = null;
      setTimeout(() => { try { r.src.stop(); } catch (e) { /* ignore */ } }, 2500);
    }
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
