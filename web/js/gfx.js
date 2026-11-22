// Rendering building blocks: textures, planets, stars, rocket, particles.

import * as THREE from '../vendor/three.module.min.js';
import { COLORS, DEFAULT_STYLE } from './data.js';
import { cometGeometry, createCometTails } from './models.js';

export { THREE };

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
const texLoader = new THREE.TextureLoader();
const texCache = new Map();

export function loadTexture(url, { srgb = true } = {}) {
  if (texCache.has(url)) return texCache.get(url);
  const p = new Promise((resolve, reject) => {
    texLoader.load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      resolve(t);
    }, undefined, reject);
  });
  texCache.set(url, p);
  return p;
}

export function releaseTexture(url) {
  const p = texCache.get(url);
  if (p) {
    texCache.delete(url);
    p.then((t) => t.dispose()).catch(() => {});
  }
}

export const planetTexUrl = (id, small = false) => `textures/${small ? 'small/' : ''}${id}.jpg`;

function canvasTexture(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft round glow (for the Sun, the engine, sparkles).
export const glowTexture = canvasTexture(128, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0.6)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

// Billowing smoke puff: a soft disc made of many blurred blobs.
export const smokeTexture = canvasTexture(128, (g, s) => {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * s * 0.22;
    const x = s / 2 + Math.cos(a) * r;
    const y = s / 2 + Math.sin(a) * r;
    const rad = s * (0.14 + Math.random() * 0.16);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = 215 + Math.floor(Math.random() * 40);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.32)`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  }
});

// ---------------------------------------------------------------------------
// Background: Milky Way sphere + point stars
// ---------------------------------------------------------------------------
export function createSky(milkyWayTex, { radius = 900, stars = 2600 } = {}) {
  const group = new THREE.Group();
  const mwMat = new THREE.MeshBasicMaterial({
    map: milkyWayTex, side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 1, fog: false,
  });
  const mw = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 48, 24), mwMat);
  mw.renderOrder = -10;
  group.add(mw);

  const pos = new Float32Array(stars * 3);
  const col = new Float32Array(stars * 3);
  const size = new Float32Array(stars);
  const tints = [[0.75, 0.85, 1.0], [1, 1, 1], [1, 0.95, 0.85], [1, 0.85, 0.7], [0.9, 0.93, 1]];
  for (let i = 0; i < stars; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos.set([r * Math.cos(th) * radius, u * radius, r * Math.sin(th) * radius], i * 3);
    const tint = tints[Math.floor(Math.random() * tints.length)];
    const b = 0.55 + Math.random() * 0.45;
    col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
    const m = Math.random();
    size[i] = m > 0.985 ? 3.6 + Math.random() * 1.8 : m > 0.9 ? 2.4 : 1.2 + Math.random() * 1.0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }, uOpacity: { value: 1 } },
    vertexShader: `
      attribute float size; attribute vec3 color; varying vec3 vColor;
      uniform float uPixelRatio;
      void main(){ vColor = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        gl_PointSize = size * uPixelRatio; }`,
    fragmentShader: `
      varying vec3 vColor; uniform float uOpacity;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a;
        gl_FragColor = vec4(vColor, a * uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const pts = new THREE.Points(geo, starMat);
  pts.renderOrder = -9;
  group.add(pts);
  group.setOpacity = (o) => { mwMat.opacity = o; starMat.uniforms.uOpacity.value = o; group.visible = o > 0.001; };
  return group;
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------
const atmoVertex = `
  varying vec3 vN; varying vec3 vP;
  void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp; }`;

function createAtmosphere(radius, a) {
  const uniforms = {
    uColor: { value: new THREE.Color(...a.color) },
    uSun: { value: new THREE.Vector3(1, 0, 0) },
    uHalo: { value: a.halo },
    uHaze: { value: a.haze },
  };
  // Outer halo (seen around the limb).
  const k = 1.09;
  const s0 = Math.sqrt(1 - 1 / (k * k));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * k, 64, 32), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uSun; uniform float uHalo; varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 V = normalize(cameraPosition - vP);
        float ndv = dot(-vN, V);
        float i = pow(clamp(ndv / ${s0.toFixed(4)}, 0.0, 1.0), 3.0);
        float lit = smoothstep(-0.35, 0.45, dot(vN, uSun));
        gl_FragColor = vec4(uColor * i * lit * uHalo, 1.0);
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  // Inner haze on the planet's lit limb.
  const haze = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.004, 64, 32), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uSun; uniform float uHaze; varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 V = normalize(cameraPosition - vP);
        float f = pow(1.0 - max(dot(vN, V), 0.0), 2.6);
        float lit = smoothstep(-0.2, 0.6, dot(vN, uSun));
        gl_FragColor = vec4(uColor * f * lit * uHaze, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const g = new THREE.Group();
  g.add(halo, haze);
  g.userData.uniforms = uniforms;
  return g;
}

function createRings(radius, ringTex) {
  const inner = radius * 1.2;
  const outer = radius * 2.35;
  const geo = new THREE.RingGeometry(inner, outer, 160, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: ringTex },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: radius },
      uNormal: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vP;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 uSun; uniform vec3 uCenter; uniform float uRadius; uniform vec3 uNormal;
      varying vec2 vUv; varying vec3 vP;
      void main(){
        vec4 c = texture2D(map, vec2(vUv.x, 0.5));
        // planet shadow on the rings
        vec3 toC = uCenter - vP;
        float t = dot(toC, uSun);
        float d = length(toC - uSun * t);
        float shadow = (t > 0.0) ? smoothstep(uRadius * 0.97, uRadius * 1.03, d) : 1.0;
        float lit = 0.35 + 0.75 * abs(dot(uNormal, uSun));
        vec3 col = c.rgb * lit * (0.18 + 0.82 * shadow);
        gl_FragColor = vec4(col, c.a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

/**
 * Build a planet. Returns { group, update(dt), setSun(dirWorld) }.
 * `group` holds the axial tilt; the body spins inside it.
 */
export function createPlanet(def, tex, { radius = 1, segments = 64, ringTex = null, sun = false } = {}) {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = def ? def.tilt : 0;
  group.add(tilt);
  const mat = sun
    ? new THREE.MeshBasicMaterial({ map: tex })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
  const comet = def && def.kind === 'comet';
  const geo = comet ? cometGeometry(radius) : new THREE.SphereGeometry(radius, segments, Math.round(segments / 2));
  const body = new THREE.Mesh(geo, mat);
  tilt.add(body);
  let atmo = null;
  let rings = null;
  let tails = null;
  let time = 0;
  if (comet) { tails = createCometTails(radius); group.add(tails); }
  if (def && def.atmosphere) { atmo = createAtmosphere(radius, def.atmosphere); group.add(atmo); }
  if (def && def.rings && ringTex) { rings = createRings(radius, ringTex); tilt.add(rings); }
  const sunDir = new THREE.Vector3(1, 0, 0);
  const tmp = new THREE.Vector3();
  const api = {
    group, body, rings, radius, tails,
    update(dt) {
      time += dt;
      if (api.spinning !== false) body.rotation.y += dt * (def ? def.spin : 0.02);
      if (tails) tails.userData.update(time);
      if (rings) {
        const u = rings.material.uniforms;
        group.updateMatrixWorld();
        u.uCenter.value.setFromMatrixPosition(group.matrixWorld);
        u.uSun.value.copy(sunDir);
        u.uNormal.value.set(0, 1, 0).applyQuaternion(rings.getWorldQuaternion(new THREE.Quaternion()));
        u.uRadius.value = radius * group.getWorldScale(tmp).x;
      }
    },
    setSun(dir) {
      sunDir.copy(dir).normalize();
      if (atmo) atmo.userData.uniforms.uSun.value.copy(sunDir);
      if (tails) tails.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir.clone().negate());
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// Rocket (built along +Y, origin at the base of the body)
// ---------------------------------------------------------------------------
// ---- rocket paint (colours, decorations, name) -----------------------------
const colorHex = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function starPath(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}
function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  g.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  g.closePath();
}

export const ROCKET_TEX_W = 1024;
export const ROCKET_TEX_H = 1260;

/** Paint the rocket body (canvas spans the whole circumference; x = W/2 is the front). */
export function paintRocket(g, w, h, style, name) {
  const body = colorHex(style.body);
  const fins = colorHex(style.fins);
  const light = luminance(body) > 0.55;
  const ink = light ? '#1c1c24' : '#f6f6f2';
  g.fillStyle = body;
  g.fillRect(0, 0, w, h);
  const random = rng(11);
  const zone = name ? { x0: w * 0.37, x1: w * 0.63, y0: h * 0.06, y1: h * 0.96 } : null;
  const free = (x, y, r) => !zone || x + r < zone.x0 || x - r > zone.x1 || y + r < zone.y0 || y - r > zone.y1;
  const wrap = (x, y, r, draw) => { draw(x, y); if (x - r < 0) draw(x + w, y); if (x + r > w) draw(x - w, y); };
  const scatter = (cols, rows, rMin, rMax, drawOne) => {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5 + (j % 2) * 0.5) / cols) * w + (random() - 0.5) * (w / cols) * 0.4;
        const y = ((j + 0.5) / rows) * h + (random() - 0.5) * (h / rows) * 0.4;
        const r = rMin + random() * (rMax - rMin);
        if (free(x, y, r)) wrap(x, y, r, (xx, yy) => drawOne(xx, yy, r, i + j));
      }
    }
  };
  const Y = (yy) => (1 - (yy - 0.12) / (2.9 - 0.12)) * h; // rocket height -> canvas y
  switch (style.decor) {
    case 'classic': {
      g.fillStyle = light ? '#18181c' : '#f2f2ee';
      g.fillRect(0, Y(0.92), w, Y(0.8) - Y(0.92));
      g.fillRect(0, Y(2.47), w, Y(2.37) - Y(2.47));
      for (const u of [0.125, 0.625]) g.fillRect(u * w, Y(0.79), w * 0.25, Y(0.17) - Y(0.79));
      for (const u of [0.375, 0.875]) {
        g.fillRect(u * w, Y(2.9), w * 0.25, Y(2.58) - Y(2.9));
        if (u === 0.875) g.fillRect(-0.125 * w, Y(2.9), w * 0.25, Y(2.58) - Y(2.9));
      }
      break;
    }
    case 'stars':
      scatter(7, 8, 34, 58, (x, y, r, k) => { g.fillStyle = k % 3 ? '#ffd34a' : fins; starPath(g, x, y, r); g.fill(); });
      break;
    case 'hearts':
      scatter(7, 8, 34, 52, (x, y, r, k) => { g.fillStyle = k % 3 === 0 ? '#ff7ab8' : k % 3 === 1 ? '#e8334a' : fins; heartPath(g, x, y, r); g.fill(); });
      break;
    case 'dots':
      scatter(8, 10, 30, 30, (x, y, r) => { g.fillStyle = fins; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
      break;
    case 'planets': {
      const pc = ['#e8a050', '#6fa8ff', '#d6524a', '#f2d48a', '#9be0e8', '#b98cff'];
      scatter(6, 7, 30, 46, (x, y, r, k) => {
        g.fillStyle = pc[k % pc.length];
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        if (k % 2 === 0) {
          g.strokeStyle = light ? 'rgba(40,40,50,0.8)' : 'rgba(255,255,255,0.85)';
          g.lineWidth = 7;
          g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, Math.PI * 2); g.stroke();
        }
      });
      break;
    }
    case 'rainbow': {
      const rc = ['#e8334a', '#f08a2e', '#f5c533', '#3fb36b', '#2f9ad8', '#3a55c8', '#8a5cd6'];
      const band = h * 0.032;
      rc.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, h * 0.66 + i * band, w, band); });
      rc.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, h * 0.08 + i * band * 0.5, w, band * 0.5); });
      break;
    }
    case 'flames': {
      for (let i = 0; i < 14; i++) {
        const x = (i + 0.5) / 14 * w;
        const top = h * (0.5 + random() * 0.2);
        const wd = w / 14 * 0.75;
        const grd = g.createLinearGradient(0, h, 0, top);
        grd.addColorStop(0, '#e8334a');
        grd.addColorStop(0.5, '#f08a2e');
        grd.addColorStop(1, '#ffd34a');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(x - wd, h);
        g.quadraticCurveTo(x - wd * 1.1, top + (h - top) * 0.4, x, top);
        g.quadraticCurveTo(x + wd * 1.1, top + (h - top) * 0.4, x + wd, h);
        g.closePath();
        g.fill();
      }
      break;
    }
    default:
      break;
  }
  if (name) {
    let size = 170;
    g.font = `900 ${size}px Nunito, sans-serif`;
    while (g.measureText(name).width > h * 0.82 && size > 60) { size -= 8; g.font = `900 ${size}px Nunito, sans-serif`; }
    g.save();
    g.translate(w / 2, h * 0.52);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fill = style.fins !== style.body && Math.abs(luminance(fins) - luminance(body)) > 0.25 ? fins : ink;
    g.lineJoin = 'round';
    g.lineWidth = size * 0.16;
    g.strokeStyle = luminance(fill) > 0.55 ? 'rgba(20,20,30,0.85)' : 'rgba(255,255,255,0.92)';
    g.strokeText(name, 0, 0);
    g.fillStyle = fill;
    g.fillText(name, 0, 0);
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// Rocket (built along +Y, origin at the base of the body)
// ---------------------------------------------------------------------------
export function createRocket(style = DEFAULT_STYLE, name = '') {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const canvas = document.createElement('canvas');
  canvas.width = ROCKET_TEX_W;
  canvas.height = ROCKET_TEX_H;
  const bodyTex = new THREE.CanvasTexture(canvas);
  bodyTex.colorSpace = THREE.SRGBColorSpace;
  bodyTex.anisotropy = 4;
  const paintMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.38, metalness: 0.12 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.38, metalness: 0.12 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0xc41f2b, roughness: 0.38, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x5e6168, roughness: 0.32, metalness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d3d66, roughness: 0.08, metalness: 0.6, emissive: 0x0a1a33 });
  const R = 0.36;
  const H = 2.9;  // cylinder height
  const N = 1.45; // nose height

  // rounded base + painted body cylinder (u = 0.5 faces +Z, the porthole side)
  model.add(new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.30, 0), new THREE.Vector2(R, 0.12),
  ], 48), bodyMat));
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H - 0.12, 64, 1, true, Math.PI, Math.PI * 2), paintMat);
  cyl.position.y = 0.12 + (H - 0.12) / 2;
  model.add(cyl);

  // ogive nose: body colour, tip in the fin colour
  const noseR = (t) => R * Math.pow(Math.max(0, 1 - t * t), 0.62);
  const nosePts = (t0, t1) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = t0 + (t1 - t0) * (i / 14);
      pts.push(new THREE.Vector2(Math.max(noseR(t), 0.001), H + t * N));
    }
    return pts;
  };
  model.add(new THREE.Mesh(new THREE.LatheGeometry(nosePts(0, 0.62), 48), bodyMat));
  model.add(new THREE.Mesh(new THREE.LatheGeometry(nosePts(0.62, 1), 48), finMat));

  function applyStyle(st, nm) {
    const s = { ...DEFAULT_STYLE, ...(st || {}) };
    paintRocket(canvas.getContext('2d'), canvas.width, canvas.height, s, s.name ? (nm || '') : '');
    bodyTex.needsUpdate = true;
    bodyMat.color.set(colorHex(s.body));
    finMat.color.set(colorHex(s.fins));
  }
  applyStyle(style, name);

  // porthole facing +Z
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 10, 32), metal);
  rim.position.set(0, 3.12, noseR(0.15) + 0.0);
  rim.rotation.x = -0.25;
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), glass);
  win.position.copy(rim.position).add(new THREE.Vector3(0, 0, -0.005));
  win.rotation.x = -0.25;
  model.add(rim, win);

  // fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 1.15);
  finShape.lineTo(0.6, 0.35);
  finShape.lineTo(0.64, -0.22);
  finShape.lineTo(0, 0.12);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
  finGeo.translate(0, 0, -0.025);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    const a = i * Math.PI / 2 + Math.PI / 4;
    fin.position.set(Math.sin(a) * (R - 0.03), 0, Math.cos(a) * (R - 0.03));
    fin.rotation.y = a - Math.PI / 2;
    model.add(fin);
  }

  // engine bell
  const bell = new THREE.LatheGeometry([
    new THREE.Vector2(0.13, 0.02), new THREE.Vector2(0.15, -0.06), new THREE.Vector2(0.22, -0.26), new THREE.Vector2(0.27, -0.4),
  ], 32);
  const bellMesh = new THREE.Mesh(bell, new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }));
  model.add(bellMesh);

  // flame
  const flame = new THREE.Group();
  flame.position.y = -0.4;
  model.add(flame);
  const flameMat = (c0, c1, alpha) => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uC0: { value: new THREE.Color(c0) }, uC1: { value: new THREE.Color(c1) }, uAlpha: { value: alpha } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uC0; uniform vec3 uC1; uniform float uAlpha;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float t = vUv.y;
        float flick = 0.85 + 0.15 * sin(uTime * 45.0 + t * 18.0 + vUv.x * 6.283);
        float a = pow(1.0 - t, 1.6) * pow(abs(dot(vN, vV)), 1.3) * flick * uAlpha;
        vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.7, t));
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cone = (r, h, mat) => {
    const g = new THREE.ConeGeometry(r, h, 24, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, -h / 2, 0);
    return new THREE.Mesh(g, mat);
  };
  const outer = cone(0.3, 2.1, flameMat(0xffc46a, 0xff5a12, 1.0));
  const inner = cone(0.17, 1.05, flameMat(0xffffff, 0xffd27a, 1.3));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(1.8, 1.8, 1);
  glow.position.y = -0.25;
  flame.add(outer, inner, glow);

  let thrust = 0;
  let time = 0;
  root.userData = {
    flame,
    applyStyle,
    setThrust(v) { thrust = v; },
    getThrust() { return thrust; },
    update(dt) {
      time += dt;
      flame.visible = thrust > 0.01;
      const f = 1 + Math.sin(time * 37) * 0.05 + (Math.random() - 0.5) * 0.08;
      flame.scale.set(0.6 + 0.4 * thrust, (0.25 + 0.75 * thrust) * f, 0.6 + 0.4 * thrust);
      outer.material.uniforms.uTime.value = time;
      inner.material.uniforms.uTime.value = time * 1.3;
      glow.material.opacity = Math.min(1, thrust * 1.2);
    },
  };
  return root;
}

// ---------------------------------------------------------------------------
// Smoke / steam particles (pooled sprites)
// ---------------------------------------------------------------------------
export class Particles {
  constructor(parent, max = 160, texture = smokeTexture) {
    this.items = [];
    this.free = [];
    for (let i = 0; i < max; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0 }));
      s.visible = false;
      parent.add(s);
      const p = { s, vel: new THREE.Vector3(), life: 0, max: 1, s0: 1, s1: 2, o: 1, c0: new THREE.Color(), c1: new THREE.Color(), drag: 0.5, rot: 0 };
      this.items.push(p);
      this.free.push(p);
    }
  }

  emit(pos, vel, { life = 3, size0 = 1, size1 = 4, opacity = 0.8, color0 = 0xffffff, color1 = 0xffffff, drag = 0.6 } = {}) {
    let p = this.free.pop();
    if (!p) { // recycle the oldest
      p = this.items.reduce((a, b) => (a.life / a.max > b.life / b.max ? a : b));
    }
    p.s.position.copy(pos);
    p.vel.copy(vel);
    p.life = 0;
    p.max = life;
    p.s0 = size0;
    p.s1 = size1;
    p.o = opacity;
    p.drag = drag;
    p.c0.set(color0);
    p.c1.set(color1);
    p.s.material.rotation = Math.random() * Math.PI * 2;
    p.rot = (Math.random() - 0.5) * 0.6;
    p.s.visible = true;
    p.alive = true;
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.alive = false;
        p.s.visible = false;
        this.free.push(p);
        continue;
      }
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.s.position.addScaledVector(p.vel, dt);
      const size = p.s0 + (p.s1 - p.s0) * Math.sqrt(k);
      p.s.scale.set(size, size, 1);
      p.s.material.opacity = p.o * Math.min(1, k * 8) * (1 - k) * (1 - k);
      p.s.material.color.copy(p.c0).lerp(p.c1, Math.min(1, k * 2.5));
      p.s.material.rotation += p.rot * dt;
    }
  }

  clear() {
    for (const p of this.items) {
      if (p.alive) { p.alive = false; p.s.visible = false; this.free.push(p); }
    }
  }
}

// Place an object so that it appears at NDC point (x, y) at distance `dist`.
export function placeAtScreen(camera, ndcX, ndcY, dist, out = new THREE.Vector3()) {
  camera.updateMatrixWorld();
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  return out.copy(camera.position).addScaledVector(dir, dist);
}

// Distance at which a sphere of `radius` spans `frac` of the screen's smaller side.
export function distanceForSize(camera, radius, frac) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanMin = Math.min(tanV, tanV * camera.aspect);
  return radius / (frac * tanMin);
}
