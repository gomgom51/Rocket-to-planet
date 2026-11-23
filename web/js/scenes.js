// The four 3D scenes: home, launch pad, travel through space, victory map.

import {
  THREE, createSky, createPlanet, createRocket, Particles, glowTexture,
  placeAtScreen, distanceForSize,
} from './gfx.js';
import { PLANETS, ORDER, faceRotation, TEXT } from './data.js';
import { getStyle } from './progress.js';
import { settings } from './settings.js';
import { tween, wait, guard, clamp, lerp, smooth, easeOutCubic, easeInCubic, easeInOutCubic } from './util.js';
import { setEngine, sfx } from './audio.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ===========================================================================
// HOME: the Earth seen from orbit, slowly turning
// ===========================================================================
export class HomeScene {
  constructor(assets) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
    this.sky = createSky(assets.milkyway);
    this.scene.add(this.sky);
    this.sun = V3(-0.7, 0.5, 0.5).normalize();
    const light = new THREE.DirectionalLight(0xffffff, 3.0);
    light.position.copy(this.sun).multiplyScalar(100);
    this.scene.add(light, new THREE.AmbientLight(0x8090b0, 0.12));
    this.earth = createPlanet(PLANETS.earth, assets.earth, { radius: 10, segments: 96 });
    this.earth.setSun(this.sun);
    this.earth.body.rotation.y = faceRotation(PLANETS.earth);
    this.scene.add(this.earth.group);
    // a tiny rocket orbiting the Earth
    this.rocket = createRocket(getStyle(), settings.name.trim());
    this.rocket.scale.setScalar(0.32);
    this.rocket.userData.setThrust(0.5);
    this.scene.add(this.rocket);
    this.t = 0;
  }

  restyle() { this.rocket.userData.applyStyle(getStyle(), settings.name.trim()); }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);
    const d = distanceForSize(this.camera, 10, w < h ? 1.25 : 0.75);
    placeAtScreen(this.camera, 0, -1.0, d, this.earth.group.position);
  }

  update(dt) {
    this.t += dt;
    this.earth.update(dt * 0.5);
    this.sky.rotation.y += dt * 0.004;
    // rocket orbit around the Earth (inclined circle)
    const c = this.earth.group.position;
    const a = this.t * 0.25;
    const r = 12.2;
    const n = V3(0.25, 1, 0.5).normalize();
    const e1 = V3(1, 0, 0).projectOnPlane(n).normalize();
    const e2 = V3().crossVectors(n, e1);
    const p = c.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r);
    const vel = e1.clone().multiplyScalar(-Math.sin(a)).addScaledVector(e2, Math.cos(a)).normalize();
    this.rocket.position.copy(p);
    this.rocket.quaternion.setFromUnitVectors(V3(0, 1, 0), vel);
    this.rocket.userData.update(dt);
  }
}

// ===========================================================================
// LAUNCH: launch pad on Earth, countdown, lift-off, up to space
// ===========================================================================
function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#6f7a4a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 14;
    const tone = Math.random();
    g.fillStyle = tone < 0.45 ? `rgba(80,96,52,${0.25 + Math.random() * 0.3})`
      : tone < 0.8 ? `rgba(128,124,80,${0.2 + Math.random() * 0.25})`
        : `rgba(60,70,40,${0.3 + Math.random() * 0.3})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  t.anisotropy = 4;
  return t;
}

function concreteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a3a29c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const v = 120 + Math.floor(Math.random() * 70);
    g.fillStyle = `rgba(${v},${v},${v - 5},0.25)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 1 + Math.random() * 4);
  }
  g.strokeStyle = 'rgba(70,70,70,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

export class LaunchScene {
  constructor(assets) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
    this.horizon = new THREE.Color(0xcfe2f2);
    this.scene.fog = new THREE.Fog(this.horizon.clone(), 40, 900);

    // sky dome (follows the camera)
    this.skyU = {
      uTop: { value: new THREE.Color(0x2a63bd) },
      uHorizon: { value: this.horizon.clone() },
      uFade: { value: 0 },
      uSun: { value: V3(0.55, 0.42, -0.72).normalize() },
    };
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
      uniforms: this.skyU,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform float uFade; uniform vec3 uSun; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = max(d.y, 0.0);
          vec3 c = mix(uHorizon, uTop, pow(h, 0.42));
          float s = max(dot(d, uSun), 0.0);
          c += vec3(1.0, 0.95, 0.85) * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.22) * (1.0 - uFade * 0.6);
          c = mix(c, vec3(0.0, 0.0, 0.01), uFade);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    this.skyDome.renderOrder = -20;
    this.scene.add(this.skyDome);
    this.stars = createSky(assets.milkyway, { radius: 1300 });
    this.scene.add(this.stars);

    // lights
    this.sunLight = new THREE.DirectionalLight(0xfff2dc, 2.8);
    this.sunLight.position.copy(this.skyU.uSun.value).multiplyScalar(60);
    this.hemi = new THREE.HemisphereLight(0xbcd6ff, 0x5b4c34, 1.1);
    this.scene.add(this.sunLight, this.hemi);

    // ground + distant hills
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x55603f, roughness: 1, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const d = 420 + Math.random() * 380;
      const h = 14 + Math.random() * 30;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(110 + Math.random() * 160, h, 9), hillMat);
      hill.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d);
      this.scene.add(hill);
    }

    // launch pad
    const concrete = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.95 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.36, 10), concrete);
    pad.position.y = 0.18;
    this.scene.add(pad);
    const dark = new THREE.MeshStandardMaterial({ color: 0x2d2d2f, roughness: 1 });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.06, 32), dark);
    plate.position.y = 0.38;
    this.scene.add(plate);
    const trench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 4.5), dark);
    trench.position.set(0, 0.37, -2.6);
    this.scene.add(trench);

    // service tower (instanced steel beams)
    this.buildTower();

    // lightning masts
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.5, metalness: 0.6 });
    [[4.6, -4.2], [-4.8, -4.6], [4.4, 4.8]].forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 9.5, 8), mastMat);
      m.position.set(x, 4.75, z);
      this.scene.add(m);
    });

    // rocket
    this.rocket = createRocket(getStyle(), settings.name.trim());
    this.rocketBaseY = 0.38 + 0.4;
    this.scene.add(this.rocket);
    this.engineLight = new THREE.PointLight(0xffa04a, 0, 30, 1.6);
    this.scene.add(this.engineLight);

    this.particles = new Particles(this.scene, 170);
    this.reset();
  }

  buildTower() {
    const beams = [];
    const add = (x, y, z, sx, sy, sz, rx = 0, rz = 0) => beams.push({ x, y, z, sx, sy, sz, rx, rz });
    const tx = -1.32, tz = -0.15, w = 0.72, h = 5.8, step = 0.58;
    for (const cx of [-w / 2, w / 2]) for (const cz of [-w / 2, w / 2]) add(tx + cx, h / 2, tz + cz, 0.075, h, 0.075);
    let alt = 1;
    for (let y = 0.3; y <= h + 0.01; y += step) {
      add(tx, y, tz - w / 2, w, 0.05, 0.05);
      add(tx, y, tz + w / 2, w, 0.05, 0.05);
      add(tx - w / 2, y, tz, 0.05, 0.05, w);
      add(tx + w / 2, y, tz, 0.05, 0.05, w);
      if (y + step <= h + 0.01) {
        const len = Math.hypot(w, step);
        const ang = Math.atan2(step, w) * alt;
        const ym = y + step / 2;
        add(tx, ym, tz + w / 2, len, 0.035, 0.035, 0, ang);
        add(tx, ym, tz - w / 2, len, 0.035, 0.035, 0, -ang);
        add(tx + w / 2, ym, tz, 0.035, 0.035, len, ang, 0);
        add(tx - w / 2, ym, tz, 0.035, 0.035, len, -ang, 0);
      }
      alt = -alt;
    }
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8442a, roughness: 0.6, metalness: 0.35 });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, beams.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    beams.forEach((b, i) => {
      e.set(b.rx, 0, b.rz);
      q.setFromEuler(e);
      m.compose(V3(b.x, b.y, b.z), q, V3(b.sx, b.sy, b.sz));
      inst.setMatrixAt(i, m);
    });
    this.scene.add(inst);
    // top platform + antenna
    const grey = new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.6, metalness: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.08, w + 0.2), grey);
    top.position.set(tx, h + 0.04, tz);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.4, 6), grey);
    ant.position.set(tx, h + 0.75, tz);
    this.scene.add(top, ant);
    // access arm to the capsule (swings away before lift-off)
    this.arm = new THREE.Group();
    this.arm.position.set(tx + w / 2, 3.25, tz + 0.12);
    const armBeam = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.22), steel);
    armBeam.position.x = 0.31;
    const room = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.6 }));
    room.position.set(0.62, 0.05, 0);
    this.arm.add(armBeam, room);
    this.scene.add(this.arm);
  }

  restyle() { this.rocket.userData.applyStyle(getStyle(), settings.name.trim()); }

  reset() {
    this.restyle();
    this.t = 0;
    this.phase = 'count';
    this.ignition = -1;
    this.liftT = -1;
    this.vel = 0;
    this.armTarget = 0;
    this.arm.rotation.y = 0;
    this.rocket.position.set(0, this.rocketBaseY, 0);
    this.rocket.rotation.set(0, 0, 0);
    this.rocket.userData.setThrust(0);
    this.particles.clear();
    this.fade = 0;
    this.applyFade();
    this.camPos = V3(3.4, 1.1, 14.5);
    this.camera.position.copy(this.camPos);
    this.lookY = 3.0;
    this.emitAcc = 0;
    this.steamAcc = 0;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    // keep the whole rocket + tower visible on narrow (portrait) screens
    this.camera.fov = w < h ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  applyFade() {
    const f = this.fade;
    this.skyU.uFade.value = f;
    this.stars.setOpacity(smooth(clamp((f - 0.25) / 0.75, 0, 1)));
    this.scene.fog.color.copy(this.horizon).lerp(new THREE.Color(0x000002), f);
    this.hemi.intensity = 1.1 * (1 - f) + 0.15;
  }

  ignite() { this.ignition = this.t; }
  retractArm() { this.armTarget = -1.45; }

  async run(id, count, onCount) {
    for (let i = count; i >= 1; i--) {
      const said = onCount(i);
      if (i === Math.min(5, count)) this.retractArm();
      if (i === 3) this.ignite();
      // one second per number, a little more if the voice needs it
      await Promise.all([wait(1), said]);
      guard(id);
    }
    if (this.ignition < 0) this.ignite();
    onCount(0);
    this.liftT = this.t;
    this.phase = 'lift';
    await wait(8.2);
    guard(id);
  }

  update(dt) {
    this.t += dt;
    const r = this.rocket;
    const ud = r.userData;
    this.arm.rotation.y += (this.armTarget - this.arm.rotation.y) * (1 - Math.exp(-1.5 * dt));

    // thrust
    let thrust = 0;
    if (this.ignition >= 0) thrust = clamp((this.t - this.ignition) / 2.5, 0, 1) * 0.65;
    if (this.liftT >= 0) thrust = 1;
    ud.setThrust(thrust);
    ud.update(dt);

    // motion
    let lt = 0;
    if (this.liftT >= 0) {
      lt = this.t - this.liftT;
      const acc = 1.2 + 2.2 * lt;
      this.vel += acc * dt;
      r.position.y += this.vel * dt;
      // gentle pitch-over like a real launcher
      r.rotation.z = -0.12 * smooth(clamp(lt / 7, 0, 1));
      r.position.x += -r.rotation.z * this.vel * dt * 0.5;
    }
    const alt = r.position.y - this.rocketBaseY;
    this.fade = clamp((alt - 25) / 135, 0, 1);
    this.applyFade();
    setEngine(this.ignition >= 0 ? 1 - this.fade : 0, thrust);

    // engine light
    const base = r.localToWorld(V3(0, -0.5, 0));
    this.engineLight.position.copy(base);
    this.engineLight.intensity = thrust * 40 * (1 - this.fade);

    // particles: venting steam during the countdown
    this.steamAcc += dt * (this.liftT < 0 ? 7 : 0);
    while (this.steamAcc > 1) {
      this.steamAcc -= 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.emit(V3(side * 0.38, 2.5 + Math.random() * 0.3, 0.05), V3(side * (0.6 + Math.random() * 0.5), -0.15, (Math.random() - 0.5) * 0.4),
        { life: 2.2, size0: 0.15, size1: 1.1, opacity: 0.45, drag: 1.2 });
    }
    // exhaust smoke
    if (thrust > 0.02) {
      const nearGround = alt < 14;
      const rate = nearGround ? (this.liftT < 0 ? 10 + 14 * thrust : 30) : (20 + this.vel * 1.6) * (1 - this.fade);
      this.emitAcc += dt * rate;
      while (this.emitAcc > 1) {
        this.emitAcc -= 1;
        if (nearGround) {
          // big clouds rolling out sideways from the pad
          // mostly left/right (flame trench), a bit towards the back
          const side = Math.random() < 0.5 ? -1 : 1;
          const a = (side > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.1 - 0.25 * side;
          const sp = 3.5 + Math.random() * 5 * thrust;
          this.particles.emit(V3((Math.random() - 0.5) * 0.6, 0.55, (Math.random() - 0.5) * 0.6),
            V3(Math.cos(a) * sp, 0.3 + Math.random() * 1.4, Math.sin(a) * sp * 0.6),
            { life: 4 + Math.random() * 3, size0: 0.9, size1: 4 + Math.random() * 3.5, opacity: 0.55, drag: 0.6, color0: 0xffe2bd, color1: 0xf4f4f4 });
        }
        if (this.liftT >= 0) {
          // trail behind the rocket
          const p = r.localToWorld(V3((Math.random() - 0.5) * 0.3, -1.2 - Math.random() * 1.5, (Math.random() - 0.5) * 0.3));
          this.particles.emit(p, V3((Math.random() - 0.5) * 0.8, -1 - Math.random(), (Math.random() - 0.5) * 0.8),
            { life: 3.2, size0: 0.6, size1: 2.6 + alt * 0.02, opacity: 0.55 * (1 - this.fade), drag: 0.4, color0: 0xffe8c8, color1: 0xf6f6f6 });
        }
      }
    }
    this.particles.update(dt);

    // camera
    const shake = thrust * (this.liftT >= 0 ? 0.05 : 0.025) * (1 - clamp(alt / 60, 0, 1));
    if (this.liftT < 0) {
      // slow dolly-in during the countdown
      const k = smooth(clamp(this.t / 14, 0, 1));
      this.camPos.set(lerp(3.4, 2.9, k), lerp(1.1, 1.2, k), lerp(14.5, 12.6, k));
      this.lookY = 3.0;
    } else {
      const follow = 1 - Math.exp(-1.6 * dt);
      this.camPos.y += (r.position.y - 1.5 - this.camPos.y) * follow;
      this.camPos.z += (lerp(12.6, 18, clamp(lt / 6, 0, 1)) - this.camPos.z) * follow;
      this.camPos.x += (r.position.x + 2.9 - this.camPos.x) * follow;
      this.lookY += (r.position.y + 2.2 - this.lookY) * (1 - Math.exp(-3 * dt));
    }
    this.camera.position.copy(this.camPos).add(V3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
    this.camera.lookAt(this.liftT >= 0 ? r.position.x : 0, this.lookY, 0);
    this.skyDome.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
  }
}

// ===========================================================================
// TRAVEL: the rocket flies through space and meets planets
// ===========================================================================
export class TravelScene {
  constructor(assets) {
    this.assets = assets;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
    this.sky = createSky(assets.milkyway, { radius: 2400 });
    this.scene.add(this.sky);
    // Sun light from the upper right, slightly behind the viewer: the rocket
    // side we see is lit and planets show a soft terminator on the left.
    this.sunDir = V3(0.5, 0.42, 0.76).normalize();
    const light = new THREE.DirectionalLight(0xffffff, 3.1);
    light.position.copy(this.sunDir).multiplyScalar(500);
    this.scene.add(light, new THREE.AmbientLight(0x8090b0, 0.18));

    this.rocket = createRocket(getStyle(), settings.name.trim());
    this.scene.add(this.rocket);

    // encounters: objects placed in camera space, timed animations, taps
    this.fx = new THREE.Group();
    this.scene.add(this.fx);
    this.timed = [];
    this.tapHandler = null;
    this.raycaster = new THREE.Raycaster();
    this.width = 1;
    this.height = 1;

    // speed lines (space dust streaking past)
    const n = 260;
    this.lines = { n, data: [] };
    const pos = new Float32Array(n * 6);
    const col = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = (Math.random() - 0.5) * 80; y = (Math.random() - 0.5) * 80; } while (Math.hypot(x, y) < 5);
      this.lines.data.push({ x, y, z: -Math.random() * 400 + 20 });
      const b = 0.4 + Math.random() * 0.6;
      col.set([b, b, b * 1.05, 0, 0, 0], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.lineMesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.lineMesh.frustumCulled = false;
    this.scene.add(this.lineMesh);

    this.camBase = V3(3.3, 2.2, 9.2); // the rocket's middle is at the origin
    this.camOffset = V3();
    this.baseQuat = new THREE.Quaternion();
    this.forward = V3(0, 0, -1);
    this.planet = null;
    this.portrait = true;
    this.reset();
  }

  // Camera orientation: rocket in the lower part, planet spot in the upper part.
  frame() {
    const cam = this.camera;
    cam.fov = 55;
    cam.updateProjectionMatrix();
    cam.position.copy(this.camBase);
    cam.lookAt(0, 0, 0);
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.rotateX(Math.atan((this.portrait ? 0.36 : 0.25) * tanV));
    this.baseQuat.copy(cam.quaternion);
    this.spotY = this.portrait ? 0.4 : 0.32;
    cam.updateMatrixWorld();
    this.forward.copy(placeAtScreen(cam, 0, this.spotY, 400)).normalize();
    this.lineMesh.quaternion.setFromUnitVectors(V3(0, 0, -1), this.forward);
  }

  // Rocket pointing along `dir`, porthole turned towards the camera.
  orient(dir, quat) {
    const q1 = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
    const z1 = V3(0, 0, 1).applyQuaternion(q1);
    const want = this.camera.position.clone().sub(this.rocket.position).projectOnPlane(dir).normalize();
    let ang = Math.acos(clamp(z1.dot(want), -1, 1));
    if (V3().crossVectors(z1, want).dot(dir) < 0) ang = -ang;
    const q2 = new THREE.Quaternion().setFromAxisAngle(dir, ang - 0.35);
    return quat.copy(q2.multiply(q1));
  }

  setTapHandler(fn) { this.tapHandler = fn; }
  onTap(x, y) { if (this.tapHandler) this.tapHandler(x, y); }

  // Run onUpdate(k, obj, t, dt) for `duration` seconds; resolves at the end.
  addTimed(obj, duration, onUpdate, onDone) {
    if (obj && !obj.parent) this.fx.add(obj);
    return new Promise((resolve) => { this.timed.push({ obj, d: duration, t: 0, onUpdate, onDone, resolve }); });
  }

  clearFx() {
    for (const e of this.timed) { if (e.onDone) e.onDone(); }
    this.timed = [];
    this.fx.clear();
    this.tapHandler = null;
  }

  restyle() { this.rocket.userData.applyStyle(getStyle(), settings.name.trim()); }

  reset() {
    this.clearFx();
    this.restyle();
    this.t = 0;
    this.speed = 60;
    this.targetSpeed = 60;
    this.arriving = false;
    this.orbit = null;
    this.removePlanet();
    this.frame();
    this.rocket.scale.setScalar(1);
    this.rocket.position.copy(this.forward).multiplyScalar(-2.1);
    this.orient(this.forward, this.rocket.quaternion);
    this.rocket.userData.setThrust(0.8);
    this.lookMix = 0;
    this.lookAtC = null;
    this.camOffset.set(0, 0, 0);
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.portrait = w < h;
    this.camera.updateProjectionMatrix();
    if (!this.arriving && !this.orbit) {
      this.frame();
      if (this.planet && this.def) {
        this.inspectPos = this.inspection(this.def);
        if (!this.moving) this.planet.group.position.copy(this.inspectPos);
      }
    }
  }

  removePlanet() {
    if (this.planet) {
      this.scene.remove(this.planet.group);
      this.planet.dispose();
      this.planet = null;
    }
  }

  // Inspection spot: planet big in the upper part of the screen.
  inspection(def) {
    const frame = def.kind === 'comet' ? 1.75 : def.rings ? 2.4 : 1.12;
    const frac = this.portrait ? 0.84 : 0.5;
    const cam = this.camera;
    cam.position.copy(this.camBase);
    cam.quaternion.copy(this.baseQuat);
    cam.fov = 55;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const dist = distanceForSize(cam, 10 * frame, frac);
    this.inspectDir = new THREE.Vector3(0, this.spotY, 0.5).unproject(cam).sub(cam.position).normalize();
    this.inspectDist = dist;
    return placeAtScreen(cam, 0, this.spotY, dist);
  }

  setPlanet(id, tex) {
    this.removePlanet();
    const def = PLANETS[id];
    this.def = def;
    this.planet = createPlanet(def, tex, { radius: 10, segments: 96, ringTex: this.assets.rings });
    this.planet.setSun(this.sunDir);
    // a comet's tail points away from the Sun: turn it sideways so it shows
    if (def.kind === 'comet') this.planet.setSun(V3(0.85, 0.35, 0.4));
    this.planet.body.rotation.y = faceRotation(def) - 0.35;
    this.inspectPos = this.inspection(def);
    this.planet.group.position.copy(this.camBase).addScaledVector(this.inspectDir, 2600);
    this.scene.add(this.planet.group);
  }

  async warp(seconds) {
    this.targetSpeed = 520;
    this.rocket.userData.setThrust(1);
    await wait(seconds * 0.75);
    this.targetSpeed = 60;
    await wait(seconds * 0.25);
  }

  async approach() {
    const from = 2600;
    const to = this.inspectDist;
    this.rocket.userData.setThrust(0.6);
    this.moving = true;
    await tween(4.2, (k) => {
      this.planet.group.position.copy(this.camBase).addScaledVector(this.inspectDir, lerp(from, to, k));
    }, (t) => 1 - Math.pow(1 - t, 4));
    this.moving = false;
  }

  async flyby() {
    const start = this.planet.group.position.clone();
    const right = V3(1, 0, 0).applyQuaternion(this.baseQuat);
    const side = Math.random() < 0.5 ? -1 : 1;
    this.targetSpeed = 300;
    this.rocket.userData.setThrust(1);
    this.moving = true;
    sfx.whoosh();
    await tween(2.4, (k) => {
      this.planet.group.position.copy(start)
        .addScaledVector(this.inspectDir, -(this.inspectDist + 40) * k)
        .addScaledVector(right, side * 80 * k);
    }, easeInCubic);
    this.moving = false;
    this.removePlanet();
  }

  // Fly to the planet and settle into orbit around it.
  async arrive() {
    this.arriving = true;
    const def = this.def;
    const C = this.planet.group.position.clone();
    const orbitR = 10 * (def.rings ? 2.75 : 1.55);
    const e1 = V3(1, 0, 0).applyQuaternion(this.baseQuat);
    const camUp = V3(0, 1, 0).applyQuaternion(this.baseQuat);
    const toCam = this.camBase.clone().sub(C).normalize();
    const n = camUp.clone().addScaledVector(toCam, 0.42).normalize();
    const e2 = V3().crossVectors(n, e1).normalize();
    const entry = C.clone().addScaledVector(e1, -orbitR);
    const p0 = this.rocket.position.clone();
    const p1 = p0.clone().addScaledVector(this.forward, C.distanceTo(p0) * 0.35);
    const p2 = entry.clone().addScaledVector(e2, -orbitR * 0.7);
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, entry);
    const up = V3(0, 1, 0);
    this.rocket.userData.setThrust(1);
    const scale1 = this.inspectDist * 0.024;
    // the camera backs away so that the whole orbit fits on screen
    const back = this.inspectDir.clone().multiplyScalar(-this.inspectDist * (this.portrait ? 0.6 : 0.4));
    const m = new THREE.Matrix4().lookAt(this.camBase.clone().add(back), C, camUp);
    this.lookAtC = new THREE.Quaternion().setFromRotationMatrix(m);
    await tween(3.4, (k) => {
      const tgt = curve.getTangent(k).normalize();
      this.rocket.position.copy(curve.getPoint(k));
      this.rocket.quaternion.setFromUnitVectors(up, tgt);
      this.rocket.scale.setScalar(lerp(1, scale1, k));
      this.camOffset.copy(back).multiplyScalar(smooth(k));
      this.lookMix = smooth(k);
    }, easeInOutCubic);
    // orbit: keep going until the scene changes
    this.orbit = { C, e1, e2, orbitR, th: Math.PI, w: 1.0 };
    this.rocket.userData.setThrust(0.35);
  }

  update(dt) {
    this.t += dt;
    this.speed += (this.targetSpeed - this.speed) * (1 - Math.exp(-2.2 * dt));
    // speed lines
    const pos = this.lineMesh.geometry.attributes.position;
    const len = clamp(this.speed * 0.05, 0.3, 26);
    for (let i = 0; i < this.lines.n; i++) {
      const d = this.lines.data[i];
      d.z += this.speed * dt;
      if (d.z > 25) d.z -= 420;
      pos.setXYZ(i * 2, d.x, d.y, d.z);
      pos.setXYZ(i * 2 + 1, d.x, d.y, d.z - len);
    }
    pos.needsUpdate = true;
    this.lineMesh.material.opacity = clamp(this.speed / 400, 0.12, 0.8);

    // rocket
    const ud = this.rocket.userData;
    if (this.orbit) {
      const o = this.orbit;
      o.th -= o.w * dt;
      const p = o.C.clone().addScaledVector(o.e1, Math.cos(o.th) * o.orbitR).addScaledVector(o.e2, Math.sin(o.th) * o.orbitR);
      const vel = o.e1.clone().multiplyScalar(Math.sin(o.th)).addScaledVector(o.e2, -Math.cos(o.th)).normalize();
      this.rocket.position.copy(p);
      this.rocket.quaternion.setFromUnitVectors(V3(0, 1, 0), vel);
    } else if (!this.arriving) {
      // small floating motion around the flight direction
      const wob = this.forward.clone().add(V3(Math.sin(this.t * 0.5) * 0.025, Math.sin(this.t * 0.7) * 0.02, 0)).normalize();
      const q = this.orient(wob, new THREE.Quaternion());
      this.rocket.quaternion.slerp(q, 1 - Math.exp(-3 * dt));
    }
    ud.update(dt);

    if (this.planet) this.planet.update(dt);

    // camera: slight sway, fov kick at high speed
    const kick = clamp((this.speed - 60) / 460, 0, 1);
    this.camera.fov = 55 + kick * 9;
    this.camera.updateProjectionMatrix();
    const sway = V3(Math.sin(this.t * 0.31) * 0.1, Math.sin(this.t * 0.43) * 0.07, 0);
    const shake = kick * 0.04;
    this.camera.position.copy(this.camBase).add(this.camOffset).add(sway).add(V3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
    this.camera.quaternion.copy(this.baseQuat);
    if (this.lookAtC) this.camera.quaternion.slerp(this.lookAtC, this.lookMix);
    this.sky.position.copy(this.camera.position);

    // timed effects, then objects that live in camera space
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const e = this.timed[i];
      if (!e) continue;
      e.t += dt;
      const k = Math.min(1, e.t / e.d);
      if (e.onUpdate) e.onUpdate(k, e.obj, e.t, dt);
      if (k >= 1) {
        this.timed.splice(this.timed.indexOf(e), 1);
        if (e.obj && e.obj.parent) e.obj.parent.remove(e.obj);
        if (e.onDone) e.onDone();
        e.resolve();
      }
    }
    this.camera.updateMatrixWorld();
    for (const o of this.fx.children) {
      if (!o.userData.local) continue;
      o.position.copy(o.userData.local).applyMatrix4(this.camera.matrixWorld);
      if (o.userData.camAligned) o.quaternion.copy(this.camera.quaternion);
    }
  }

  // ---- activities in orbit ------------------------------------------------
  // Texture point (u, v from the top) of the planet under a screen point.
  pickPlanet(x, y) {
    if (!this.planet) return null;
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.planet.body, false)[0];
    return hit && hit.uv ? { u: hit.uv.x, v: 1 - hit.uv.y, point: hit.point } : null;
  }

  // Is the screen point on (or close to) the planet?
  nearPlanet(x, y) {
    if (this.pickPlanet(x, y)) return true;
    const c = this.planet.group.position.clone().project(this.camera);
    const cx = (c.x + 1) / 2 * this.width;
    const cy = (1 - c.y) / 2 * this.height;
    const e = this.planet.group.position.clone().add(V3(10, 0, 0).applyQuaternion(this.camera.quaternion)).project(this.camera);
    const r = Math.abs(e.x - c.x) / 2 * this.width;
    return Math.hypot(x - cx, y - cy) < r * 1.25;
  }

  static texDir(u, v) {
    const phi = u * Math.PI * 2;
    const th = v * Math.PI;
    return V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
  }

  // Turn the planet so that texture point (u, v) faces the camera.
  async faceCamera(u, v, seconds = 1.4) {
    const body = this.planet.body;
    this.planet.spinning = false;
    const p = TravelScene.texDir(u, v);
    const tiltGroup = body.parent;
    tiltGroup.updateMatrixWorld();
    const d = this.camera.position.clone().sub(this.planet.group.position)
      .applyQuaternion(tiltGroup.getWorldQuaternion(new THREE.Quaternion()).invert());
    let target = Math.atan2(d.x, d.z) - Math.atan2(p.x, p.z);
    const from = body.rotation.y;
    while (target - from > Math.PI) target -= Math.PI * 2;
    while (target - from < -Math.PI) target += Math.PI * 2;
    await tween(seconds, (k) => { body.rotation.y = lerp(from, target, k); }, easeInOutCubic);
  }

  spotWorld(u, v) {
    return this.planet.body.localToWorld(TravelScene.texDir(u, v).multiplyScalar(10.4));
  }

  sparkle(pos, color = 0xffe08a, size = 6) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos);
    return this.addTimed(sp, 1.6, (k) => {
      const sc = size * (0.4 + k);
      sp.scale.set(sc, sc, 1);
      sp.material.opacity = 1 - k;
    });
  }

  // Bring the camera back close to the planet (bigger targets for little fingers).
  zoomIn(seconds = 1.4) {
    const from = this.camOffset.clone();
    const mix0 = this.lookMix;
    return tween(seconds, (k) => {
      this.camOffset.copy(from).multiplyScalar(1 - k);
      this.lookMix = lerp(mix0, 1, k);
    }, easeInOutCubic);
  }

  async spotActivity(api) {
    const a = this.def.activity;
    await Promise.all([this.faceCamera(a.u, a.v), this.zoomIn()]);
    const intro = TEXT.spotIntro(a.label);
    api.banner(intro);
    api.speak(intro);
    const target = TravelScene.texDir(a.u, a.v);
    let marker = null;
    let done = false;
    const showMarker = () => {
      if (marker || done) return;
      marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      this.fx.add(marker);
      this.addTimed(marker, 3600, (k, o, t) => {
        o.position.copy(this.spotWorld(a.u, a.v));
        const sc = 5 + Math.sin(t * 4) * 1.5;
        o.scale.set(sc, sc, 1);
        o.material.opacity = 0.55 + 0.35 * Math.sin(t * 4);
      });
    };
    // gentle help if nothing is found after a while
    (async () => {
      await wait(12);
      if (!done) { api.speak(TEXT.spotHint(a.label)); showMarker(); }
    })();
    await new Promise((resolve) => {
      let misses = 0;
      this.setTapHandler((x, y) => {
        const hit = this.pickPlanet(x, y);
        if (!hit || done) return;
        const angle = Math.acos(clamp(TravelScene.texDir(hit.u, hit.v).dot(target), -1, 1));
        if (angle < a.radius) {
          done = true;
          this.setTapHandler(null);
          if (marker) marker.visible = false;
          this.sparkle(this.spotWorld(a.u, a.v), 0xffe08a, 9);
          api.sfx.good();
          api.addStars(2, x, y);
          const found = TEXT.spotFound(a.label);
          api.banner(found);
          api.speak(found).then(resolve);
        } else {
          misses++;
          api.sfx.gentle();
          if (misses === 2) api.speak(TEXT.spotHint(a.label));
          if (misses >= 3) showMarker();
        }
      });
    });
    this.planet.spinning = true;
  }

  async factsActivity(api) {
    const facts = this.def.facts || [this.def.fact];
    await this.zoomIn();
    api.banner(TEXT.factsIntro);
    api.speak(TEXT.factsIntro);
    let i = 0;
    let last = this.t;
    let finished = false;
    (async () => {
      while (!finished) {
        await wait(10);
        if (!finished && this.t - last > 9.5) api.speak(TEXT.factsIntro);
      }
    })();
    await new Promise((resolve) => {
      let busy = false;
      this.setTapHandler(async (x, y) => {
        if (busy || !this.nearPlanet(x, y)) return;
        busy = true;
        last = this.t;
        const hit = this.pickPlanet(x, y);
        this.sparkle(hit ? hit.point : this.planet.group.position, 0xbfe4ff, 7);
        api.sfx.select();
        api.addStars(1, x, y);
        api.banner(facts[i]);
        await api.speak(facts[i]);
        i++;
        last = this.t;
        busy = false;
        if (i >= facts.length) {
          finished = true;
          this.setTapHandler(null);
          resolve();
        }
      });
    });
  }
}

// ===========================================================================
// VICTORY: top view of the solar system with the route Earth -> destination
// ===========================================================================
export class VictoryScene {
  constructor(assets) {
    this.assets = assets;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
    this.sky = createSky(assets.milkyway, { radius: 2000 });
    this.scene.add(this.sky);
    this.scene.add(new THREE.AmbientLight(0x8090b0, 0.35));
    const sunLight = new THREE.PointLight(0xfff4e0, 3.0, 0, 0);
    this.scene.add(sunLight);
    // soft fill from the viewer so the night sides are not black
    this.fill = new THREE.DirectionalLight(0xc8d8ff, 1.0);
    this.scene.add(this.fill);
    this.sunR = 0.8;
    this.sun = createPlanet(null, assets.small.sun, { radius: this.sunR, segments: 48, sun: true });
    this.scene.add(this.sun.group);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(this.sunR * 6, this.sunR * 6, 1);
    this.sunGlow = glow;
    this.scene.add(glow);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.rocket = createRocket(getStyle(), settings.name.trim());
    this.rocket.scale.setScalar(0.11);
    this.scene.add(this.rocket);
    this.planets = {};
    this.t = 0;
    this.progress = 0;
  }

  restyle() { this.rocket.userData.applyStyle(getStyle(), settings.name.trim()); }

  // Angles (in the orbital plane) of the planets that are not part of the trip.
  static angles = { mercury: 3.5, venus: 5.5, mars: 0.55, jupiter: 2.6, saturn: 4.1, uranus: 5.2, neptune: 2.0 };

  setup(destId) {
    // clear previous
    this.dynamic.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.scene.remove(this.dynamic);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.planets = {};
    this.destId = destId;
    const dest = PLANETS[destId];
    const r1 = PLANETS.earth.orbit;
    const thE = Math.PI / 2;    // Earth: bottom of the screen
    const thD = -Math.PI / 2;   // destination (or its planet): top
    // a moon travels with its planet; the Moon is next to the Earth
    const parentId = dest.parent && dest.parent !== 'earth' ? dest.parent : null;
    const nearEarth = dest.parent === 'earth';
    const orbitLine = (pts, highlight) => {
      this.dynamic.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({
        color: highlight ? 0x9fc4ff : 0x8090b0, transparent: true, opacity: highlight ? 0.55 : 0.22, depthWrite: false,
      })));
    };
    const circle = (r, c = V3()) => {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pts.push(V3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r));
      }
      return pts;
    };

    // orbits of the planets (+ Pluto / the comet when they are the destination)
    for (const id of ORDER) orbitLine(circle(PLANETS[id].orbit), id === 'earth' || id === destId || id === parentId);
    let cometOrbit = null;
    if (destId === 'pluto') orbitLine(circle(dest.orbit), true);
    if (destId === 'comet') {
      // elongated orbit with the Sun at one focus, passing through the comet
      const ca = 5.2;
      const ce = 0.808;
      const w = thD - 2.42;
      cometOrbit = (th) => ca * (1 - ce * ce) / (1 + ce * Math.cos(th - w));
      const pts = [];
      for (let i = 0; i <= 200; i++) {
        const th = (i / 200) * Math.PI * 2;
        const r = cometOrbit(th);
        pts.push(V3(Math.cos(th) * r, 0, Math.sin(th) * r));
      }
      orbitLine(pts, true);
    }

    // planets
    const addBody = (id, pos, main) => {
      const def = PLANETS[id];
      const p = createPlanet(def, this.assets.small[id], { radius: def.mapSize * (main ? 1.25 : 0.85), segments: 40, ringTex: this.assets.rings });
      p.group.position.copy(pos);
      p.setSun(p.group.position.clone().negate());
      p.body.rotation.y = faceRotation(def);
      if (p.tails) p.tails.scale.setScalar(0.5);
      this.dynamic.add(p.group);
      this.planets[id] = p;
      return p;
    };
    for (const id of ORDER) {
      const def = PLANETS[id];
      const main = id === 'earth' || id === destId || id === parentId;
      const th = id === 'earth' ? thE : (id === destId || id === parentId) ? thD : VictoryScene.angles[id];
      addBody(id, V3(Math.cos(th) * def.orbit, 0, Math.sin(th) * def.orbit), main);
    }
    let destPos;
    if (!ORDER.includes(destId)) {
      if (nearEarth) {
        destPos = this.planets.earth.group.position.clone().add(V3(0.62, 0, -0.5));
      } else if (parentId) {
        const pp = this.planets[parentId].group.position;
        destPos = pp.clone().add(V3(PLANETS[parentId].rings ? 1.45 : 1.15, 0, 0.3));
        orbitLine(circle(destPos.distanceTo(pp), pp), true);
      } else {
        const r = destId === 'comet' ? cometOrbit(thD) : dest.orbit;
        destPos = V3(Math.cos(thD) * r, 0, Math.sin(thD) * r);
      }
      addBody(destId, destPos, true);
    }
    if (nearEarth) orbitLine(circle(destPos.distanceTo(this.planets.earth.group.position), this.planets.earth.group.position), true);
    destPos = this.planets[destId].group.position.clone();

    // highlight halos under the Earth and the destination
    for (const id of ['earth', destId]) {
      const p = this.planets[id];
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: id === 'earth' ? 0x6fb0ff : 0xffd25a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      const sc = p.radius * (PLANETS[id].rings ? 6.5 : 4.2);
      halo.scale.set(sc, sc, 1);
      p.group.add(halo);
      p.halo = halo;
    }

    // route: half transfer ellipse (prograde, towards +x first), then the last
    // hop to a moon; a short arc for the Moon
    const pts = [];
    const earthPos = this.planets.earth.group.position.clone();
    if (nearEarth) {
      const ctrl = earthPos.clone().lerp(destPos, 0.5).add(V3(0.55, 0, 0.15));
      const qb = new THREE.QuadraticBezierCurve3(earthPos, ctrl, destPos);
      for (let i = 0; i <= 40; i++) pts.push(qb.getPoint(i / 40).setY(0.02));
    } else {
      const r2 = Math.hypot((parentId ? this.planets[parentId].group.position : destPos).x, (parentId ? this.planets[parentId].group.position : destPos).z);
      const a = (r1 + r2) / 2;
      const e = Math.abs(r2 - r1) / (r1 + r2);
      const outward = r2 > r1;
      for (let i = 0; i <= 120; i++) {
        const phi = (i / 120) * Math.PI;
        const r = a * (1 - e * e) / (1 + (outward ? 1 : -1) * e * Math.cos(phi));
        const th = thE - phi;
        pts.push(V3(Math.cos(th) * r, 0.02, Math.sin(th) * r));
      }
      if (parentId) {
        const last = pts[pts.length - 1];
        const ctrl = last.clone().add(V3(-0.4, 0, -0.9));
        const qb = new THREE.QuadraticBezierCurve3(last.clone(), ctrl, destPos.clone().setY(0.02));
        for (let i = 1; i <= 24; i++) pts.push(qb.getPoint(i / 24));
      }
    }
    this.curve = new THREE.CatmullRomCurve3(pts);
    this.pathU = { uProgress: { value: 0 }, uTime: { value: 0 } };
    const mkTube = (radius, color, alpha, dashed) => new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 240, radius, 8, false),
      new THREE.ShaderMaterial({
        uniforms: { ...this.pathU, uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uProgress; uniform float uTime; uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
          void main(){
            if (vUv.x > uProgress) discard;
            ${dashed ? 'if (fract(vUv.x * 34.0 - uTime * 0.8) > 0.6) discard;' : ''}
            gl_FragColor = vec4(uColor, uAlpha);
            #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false, blending: dashed ? THREE.NormalBlending : THREE.AdditiveBlending,
      }));
    this.dynamic.add(mkTube(0.05, 0xffd25a, 1.0, true));
    this.dynamic.add(mkTube(0.14, 0xffa020, 0.22, false));

    this.progress = 0;
    this.t = 0;
    this.rocket.visible = false;
    this.restyle();
    this.fitCamera(pts.concat([this.planets.earth.group.position, this.planets[destId].group.position, V3()]));
  }

  fitCamera(points) {
    // look down at the plane with a tilt; find distance + centre so that all
    // points fit between the title (top) and the buttons (bottom).
    const tilt = THREE.MathUtils.degToRad(30);
    const back = V3(0, Math.cos(tilt), Math.sin(tilt));
    const center = V3();
    points.forEach((p) => center.add(p));
    center.multiplyScalar(1 / points.length);
    center.y = 0;
    let dist = 20;
    const cam = this.camera;
    const winX = 0.8, winTop = 0.42, winBottom = -0.52;
    const ext = [];
    points.forEach((p) => { ext.push(p.clone().add(V3(0.7, 0, 0)), p.clone().add(V3(-0.7, 0, 0)), p.clone().add(V3(0, 0, 0.8)), p.clone().add(V3(0, 0, -0.9))); });
    for (let it = 0; it < 40; it++) {
      cam.position.copy(center).addScaledVector(back, dist);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of ext) {
        const v = p.clone().project(cam);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
      const s = Math.max((maxX - minX) / (2 * winX), (maxY - minY) / (winTop - winBottom));
      dist *= lerp(1, s, 0.5);
      const right = V3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = V3(0, 0, -1);
      const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const offX = (maxX + minX) / 2;
      const offY = (maxY + minY) / 2 - (winTop + winBottom) / 2;
      center.addScaledVector(right, offX * dist * tanV * cam.aspect * 0.5);
      center.addScaledVector(up, offY * dist * tanV * 0.5 / Math.cos(tilt));
    }
    this.camCenter = center.clone();
    this.camDist = dist;
    this.camBack = back;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.curve) {
      const pts = this.curve.points.concat([this.planets.earth.group.position, this.planets[this.destId].group.position, V3()]);
      this.fitCamera(pts);
    }
  }

  async play(id) {
    this.rocket.visible = true;
    this.rocket.userData.setThrust(0.9);
    await tween(4.5, (k) => { this.progress = k; }, easeInOutCubic);
    guard(id);
    this.rocket.userData.setThrust(0.2);
  }

  // screen position (CSS pixels) of a planet, for HTML labels
  screenPos(id, w, h, below = false) {
    const p = this.planets[id];
    if (!p) return null;
    const rad = (PLANETS[id].rings ? 2.0 : 1.0) * p.radius;
    const c = p.group.position.clone().project(this.camera);
    const right = V3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const e = p.group.position.clone().addScaledVector(right, rad).project(this.camera);
    const rPx = Math.abs(e.x - c.x) / 2 * w;
    const x = (c.x + 1) / 2 * w;
    const y = (1 - c.y) / 2 * h;
    return { x, y: below ? y + rPx + 20 : y - rPx - 22 };
  }

  update(dt) {
    this.t += dt;
    this.pathU.uTime.value = this.t;
    this.pathU.uProgress.value = this.progress;
    for (const id in this.planets) this.planets[id].update(dt * 0.5);
    this.sun.update(dt * 0.3);
    this.sunGlow.material.rotation += dt * 0.02;
    // rocket along the path
    if (this.curve && this.rocket.visible) {
      const k = clamp(this.progress, 0.0001, 0.9999);
      const p = this.curve.getPointAt(k);
      const tgt = this.curve.getTangentAt(k).normalize();
      this.rocket.position.copy(p).add(V3(0, 0.12, 0));
      this.rocket.quaternion.setFromUnitVectors(V3(0, 1, 0), tgt);
      this.rocket.userData.update(dt);
      if (this.progress >= 0.999) {
        // park next to the destination
        this.rocket.visible = false;
      }
    }
    const dest = this.planets[this.destId];
    if (dest && dest.halo) {
      const pulse = this.progress >= 0.999 ? 0.55 + 0.35 * Math.sin(this.t * 3) : 0.45;
      dest.halo.material.opacity = pulse;
    }
    // slow cinematic drift
    const drift = Math.sin(this.t * 0.15) * 0.04;
    const back = this.camBack.clone().applyAxisAngle(V3(0, 1, 0), drift);
    this.camera.position.copy(this.camCenter).addScaledVector(back, this.camDist * (1.06 - 0.06 * smooth(clamp(this.t / 6, 0, 1))));
    this.camera.lookAt(this.camCenter);
    this.fill.position.copy(this.camera.position).sub(this.camCenter);
    this.sky.position.copy(this.camera.position);
  }
}

// ===========================================================================
// Planet portraits for the menu (rendered once, offscreen)
// ===========================================================================
export function renderThumbnails(ids, small, rings, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(size, size, false);
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const sun = V3(-0.62, 0.42, 0.72).normalize();
  const light = new THREE.DirectionalLight(0xffffff, 3.2);
  light.position.copy(sun).multiplyScalar(10);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.12));
  const out = {};
  for (const id of ids) {
    const def = PLANETS[id];
    const p = createPlanet(def, small[id], { radius: 1, segments: 64, ringTex: rings });
    p.setSun(sun);
    p.body.rotation.y = faceRotation(def) + 0.2;
    if (def.rings) p.group.rotation.x = 0.28;
    scene.add(p.group);
    let frame = def.rings ? 2.42 : 1.16;
    if (def.kind === 'comet') {
      // small nucleus in the upper left, tail across the picture
      frame = 3.4;
      p.group.position.set(-1.5, 1.3, 0);
    }
    cam.position.set(0, 0, frame / Math.tan(THREE.MathUtils.degToRad(15)));
    cam.lookAt(0, 0, 0);
    p.update(0);
    r.render(scene, cam);
    out[id] = canvas.toDataURL('image/png');
    scene.remove(p.group);
    p.dispose();
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
