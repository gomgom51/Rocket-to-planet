// "Mon carnet de bord" (stamps + photos) and "Ma fusée" (rocket garage).

import { THREE, createSky, createRocket, paintRocket } from './gfx.js';
import { PLANETS, DESTINATIONS, BONUS, COLORS, DECORS, TEXT, cap } from './data.js';
import { progress, getStyle, setStyle, visitCount, visitedBase, bonusUnlocked, getPhotos } from './progress.js';
import { settings } from './settings.js';
import { fmtDate } from './i18n.js';

const $ = (id) => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// Carnet
// ---------------------------------------------------------------------------
export function buildCarnet(thumbs) {
  const stamps = $('stamps');
  stamps.innerHTML = '';
  const ids = DESTINATIONS.concat(bonusUnlocked() ? BONUS : []);
  ids.forEach((id, i) => {
    const p = PLANETS[id];
    const n = visitCount(id);
    const el = document.createElement('div');
    el.className = 'stamp' + (n ? '' : ' empty');
    el.style.transform = `rotate(${((i * 37) % 9) - 4}deg)`;
    el.innerHTML = `<img src="${thumbs[id]}" alt=""><div class="s-name">${cap(p.name)}</div>` +
      (n ? `<div class="s-date">${fmtDate(progress.visits[id].first)}</div>` : `<div class="s-date">${TEXT.notYet}</div>`) +
      (n > 1 ? `<div class="s-count">×${n}</div>` : '');
    stamps.appendChild(el);
  });
  if (!bonusUnlocked()) {
    const el = document.createElement('div');
    el.className = 'stamp locked';
    el.innerHTML = `🔒 ${TEXT.lockedStamp}<br><b>${visitedBase()} / 7</b>`;
    stamps.appendChild(el);
  }
  const photos = $('photos');
  photos.innerHTML = '';
  const list = getPhotos().slice().reverse();
  if (!list.length) {
    photos.innerHTML = `<div class="empty-note">${TEXT.noPhotos}</div>`;
  }
  list.forEach((ph) => {
    const img = document.createElement('img');
    img.src = ph.data;
    img.alt = '';
    img.addEventListener('click', () => {
      $('photo-big').src = ph.data;
      $('photo-view').classList.add('active');
    });
    photos.appendChild(img);
  });
}
$('photo-view').addEventListener('click', () => $('photo-view').classList.remove('active'));

// ---------------------------------------------------------------------------
// Garage: the rocket turns on a platform, options below
// ---------------------------------------------------------------------------
export class GarageScene {
  constructor(assets) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.sky = createSky(assets.milkyway, { radius: 900 });
    this.scene.add(this.sky);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(3, 5, 6);
    const rim = new THREE.DirectionalLight(0x8fb4ff, 1.6);
    rim.position.set(-4, 2, -5);
    this.scene.add(key, rim, new THREE.AmbientLight(0x8090b0, 0.35));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.25, 48), new THREE.MeshStandardMaterial({ color: 0x3a4258, roughness: 0.5, metalness: 0.6 }));
    pad.position.y = -0.55;
    this.scene.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffc94a }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.42;
    this.scene.add(ring);
    this.rocket = createRocket(getStyle(), settings.name.trim());
    this.rocket.position.y = -0.42 + 0.4;
    this.scene.add(this.rocket);
    this.t = 0;
    this.spin = 0;
  }

  restyle() { this.rocket.userData.applyStyle(getStyle(), settings.name.trim()); }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // rocket in the upper part of the screen, above the options panel
    const portrait = w < h;
    this.camera.position.set(0, 2.6, portrait ? 19 : 11);
    this.camera.lookAt(0, portrait ? -0.6 : 1.4, 0);
  }

  onTap() { this.spin = 1.2; }

  update(dt) {
    this.t += dt;
    this.spin = Math.max(0, this.spin - dt);
    this.rocket.rotation.y += dt * (0.6 + this.spin * 5);
    this.rocket.userData.setThrust(0);
    this.rocket.userData.update(dt);
  }
}

function decorIcon(decor, style) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 156;
  const g = c.getContext('2d');
  g.scale(128 / 1024, 156 / 1260); // paint at full size, scaled down
  paintRocket(g, 1024, 1260, { ...style, decor }, '');
  return c.toDataURL();
}

export function buildGarage(onChange, sfx, speak) {
  const style = getStyle();
  const swatchRow = (el, key) => {
    el.innerHTML = '';
    COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (style[key] === c.id ? ' on' : '');
      b.style.background = c.swatch || c.hex;
      b.setAttribute('aria-label', c.name);
      b.addEventListener('click', () => {
        setStyle({ [key]: c.id });
        sfx.select();
        speak(c.name, { silentWait: false });
        el.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
        decorRow();
        onChange();
      });
      el.appendChild(b);
    });
    // the row scrolls sideways: show the chosen colour in the middle
    const on = el.querySelector('.swatch.on');
    if (on) el.scrollLeft = Math.max(0, on.offsetLeft - el.offsetLeft - (el.clientWidth - on.offsetWidth) / 2);
  };
  const decorRow = () => {
    const el = $('g-decor');
    el.innerHTML = '';
    const st = getStyle();
    DECORS.forEach((d) => {
      const locked = progress.stars < d.stars;
      const b = document.createElement('button');
      b.className = 'decor' + (st.decor === d.id ? ' on' : '') + (locked ? ' locked' : '');
      b.style.backgroundImage = `url(${decorIcon(d.id, st)})`;
      b.innerHTML = (locked ? `<span class="lock">🔒<br>${d.stars} ★</span>` : '') + `<span>${d.name}</span>`;
      b.addEventListener('click', () => {
        if (locked) {
          sfx.gentle();
          speak(TEXT.decorLocked(d.stars, progress.stars), { silentWait: false });
          return;
        }
        setStyle({ decor: d.id });
        sfx.select();
        speak(d.name, { silentWait: false });
        el.querySelectorAll('.decor').forEach((x) => x.classList.toggle('on', x === b));
        onChange();
      });
      el.appendChild(b);
    });
  };
  swatchRow($('g-body'), 'body');
  swatchRow($('g-fins'), 'fins');
  decorRow();
  const hasName = !!settings.name.trim();
  $('g-name-row').style.display = hasName ? 'flex' : 'none';
  $('g-name').checked = style.name !== false;
  $('g-name-label').textContent = hasName ? TEXT.nameOnRocket(settings.name.trim()) : '';
  $('g-name').onchange = () => { setStyle({ name: $('g-name').checked }); sfx.select(); onChange(); };
}
