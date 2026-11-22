// Activities on arrival: Mars (rover picks up rocks), Saturn (catch ice
// crystals in the rings), the Moon (plant a flag, jump in low gravity).
// Each scene has run(api), update(dt), resize(w, h), onTap(x, y).

import { THREE, createSky, createPlanet, createRocket } from './gfx.js';
import { createRover, createAstronaut, createFlag, createCrystal, rockGeometry, glowSprite } from './models.js';
import { PLANETS, TEXT, NUMBERS, faceRotation } from './data.js';
import { tween, wait, clamp, lerp, smooth, easeInOutCubic, easeOutCubic } from './util.js';
import { getStyle } from './progress.js';
import { settings } from './settings.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function groundTex(base, spots, size = 512, repeat = 24, craters = false) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    const [r, gg, b, a] = spots[Math.floor(Math.random() * spots.length)];
    g.fillStyle = `rgba(${r},${gg},${b},${a * (0.5 + Math.random() * 0.5)})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * (i < 200 ? 18 : 5), 0, Math.PI * 2);
    g.fill();
  }
  if (craters) {
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 6 + Math.random() * 30;
      const grd = g.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.2, x, y, r);
      grd.addColorStop(0, 'rgba(60,60,60,0.35)');
      grd.addColorStop(0.8, 'rgba(90,90,90,0.15)');
      grd.addColorStop(0.95, 'rgba(235,235,235,0.35)');
      grd.addColorStop(1, 'rgba(235,235,235,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

function skyDome(top, horizon) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(top) }, uHorizon: { value: new THREE.Color(horizon) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
      void main(){ float h = max(normalize(vDir).y, 0.0); gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.5)), 1.0);
      #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  mesh.renderOrder = -20;
  return mesh;
}

class BaseActivity {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
    this.width = 1;
    this.height = 1;
    this.timed = [];
    this.tapHandler = null;
    this.raycaster = new THREE.Raycaster();
    this.t = 0;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  onTap(x, y) { if (this.tapHandler) this.tapHandler(x, y); }

  toScreen(p) {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * this.width, y: (1 - v.y) / 2 * this.height };
  }

  ray(x, y) {
    this.raycaster.setFromCamera(new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1), this.camera);
    return this.raycaster.ray;
  }

  addTimed(obj, d, fn) {
    if (obj && !obj.parent) this.scene.add(obj);
    return new Promise((resolve) => this.timed.push({ obj, d, t: 0, fn, resolve }));
  }

  puff(pos, color = 0xcfa483, n = 8) {
    for (let i = 0; i < n; i++) {
      const s = glowSprite(color, 0.5, 0.7);
      s.position.copy(pos);
      const dir = V3(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5).normalize().multiplyScalar(1 + Math.random());
      this.addTimed(s, 1.4, (k, o, dt) => {
        o.position.addScaledVector(dir, dt);
        const sc = 0.5 + k * 1.6;
        o.scale.set(sc, sc, 1);
        o.material.opacity = 0.7 * (1 - k);
      });
    }
  }

  sparkle(pos, color = 0xffe08a) {
    for (let i = 0; i < 10; i++) {
      const s = glowSprite(color, 0.4 + Math.random() * 0.4, 1);
      s.position.copy(pos);
      const dir = V3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 3);
      this.addTimed(s, 0.9, (k, o, dt) => {
        o.position.addScaledVector(dir, dt * (1 - k));
        o.material.opacity = 1 - k;
      });
    }
  }

  updateTimed(dt) {
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const e = this.timed[i];
      if (!e) continue;
      e.t += dt;
      const k = Math.min(1, e.t / e.d);
      if (e.fn) e.fn(k, e.obj, dt, e.t);
      if (k >= 1) {
        this.timed.splice(this.timed.indexOf(e), 1);
        if (e.obj && e.obj.parent && !e.keep) e.obj.parent.remove(e.obj);
        e.resolve();
      }
    }
  }

  // Remind the child what to do if nothing happens for a while.
  idleReminder(api, text, isDone) {
    this.lastTap = this.t;
    (async () => {
      while (!isDone()) {
        await wait(11);
        if (!isDone() && this.t - this.lastTap > 10) api.speak(text);
      }
    })();
  }

  styledRocket() {
    return createRocket(getStyle(), settings.name.trim());
  }
}

// ===========================================================================
// MARS: help the rover pick up shiny rocks
// ===========================================================================
export class MarsActivity extends BaseActivity {
  constructor(assets) {
    super();
    this.scene.add(skyDome(0xb98a6e, 0xe2b48c));
    this.scene.fog = new THREE.Fog(0xe2b48c, 25, 260);
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
    sun.position.set(-30, 40, 25);
    this.scene.add(sun, new THREE.HemisphereLight(0xf0c8a0, 0x6a3a22, 0.9));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ map: groundTex('#b5643a', [[150, 70, 40, 0.5], [190, 110, 70, 0.4], [110, 50, 30, 0.5], [210, 140, 100, 0.3]]), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    // hills and boulders
    const hillMat = new THREE.MeshStandardMaterial({ color: 0xa8603c, roughness: 1, flatShading: true });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const d = 90 + Math.random() * 120;
      const h = 8 + Math.random() * 20;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(40 + Math.random() * 50, h, 7), hillMat);
      hill.position.set(Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d - 40);
      this.scene.add(hill);
    }
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x7a3e26, roughness: 1, flatShading: true });
    for (let i = 0; i < 40; i++) {
      const b = new THREE.Mesh(rockGeometry(Math.random() * 50, 1, 0.35), boulderMat);
      const s = 0.15 + Math.random() * 0.6;
      b.scale.setScalar(s);
      const x = (Math.random() - 0.5) * 40;
      const z = -4 - Math.random() * 40;
      if (Math.abs(x) < 4 && z > -9) continue;
      b.position.set(x, s * 0.3, z);
      b.rotation.y = Math.random() * 6;
      this.scene.add(b);
    }
    this.rocket = this.styledRocket();
    this.rocket.position.set(-3.2, 0.4, -15);
    this.scene.add(this.rocket);
    this.rover = createRover();
    this.scene.add(this.rover);
    this.camera.position.set(0.6, 3.6, 7.5);
    this.camera.lookAt(0, 0.4, -2.2);
  }

  reset() {
    this.timed = [];
    this.rocket.userData.applyStyle(getStyle(), settings.name.trim());
    this.rover.position.set(0, 0, 1.2);
    this.rover.rotation.y = Math.PI / 2; // facing away from the camera
    (this.rocks || []).forEach((r) => this.scene.remove(r.obj));
    const colors = [0x6fd0ff, 0xffd34a, 0x9b7bff, 0x7dff9a, 0xff8ab8];
    // place the rocks from screen positions so they are always visible
    this.update(0);
    this.camera.updateMatrixWorld();
    const screenSpots = [[-0.55, -0.42], [0.5, -0.3], [-0.4, -0.05], [0.45, 0.06], [-0.05, 0.2]];
    const plane = new THREE.Plane(V3(0, 1, 0), 0);
    const spots = screenSpots.map(([nx, ny]) => {
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
      const hit = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, hit);
      return [hit.x, hit.z];
    });
    this.rocks = spots.map(([x, z], i) => {
      const obj = new THREE.Group();
      const m = new THREE.Mesh(rockGeometry(i * 7.3, 0, 0.25), new THREE.MeshStandardMaterial({
        color: colors[i], emissive: colors[i], emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.3, flatShading: true,
      }));
      m.scale.setScalar(0.32);
      m.position.y = 0.22;
      const glow = glowSprite(colors[i], 1.4, 0.55);
      glow.position.y = 0.3;
      obj.add(m, glow);
      obj.position.set(x, 0, z);
      this.scene.add(obj);
      return { obj, mesh: m, taken: false };
    });
  }

  async run(api) {
    this.reset();
    api.banner(TEXT.roverIntro);
    api.speak(TEXT.roverIntro);
    let count = 0;
    let busy = false;
    const total = this.rocks.length;
    this.idleReminder(api, 'Touche un caillou qui brille !', () => count >= total);
    await new Promise((resolve) => {
      this.tapHandler = async (x, y) => {
        if (busy) return;
        this.lastTap = this.t;
        let best = null;
        let bestD = 110;
        for (const r of this.rocks) {
          if (r.taken) continue;
          const p = this.toScreen(r.obj.position.clone().add(V3(0, 0.3, 0)));
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < bestD) { bestD = d; best = r; }
        }
        if (!best) return;
        busy = true;
        best.taken = true;
        await this.driveTo(best);
        count++;
        api.sfx.catchStar();
        api.addStars(1, x, y);
        api.speak(`${NUMBERS[count]} !`, { silentWait: false });
        busy = false;
        if (count >= total) { this.tapHandler = null; resolve(); }
      };
    });
    await wait(0.8);
    api.banner(TEXT.roverEnd);
    await api.speak(TEXT.roverEnd);
  }

  async driveTo(rock) {
    const rv = this.rover;
    const target = rock.obj.position.clone();
    const from = rv.position.clone();
    const dir = target.clone().sub(from).setY(0);
    const dist = Math.max(0, dir.length() - 1.0);
    dir.normalize();
    const heading = Math.atan2(-dir.z, dir.x);
    let h0 = rv.rotation.y;
    let h1 = heading;
    while (h1 - h0 > Math.PI) h1 -= Math.PI * 2;
    while (h1 - h0 < -Math.PI) h1 += Math.PI * 2;
    await tween(0.5, (k) => { rv.rotation.y = lerp(h0, h1, k); }, smooth);
    const end = from.clone().addScaledVector(dir, dist);
    let last = 0;
    await tween(0.35 + dist * 0.28, (k) => {
      rv.position.lerpVectors(from, end, k);
      rv.userData.roll((k - last) * dist);
      last = k;
    }, easeInOutCubic);
    // arm down, rock flies into the rover
    const arm = rv.userData.arm;
    await tween(0.3, (k) => { arm.rotation.z = lerp(-0.5, -1.1, k); });
    this.sparkle(rock.obj.position.clone().add(V3(0, 0.3, 0)));
    const p0 = rock.obj.position.clone();
    await tween(0.6, (k) => {
      rock.obj.position.lerpVectors(p0, rv.position.clone().add(V3(0, 0.9, 0)), k);
      rock.obj.position.y += Math.sin(k * Math.PI) * 0.8;
      rock.obj.scale.setScalar(1 - k * 0.8);
    }, easeOutCubic);
    rock.obj.visible = false;
    await tween(0.3, (k) => { arm.rotation.z = lerp(-1.1, -0.5, k); });
  }

  update(dt) {
    this.t += dt;
    this.rocks && this.rocks.forEach((r, i) => {
      if (!r.taken) {
        r.mesh.rotation.y += dt * 0.8;
        r.mesh.position.y = 0.22 + Math.sin(this.t * 2 + i) * 0.04;
      }
    });
    this.rocket.userData.setThrust(0);
    this.rocket.userData.update(dt);
    this.updateTimed(dt);
    // the camera follows the rover a little
    const look = V3(this.rover.position.x * 0.5, 0.4, this.rover.position.z * 0.5 - 2.2);
    this.camera.position.set(0.6 + this.rover.position.x * 0.3, 3.6, 7.5 + this.rover.position.z * 0.3);
    this.camera.lookAt(look);
  }
}

// ===========================================================================
// SATURN: fly through the rings and catch ice crystals
// ===========================================================================
export class RingsActivity extends BaseActivity {
  constructor(assets) {
    super();
    this.camera.far = 6000;
    this.sky = createSky(assets.milkyway, { radius: 2500 });
    this.scene.add(this.sky);
    this.sunDir = V3(0.55, 0.5, 0.65).normalize();
    const light = new THREE.DirectionalLight(0xffffff, 3.0);
    light.position.copy(this.sunDir).multiplyScalar(100);
    this.scene.add(light, new THREE.AmbientLight(0x8090b0, 0.3));
    this.assets = assets;
    // ring particles around the camera, streaming towards it
    const n = 1400;
    this.chunks = [];
    const geo = rockGeometry(9.1, 0, 0.3);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: 0.9, flatShading: true });
    this.inst = new THREE.InstancedMesh(geo, mat, n);
    this.inst.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      this.chunks.push({
        x: (Math.random() - 0.5) * 90, y: -1.2 - Math.random() * 2.5 + (Math.random() < 0.15 ? Math.random() * 3 : 0),
        z: -Math.random() * 260 + 20, s: 0.05 + Math.random() ** 3 * 0.9, a: Math.random() * 6, r: V3(Math.random(), Math.random(), Math.random()).normalize(),
      });
    }
    this.scene.add(this.inst);
    this.rocket = this.styledRocket();
    this.rocket.rotation.x = -Math.PI / 2;
    this.rocket.rotation.y = 1.0;
    this.rocket.position.set(0.7, 0.6, 1.5);
    this.rocket.scale.setScalar(0.8);
    this.scene.add(this.rocket);
    this.camera.position.set(2.2, 2.6, 8.5);
    this.camera.lookAt(-0.6, 1.4, -12);
    this.crystals = [];
  }

  async loadSaturn() {
    if (this.saturn) return;
    const tex = this.assets.saturnTex;
    this.saturn = createPlanet(PLANETS.saturn, tex, { radius: 150, segments: 96, ringTex: this.assets.rings });
    this.saturn.group.position.set(-90, 170, -900);
    this.saturn.group.rotation.set(0.32, 0, 0.2);
    this.saturn.setSun(this.sunDir);
    this.scene.add(this.saturn.group);
  }

  reset() {
    this.timed = [];
    this.crystals.forEach((c) => this.scene.remove(c.obj));
    this.crystals = [];
    this.rocket.userData.applyStyle(getStyle(), settings.name.trim());
  }

  async run(api) {
    await this.loadSaturn();
    this.reset();
    api.banner(TEXT.ringsIntro);
    api.speak(TEXT.ringsIntro);
    let caught = 0;
    const total = 6;
    this.idleReminder(api, 'Touche les cristaux qui brillent !', () => caught >= total);
    this.tapHandler = (x, y) => {
      this.lastTap = this.t;
      let best = null;
      let bestD = 100;
      for (const c of this.crystals) {
        if (c.caught) continue;
        const p = this.toScreen(c.obj.position);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (!best || caught >= total) return;
      best.caught = true;
      best.obj.visible = false;
      caught++;
      this.sparkle(best.obj.position, 0x9fe6ff);
      api.sfx.catchStar();
      api.addStars(1, x, y);
      api.speak(`${NUMBERS[caught]} !`, { silentWait: false });
    };
    while (caught < total) {
      this.spawnCrystal();
      await wait(1.5);
    }
    this.tapHandler = null;
    await wait(0.6);
    api.banner(TEXT.ringsEnd);
    await api.speak(TEXT.ringsEnd);
  }

  spawnCrystal() {
    const obj = createCrystal();
    obj.position.set((Math.random() - 0.5) * 9 - 0.6, 1.2 + Math.random() * 4.5, -70);
    this.scene.add(obj);
    this.crystals.push({ obj, caught: false });
  }

  update(dt) {
    this.t += dt;
    const speed = 16;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this.chunks.forEach((c, i) => {
      c.z += speed * dt;
      if (c.z > 25) c.z -= 280;
      c.a += dt * 0.4;
      q.setFromAxisAngle(c.r, c.a);
      m.compose(V3(c.x, c.y, c.z), q, V3(c.s, c.s, c.s));
      this.inst.setMatrixAt(i, m);
    });
    this.inst.instanceMatrix.needsUpdate = true;
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.obj.position.z += speed * dt;
      c.obj.userData.mesh.rotation.y += dt * 1.5;
      if (c.obj.position.z > 12) {
        this.scene.remove(c.obj);
        this.crystals.splice(i, 1);
      }
    }
    if (this.saturn) this.saturn.update(dt * 0.3);
    this.rocket.userData.setThrust(0.8);
    this.rocket.userData.update(dt);
    this.rocket.position.y = 0.6 + Math.sin(this.t * 0.8) * 0.12;
    this.updateTimed(dt);
    this.camera.position.set(2.2 + Math.sin(this.t * 0.3) * 0.15, 2.6, 8.5);
    this.camera.lookAt(-0.6, 1.4, -12);
    this.sky.position.copy(this.camera.position);
  }
}

// ===========================================================================
// MOON: plant a flag, then jump in low gravity
// ===========================================================================
export class MoonActivity extends BaseActivity {
  constructor(assets) {
    super();
    this.sky = createSky(assets.milkyway, { radius: 800 });
    this.scene.add(this.sky);
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-20, 18, 12);
    this.scene.add(sun, new THREE.AmbientLight(0x8a90a0, 0.25));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ map: groundTex('#8d8c88', [[120, 120, 118, 0.5], [160, 160, 156, 0.4], [90, 90, 88, 0.5]], 512, 30, true), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.ground = ground;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8984, roughness: 1, flatShading: true });
    for (let i = 0; i < 30; i++) {
      const b = new THREE.Mesh(rockGeometry(Math.random() * 40, 1, 0.3), rockMat);
      const s = 0.1 + Math.random() * 0.5;
      b.scale.setScalar(s);
      const x = (Math.random() - 0.5) * 36;
      const z = -3 - Math.random() * 40;
      if (Math.abs(x) < 3 && z > -6) continue;
      b.position.set(x, s * 0.25, z);
      this.scene.add(b);
    }
    // the Earth in the black sky
    this.earth = createPlanet(PLANETS.earth, assets.small.earth, { radius: 14, segments: 48 });
    this.earth.group.position.set(-26, 52, -240);
    this.earth.setSun(V3(-1, 0.6, 0.4).normalize());
    this.earth.body.rotation.y = faceRotation(PLANETS.earth);
    this.scene.add(this.earth.group);
    this.rocket = this.styledRocket();
    this.rocket.position.set(2.4, 0.4, -6);
    this.scene.add(this.rocket);
    this.astro = createAstronaut();
    this.scene.add(this.astro);
    this.camera.position.set(0, 2.3, 6.8);
    this.camera.lookAt(0, 1.1, -0.5);
  }

  reset() {
    this.timed = [];
    this.rocket.userData.applyStyle(getStyle(), settings.name.trim());
    if (this.flag) this.scene.remove(this.flag);
    this.flag = null;
    this.astro.position.set(0.1, 0, 0.6);
    this.astro.rotation.y = 0.15;
  }

  async run(api) {
    this.reset();
    api.banner(TEXT.flagIntro);
    api.speak(TEXT.flagIntro);
    // 1. plant the flag where the ground is touched
    let planted = false;
    this.idleReminder(api, 'Touche le sol pour planter ton drapeau !', () => planted);
    await new Promise((resolve) => {
      this.tapHandler = (x, y) => {
        this.lastTap = this.t;
        const ray = this.ray(x, y);
        const hit = new THREE.Vector3();
        if (!ray.intersectPlane(new THREE.Plane(V3(0, 1, 0), 0), hit)) return;
        if (hit.distanceTo(this.camera.position) > 22) hit.copy(ray.origin.clone().add(ray.direction.clone().multiplyScalar(14))).setY(0);
        hit.x = clamp(hit.x, -3.5, 3.5);
        hit.z = clamp(hit.z, -6, 2.5);
        if (hit.distanceTo(this.astro.position) < 0.8) hit.x += 1.1;
        planted = true;
        this.tapHandler = null;
        this.plantFlag(hit, api).then(resolve);
        api.addStars(1, x, y);
      };
    });
    api.banner(TEXT.flagDone);
    await api.speak(TEXT.flagDone);
    // 2. jump!
    let jumps = 0;
    let busy = false;
    this.idleReminder(api, 'Touche l’astronaute pour le faire sauter !', () => jumps >= 3);
    await new Promise((resolve) => {
      this.tapHandler = async () => {
        if (busy) return;
        this.lastTap = this.t;
        busy = true;
        jumps++;
        api.speak(TEXT.jump(), { silentWait: false });
        api.sfx.boing();
        if (jumps <= 3) api.addStars(1);
        await this.jump();
        busy = false;
        if (jumps >= 3) { this.tapHandler = null; resolve(); }
      };
    });
    api.banner(TEXT.flagEnd);
    await api.speak(TEXT.flagEnd);
  }

  async plantFlag(pos, api) {
    const flag = createFlag(settings.name.trim());
    flag.position.copy(pos).setY(3);
    this.scene.add(flag);
    this.flag = flag;
    await tween(0.6, (k) => { flag.position.y = lerp(3, -0.2, k * k); });
    this.puff(pos.clone().setY(0.1), 0xbfbfbb, 10);
    api.sfx.good();
  }

  async jump() {
    const a = this.astro;
    const ud = a.userData;
    const y0 = 0;
    const H = 1.7;
    await tween(2.2, (k) => {
      a.position.y = y0 + 4 * H * k * (1 - k);
      const arms = Math.sin(k * Math.PI);
      ud.armL.rotation.z = 0.35 + arms * 1.6;
      ud.armR.rotation.z = -0.35 - arms * 1.6;
      ud.legL.rotation.x = arms * 0.3;
      ud.legR.rotation.x = -arms * 0.3;
    });
    a.position.y = 0;
    this.puff(a.position.clone().setY(0.1), 0xbfbfbb, 8);
  }

  update(dt) {
    this.t += dt;
    if (this.flag) this.flag.userData.update(dt);
    this.earth.update(dt * 0.3);
    this.rocket.userData.setThrust(0);
    this.rocket.userData.update(dt);
    // idle breathing of the astronaut
    if (this.astro.position.y === 0) this.astro.userData.armL.rotation.z = 0.35 + Math.sin(this.t * 1.5) * 0.05;
    this.updateTimed(dt);
    this.sky.position.copy(this.camera.position);
  }
}
