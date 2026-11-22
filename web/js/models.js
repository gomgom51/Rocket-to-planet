// Procedural 3D models: space station, friendly ship, rover, astronaut,
// crystals, rocks, shooting stars, comet nucleus and tails.

import * as THREE from '../vendor/three.module.min.js';
import { glowTexture } from './gfx.js'; // only used inside functions (no import cycle at load time)

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const glowSprite = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(size, size, 1);
  return s;
};
export { glowSprite };

// Cheap smooth 3D noise made of sines (enough to roughen rocks).
const bump = (x, y, z, s) => Math.sin(x * 3.1 + s) * Math.sin(y * 2.7 + s * 1.3) * Math.sin(z * 3.3 + s * 0.7)
  + 0.5 * Math.sin(x * 7.3 + s * 2.1) * Math.sin(y * 6.1 + s) * Math.sin(z * 5.7 + s * 1.7);

// ---------------------------------------------------------------------------
// Rocks
// ---------------------------------------------------------------------------
export function rockGeometry(seed = Math.random() * 100, detail = 1, rough = 0.28) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + rough * bump(v.x, v.y, v.z, seed);
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y * 0.8, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Comet nucleus (two lobes) and its tails
// ---------------------------------------------------------------------------
export function cometGeometry(radius) {
  const g = new THREE.SphereGeometry(radius, 64, 32);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).divideScalar(radius);
    v.x *= 1.55;
    const waist = 1 - 0.28 * Math.exp(-((v.x * 2.2) ** 2));
    v.y *= waist;
    v.z *= waist;
    v.multiplyScalar(1 + 0.12 * bump(v.x, v.y, v.z, 4.2));
    p.setXYZ(i, v.x * radius, v.y * radius, v.z * radius);
  }
  g.computeVertexNormals();
  return g;
}

export function tailMaterial(c0, c1, alpha) {
  return new THREE.ShaderMaterial({
    uniforms: { uC0: { value: new THREE.Color(c0) }, uC1: { value: new THREE.Color(c1) }, uAlpha: { value: alpha }, uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uC0; uniform vec3 uC1; uniform float uAlpha; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float t = vUv.y; // 1 at the nucleus, 0 at the far end
        float a = pow(t, 1.3) * pow(abs(dot(vN, vV)), 1.2) * uAlpha;
        a *= 0.85 + 0.15 * sin(uTime * 2.0 + t * 12.0);
        vec3 c = mix(uC1, uC0, t);
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

// A long cone with its tip at the origin, widening towards +Y.
export function tailCone(radius, length, mat) {
  const g = new THREE.ConeGeometry(radius, length, 32, 1, true);
  g.rotateX(Math.PI);
  g.translate(0, length / 2, 0);
  return new THREE.Mesh(g, mat);
}

// Comet tails + coma, oriented away from the Sun with setSun().
export function createCometTails(radius) {
  const group = new THREE.Group();
  const dust = tailMaterial(0xfff4dc, 0xffd9a0, 0.95);
  const ion = tailMaterial(0xcfe8ff, 0x6ab4ff, 1.1);
  const dustTail = tailCone(radius * 3.2, radius * 11, dust);
  const ionTail = tailCone(radius * 1.4, radius * 16, ion);
  dustTail.rotation.z = 0.12; // the dust tail curves a little
  group.add(dustTail, ionTail);
  const coma = glowSprite(0xdcecff, radius * 3.4, 0.5);
  group.add(coma);
  group.userData.update = (t) => { dust.uniforms.uTime.value = t; ion.uniforms.uTime.value = t * 1.3; };
  return group;
}

// ---------------------------------------------------------------------------
// Space station
// ---------------------------------------------------------------------------
const solarTex = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#0d1d44';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = `rgb(${20 + Math.random() * 15},${40 + Math.random() * 25},${95 + Math.random() * 40})`;
      g.fillRect(x + 2, y + 2, 28, 28);
    }
  }
  g.strokeStyle = 'rgba(210,180,90,0.7)';
  g.lineWidth = 3;
  g.strokeRect(2, 2, w - 4, h - 4);
});

export function createStation() {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.45, metalness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5, metalness: 0.15 });
  const panelMat = new THREE.MeshStandardMaterial({ map: solarTex(), roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a640, roughness: 0.35, metalness: 0.8 });
  // main truss
  const truss = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, 0.22), metal);
  root.add(truss);
  // solar wings
  for (const x of [-3.3, -2.5, 2.5, 3.3]) {
    for (const s of [1, -1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 0.02), panelMat);
      p.position.set(x, s * 1.4, 0);
      root.add(p);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6), metal);
      mast.position.set(x, s * 1.4, 0.03);
      root.add(mast);
    }
  }
  // living modules along Z
  const mod = (len, r, z, mat = white) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = z;
    root.add(m);
    return m;
  };
  mod(1.4, 0.32, 0.9);
  mod(1.1, 0.32, -0.6);
  mod(0.9, 0.26, -1.6, gold);
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), white);
  root.add(node);
  // radiators
  for (const s of [1, -1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 1.4), white);
    r.position.set(s * 0.9, -0.45, 0);
    root.add(r);
  }
  // blinking lights
  const lights = [glowSprite(0xff4040, 0.5), glowSprite(0x40ff70, 0.5), glowSprite(0xffffff, 0.45)];
  lights[0].position.set(-3.65, 0, 0);
  lights[1].position.set(3.65, 0, 0);
  lights[2].position.set(0, 0, 1.7);
  root.add(...lights);
  let t = 0;
  let wave = 0;
  root.userData = {
    update(dt) {
      t += dt;
      wave = Math.max(0, wave - dt);
      const blink = (Math.sin(t * 4) > 0.3 ? 1 : 0.15);
      lights.forEach((l, i) => { l.material.opacity = wave > 0 ? (Math.sin(t * 18 + i) > 0 ? 1 : 0.2) : (i === 2 ? 0.6 : blink); });
      root.rotation.z += dt * 0.05;
    },
    wave() { wave = 2.5; },
  };
  return root;
}

// ---------------------------------------------------------------------------
// Friendly ship (little flying saucer)
// ---------------------------------------------------------------------------
export function createFriendlyShip() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hull = new THREE.LatheGeometry([
    new THREE.Vector2(0.001, -0.28), new THREE.Vector2(0.55, -0.22), new THREE.Vector2(1.25, -0.04),
    new THREE.Vector2(1.3, 0.02), new THREE.Vector2(0.95, 0.16), new THREE.Vector2(0.5, 0.22), new THREE.Vector2(0.001, 0.24),
  ], 48);
  body.add(new THREE.Mesh(hull, new THREE.MeshStandardMaterial({ color: 0xc9d2e0, roughness: 0.25, metalness: 0.85 })));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x7fe0ff, emissive: 0x2a8cb0, emissiveIntensity: 0.8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
  dome.position.y = 0.2;
  body.add(dome);
  const bulbs = [];
  const colors = [0xff5a5a, 0xffd23f, 0x6cff8a, 0x5ab4ff, 0xff7ae0];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
    b.position.set(Math.cos(a) * 1.18, 0.0, Math.sin(a) * 1.18);
    body.add(b);
    bulbs.push(b);
  }
  const under = glowSprite(0x8fe8ff, 2.2, 0.6);
  under.position.y = -0.35;
  body.add(under);
  let t = 0;
  let spin = 0;
  root.userData = {
    update(dt) {
      t += dt;
      body.rotation.y += dt * 1.2;
      bulbs.forEach((b, i) => { b.visible = Math.sin(t * 6 - i * 0.8) > -0.3; });
      if (spin > 0) {
        spin = Math.max(0, spin - dt);
        body.rotation.z = Math.sin((1 - spin / 1.2) * Math.PI * 2) * 0.6;
        root.position.y += Math.sin((1 - spin / 1.2) * Math.PI) * dt * 2;
      } else {
        body.rotation.z = Math.sin(t * 1.5) * 0.12;
      }
    },
    pirouette() { spin = 1.2; },
  };
  return root;
}

// ---------------------------------------------------------------------------
// Shooting star (golden star sprite with a trail) and ice crystal
// ---------------------------------------------------------------------------
export const starTexture = canvasTex(128, 128, (g, w) => {
  const c = w / 2;
  const grd = g.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0, 'rgba(255,230,150,0.9)');
  grd.addColorStop(0.35, 'rgba(255,200,80,0.35)');
  grd.addColorStop(1, 'rgba(255,180,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, w);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 16 : 40;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#ffe27a';
  g.shadowColor = '#fff3c0';
  g.shadowBlur = 10;
  g.fill();
});

export function createShootingStar() {
  const g = new THREE.Group();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(3, 3, 1);
  g.add(s);
  const trail = [];
  for (let i = 0; i < 6; i++) {
    const t = glowSprite(0xffd27a, 1.8 - i * 0.22, 0.5 - i * 0.07);
    g.add(t);
    trail.push(t);
  }
  g.userData = { star: s, trail };
  return g;
}

export function createCrystal() {
  const g = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(0.6, 0);
  geo.scale(0.8, 1.5, 0.8);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xc8f4ff, emissive: 0x58c8ff, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true,
  }));
  g.add(m, glowSprite(0x9fe6ff, 3.2, 0.7));
  g.userData.mesh = m;
  return g;
}

// ---------------------------------------------------------------------------
// Mars rover
// ---------------------------------------------------------------------------
export function createRover() {
  const root = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.5, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x6c6e74, roughness: 0.5, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a640, roughness: 0.35, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.9), white);
  body.position.y = 0.62;
  root.add(body);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.8), gold);
  deck.position.y = 0.84;
  root.add(deck);
  const wheels = [];
  for (const x of [-0.55, 0, 0.55]) {
    for (const z of [-0.55, 0.55]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20), dark);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.2, z);
      root.add(w);
      wheels.push(w);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), grey);
      leg.position.set(x, 0.42, z * 0.85);
      root.add(leg);
    }
  }
  // mast + camera head
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.75, 10), grey);
  mast.position.set(0.45, 1.2, 0.25);
  root.add(mast);
  const head = new THREE.Group();
  head.position.set(0.45, 1.62, 0.25);
  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.2), white);
  head.add(headBox);
  for (const z of [-0.05, 0.05]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x335577, roughness: 0.1 }));
    eye.rotation.z = Math.PI / 2;
    eye.position.set(0.17, 0, z);
    head.add(eye);
  }
  root.add(head);
  // arm with a scoop at the front
  const arm = new THREE.Group();
  arm.position.set(0.68, 0.6, -0.2);
  const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), grey);
  a1.position.x = 0.25;
  arm.add(a1);
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), gold);
  scoop.position.set(0.52, -0.05, 0);
  arm.add(scoop);
  arm.rotation.z = -0.5;
  root.add(arm);
  // antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), white);
  ant.position.set(-0.35, 0.95, -0.25);
  root.add(ant);
  root.userData = {
    wheels, arm, head,
    roll(dist) { wheels.forEach((w) => { w.rotation.y += dist / 0.2; }); },
  };
  return root;
}

// ---------------------------------------------------------------------------
// Astronaut
// ---------------------------------------------------------------------------
export function createAstronaut() {
  const root = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a8d94, roughness: 0.6, metalness: 0.3 });
  const visor = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.08, metalness: 0.95, emissive: 0x3a2a08 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.42, 6, 16), suit);
  torso.position.y = 1.0;
  root.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.24), suit);
  pack.position.set(0, 1.05, -0.3);
  root.add(pack);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 16), suit);
  helmet.position.y = 1.58;
  root.add(helmet);
  const vis = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.25, Math.PI * 0.45), visor);
  vis.position.set(0, 1.58, 0.1);
  root.add(vis);
  const limb = (r, len, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), suit);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    root.add(m);
    return m;
  };
  const armL = limb(0.09, 0.4, -0.38, 1.05, 0, 0.35);
  const armR = limb(0.09, 0.4, 0.38, 1.05, 0, -0.35);
  const legL = limb(0.11, 0.42, -0.14, 0.42, 0);
  const legR = limb(0.11, 0.42, 0.14, 0.42, 0);
  for (const x of [-0.14, 0.14]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.3), grey);
    boot.position.set(x, 0.06, 0.04);
    root.add(boot);
  }
  root.userData = { armL, armR, legL, legR };
  return root;
}

// Flag with a gold star, and the child's name if given.
export function createFlag(name) {
  const root = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 }));
  pole.position.y = 0.9;
  root.add(pole);
  const tex = canvasTex(512, 320, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#3a6fe0');
    grd.addColorStop(1, '#6a4fd0');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(110, h / 2);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 34 : 80;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#ffd34a';
    g.fill();
    g.restore();
    if (name) {
      g.fillStyle = '#ffffff';
      let size = 90;
      g.font = `900 ${size}px Nunito, sans-serif`;
      while (g.measureText(name).width > 300 && size > 30) { size -= 6; g.font = `900 ${size}px Nunito, sans-serif`; }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, 345, h / 2);
    }
  });
  const flagGeo = new THREE.PlaneGeometry(1.0, 0.62, 16, 4);
  flagGeo.translate(0.5, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }));
  flag.position.y = 1.45;
  root.add(flag);
  // a gentle wave (there is no wind on the Moon, but the flag keeps a ripple
  // from being planted, like the real Apollo flags)
  const base = flagGeo.attributes.position.array.slice();
  let t = 0;
  root.userData.update = (dt) => {
    t += dt;
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3];
      p.setZ(i, Math.sin(x * 6 - t * 2) * 0.04 * x);
    }
    p.needsUpdate = true;
  };
  return root;
}
