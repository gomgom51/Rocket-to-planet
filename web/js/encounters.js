// Little surprises between two planets: shooting stars to catch, a comet,
// a space station to wave at, a friendly ship, asteroids.
// Each encounter is an async function (travel scene, api) that ends by itself;
// nothing can be failed, taps only add fun and stars.

import { THREE, createPlanet } from './gfx.js';
import { createShootingStar, createStation, createFriendlyShip, rockGeometry, glowSprite } from './models.js';
import { PLANETS, TEXT } from './data.js';
import { smooth } from './util.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Objects placed in camera space (x right, y up, -z forward) every frame.
function follow(ts, obj, local) {
  obj.userData.local = local;
  ts.fx.add(obj);
  return obj;
}

// Screen position (CSS pixels) of a world position.
function toScreen(ts, worldPos) {
  const v = worldPos.clone().project(ts.camera);
  return { x: (v.x + 1) / 2 * ts.width, y: (1 - v.y) / 2 * ts.height, front: v.z < 1 };
}

// Sparkle burst at a world position.
function burst(ts, pos, color = 0xffd27a) {
  for (let i = 0; i < 10; i++) {
    const s = glowSprite(color, 0.6 + Math.random() * 0.6, 1);
    s.position.copy(pos);
    const dir = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 5);
    ts.addTimed(s, 0.9, (k, o, t, dt) => {
      o.position.addScaledVector(dir, dt * (1 - k));
      o.material.opacity = 1 - k;
    });
  }
}

// ---------------------------------------------------------------------------
export async function shootingStars(ts, api) {
  api.banner(TEXT.starsIntro);
  api.speak(TEXT.starsIntro);
  const live = [];
  let caught = 0;
  ts.setTapHandler((x, y) => {
    let best = null;
    let bestD = 95;
    for (const st of live) {
      if (st.caught) continue;
      const p = toScreen(ts, st.obj.getWorldPosition(V3()));
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = st; }
    }
    if (best) {
      best.caught = true;
      caught++;
      burst(ts, best.obj.getWorldPosition(V3()));
      api.sfx.catchStar();
      api.addStars(1, x, y);
      best.obj.visible = false;
    }
  });
  const total = 6;
  for (let i = 0; i < total; i++) {
    const obj = createShootingStar();
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sx = -dir * (3 + Math.random() * 4);
    const sy = 7 + Math.random() * 8;
    const from = V3(sx, sy, -40);
    const to = V3(sx + dir * 12, sy - 7, -40);
    const st = { obj, caught: false };
    live.push(st);
    follow(ts, obj, from.clone());
    const trail = obj.userData.trail;
    ts.addTimed(obj, 5.2, (k, o, t, dt) => {
      const p = from.clone().lerp(to, k);
      obj.userData.local.copy(p);
      trail.forEach((t, j) => {
        t.position.set(-dir * (j + 1) * 0.55, (j + 1) * 0.32, 0);
        t.material.opacity = (0.5 - j * 0.07) * (1 - k * 0.5);
      });
      obj.userData.star.material.rotation += dt * 3;
      const tw = 2.6 + Math.sin(k * 40) * 0.3;
      obj.userData.star.scale.set(tw, tw, 1);
    });
    await api.wait(0.85);
  }
  await api.wait(5);
  ts.setTapHandler(null);
  api.hideBanner();
  await api.speak(TEXT.starsEnd(caught));
}

// ---------------------------------------------------------------------------
export async function comet(ts, api) {
  const def = PLANETS.comet;
  const c = createPlanet(def, api.textures.cometSmall, { radius: 1.6, segments: 40 });
  c.setSun(V3(-1, -0.35, 0.25)); // tail trailing behind its motion
  const obj = follow(ts, c.group, V3());
  api.banner(TEXT.comet);
  api.speak(TEXT.comet);
  const from = V3(16, 18, -120);
  const to = V3(-26, 8, -110);
  await ts.addTimed(obj, 9, (k, o, t, dt) => {
    obj.userData.local.copy(from).lerp(to, k);
    c.update(dt);
  }, () => c.dispose());
  api.hideBanner();
}

// ---------------------------------------------------------------------------
export async function station(ts, api) {
  const st = createStation();
  st.scale.setScalar(1.4);
  st.rotation.set(0.5, 0.6, 0.15);
  const obj = follow(ts, st, V3());
  api.banner(TEXT.station);
  api.speak(TEXT.station);
  let waved = false;
  const wave = () => {
    if (waved) return;
    waved = true;
    st.userData.wave();
    api.sfx.hello();
    api.addStars(1);
    api.hideButton();
    api.banner(TEXT.stationReply);
    api.speak(TEXT.stationReply);
  };
  api.showButton(TEXT.wave, wave);
  ts.setTapHandler((x, y) => {
    const p = toScreen(ts, st.getWorldPosition(V3()));
    if (Math.hypot(p.x - x, p.y - y) < 150) wave();
  });
  const from = V3(7, 6, -70);
  const to = V3(9, 3, -12);
  await ts.addTimed(obj, 11, (k, o, t, dt) => {
    obj.userData.local.copy(from).lerp(to, smooth(k));
    st.userData.update(dt);
  });
  ts.setTapHandler(null);
  api.hideButton();
  api.hideBanner();
}

// ---------------------------------------------------------------------------
export async function ship(ts, api) {
  const sh = createFriendlyShip();
  sh.scale.setScalar(1.3);
  const obj = follow(ts, sh, V3(-16, 5, -26));
  api.banner(TEXT.ship);
  api.speak(TEXT.ship);
  let taps = 0;
  ts.setTapHandler((x, y) => {
    const p = toScreen(ts, sh.getWorldPosition(V3()));
    if (Math.hypot(p.x - x, p.y - y) < 120) {
      sh.userData.pirouette();
      api.sfx.melody();
      if (taps < 3) api.addStars(1, x, y);
      taps++;
      if (taps === 1) api.banner(TEXT.shipTap());
    }
  });
  const hover = V3(-3.2, 5.5, -22);
  await ts.addTimed(obj, 11, (k, o, t, dt) => {
    let p;
    if (k < 0.18) p = V3(-16, 5, -26).lerp(hover, smooth(k / 0.18));
    else if (k < 0.82) p = hover.clone().add(V3(Math.sin(t * 1.3) * 1.2, Math.sin(t * 2.1) * 0.6, 0));
    else p = hover.clone().lerp(V3(18, 12, -60), smooth((k - 0.82) / 0.18));
    obj.userData.local.copy(p);
    sh.userData.update(dt);
  });
  ts.setTapHandler(null);
  api.hideBanner();
}

// ---------------------------------------------------------------------------
export async function asteroids(ts, api) {
  const n = 46;
  const geo = rockGeometry(3.3, 1, 0.32);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7d746a, roughness: 1, flatShading: true });
  const inst = new THREE.InstancedMesh(geo, mat, n);
  const rocks = [];
  for (let i = 0; i < n; i++) {
    let x;
    let y;
    do { x = (Math.random() - 0.5) * 60; y = (Math.random() - 0.5) * 50; } while (Math.hypot(x, y) < 9);
    rocks.push({ x, y, z: -60 - Math.random() * 260, s: 0.6 + Math.random() * 2.2, r: V3(Math.random(), Math.random(), Math.random()), a: Math.random() * 6 });
  }
  inst.frustumCulled = false;
  const obj = follow(ts, inst, V3());
  obj.userData.camAligned = true;
  api.banner(TEXT.asteroids);
  api.speak(TEXT.asteroids);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  await ts.addTimed(obj, 9, (k, o, t, dt) => {
    obj.userData.local.set(0, 0, 0);
    rocks.forEach((r, i) => {
      r.z += dt * 45;
      r.a += dt * 0.6;
      q.setFromAxisAngle(r.r.clone().normalize(), r.a);
      m.compose(V3(r.x, r.y, r.z), q, V3(r.s, r.s, r.s));
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
  }, () => { geo.dispose(); mat.dispose(); });
  api.hideBanner();
}

export const ENCOUNTERS = { shootingStars, comet, station, ship, asteroids };
