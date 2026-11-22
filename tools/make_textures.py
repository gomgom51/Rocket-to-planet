#!/usr/bin/env python3
"""Prepare the planet textures used by the game.

Usage:
    python3 tools/make_textures.py <astraeus_textures_dir> <output_dir>

<astraeus_textures_dir> is the ``src/assets/textures`` folder of the npm
package ``astraeus`` (MIT code, pictures credited in its NOTICE file):
  * Earth: NASA Earth Observatory, Blue Marble Next Generation (public domain)
  * Sun, Mercury, Mars, Jupiter, Saturn, Uranus, Neptune: Solar System Scope
    (https://www.solarsystemscope.com/textures), CC BY 4.0, based on NASA data

The Venus cloud layer, Saturn's rings and the Milky Way background are
generated procedurally here (no third-party pictures).
"""
import os
import sys

import numpy as np
from PIL import Image

RNG = np.random.default_rng(7)


# --------------------------------------------------------------------------
# Small 3D value-noise implementation (vectorised, seamless on the sphere
# because we sample it with 3D coordinates of the unit sphere).
# --------------------------------------------------------------------------
class Noise3:
    def __init__(self, seed, size=256):
        rng = np.random.default_rng(seed)
        self.size = size
        self.values = rng.random(size ** 3).astype(np.float32).reshape(size, size, size)

    def __call__(self, x, y, z):
        s = self.size
        xi = np.floor(x).astype(np.int64)
        yi = np.floor(y).astype(np.int64)
        zi = np.floor(z).astype(np.int64)
        xf, yf, zf = x - xi, y - yi, z - zi
        u = xf * xf * (3 - 2 * xf)
        v = yf * yf * (3 - 2 * yf)
        w = zf * zf * (3 - 2 * zf)
        x0, y0, z0 = xi % s, yi % s, zi % s
        x1, y1, z1 = (xi + 1) % s, (yi + 1) % s, (zi + 1) % s
        V = self.values

        def lerp(a, b, t):
            return a + (b - a) * t

        c00 = lerp(V[x0, y0, z0], V[x1, y0, z0], u)
        c10 = lerp(V[x0, y1, z0], V[x1, y1, z0], u)
        c01 = lerp(V[x0, y0, z1], V[x1, y0, z1], u)
        c11 = lerp(V[x0, y1, z1], V[x1, y1, z1], u)
        return lerp(lerp(c00, c10, v), lerp(c01, c11, v), w)

    def fbm(self, x, y, z, octaves=5, lacunarity=2.0, gain=0.5):
        total = np.zeros_like(x, dtype=np.float32)
        amp, freq, norm = 1.0, 1.0, 0.0
        for o in range(octaves):
            total += amp * self(x * freq + o * 17.1, y * freq + o * 9.3, z * freq + o * 3.7)
            norm += amp
            amp *= gain
            freq *= lacunarity
        return total / norm


def sphere_grid(w, h):
    lon = (np.arange(w, dtype=np.float32) + 0.5) / w * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(h, dtype=np.float32) + 0.5) / h * np.pi
    lon, lat = np.meshgrid(lon, lat)
    x = np.cos(lat) * np.cos(lon)
    y = np.sin(lat)
    z = np.cos(lat) * np.sin(lon)
    return x, y, z, lat, lon


def smoothstep(a, b, t):
    t = np.clip((t - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def make_venus(path, w=2048, h=1024):
    """Venus as seen in visible light: pale golden cloud deck, soft streaks."""
    n1, n2 = Noise3(11), Noise3(12)
    x, y, z, lat, lon = sphere_grid(w, h)
    s = 3.0
    # domain warp, stretched along longitude (strong zonal winds)
    wx = n2.fbm(x * s, y * s * 3, z * s, 4) - 0.5
    wz = n2.fbm(x * s + 5, y * s * 3 + 5, z * s + 5, 4) - 0.5
    f = n1.fbm((x + wx * 0.9) * 2.2, y * 9.0 + wx * 2.0, (z + wz * 0.9) * 2.2, 6)
    # the classic dark "Y" / chevron shapes drift along the equator
    chevron = np.sin(lon * 1.0 + np.abs(lat) * 5.0 + f * 4.0) * 0.5 + 0.5
    bands = np.sin(lat * 7.0 + f * 5.0) * 0.5 + 0.5
    t = 0.55 * f + 0.25 * bands + 0.20 * chevron
    t = (t - t.min()) / (t.max() - t.min())
    dark = np.array([176, 128, 64], np.float32)   # ochre
    mid = np.array([222, 184, 118], np.float32)   # golden
    light = np.array([246, 228, 184], np.float32)  # cream
    a = smoothstep(0.15, 0.55, t)[..., None]
    b = smoothstep(0.5, 0.95, t)[..., None]
    col = dark * (1 - a) + mid * a
    col = col * (1 - b) + light * b
    # brighter, hazier polar collars
    polar = smoothstep(0.9, 1.35, np.abs(lat))[..., None]
    col = col * (1 - polar * 0.5) + light * polar * 0.5
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(path, quality=88)


def make_rings(path, w=1024, h=16):
    """Radial colour/alpha strip for Saturn's rings (u: 1.20 -> 2.35 Saturn radii)."""
    r = 1.20 + (np.arange(w, dtype=np.float32) + 0.5) / w * (2.35 - 1.20)
    alpha = np.zeros(w, np.float32)
    bright = np.zeros(w, np.float32)

    def band(r0, r1, a, b):
        m = (r >= r0) & (r < r1)
        alpha[m] = a
        bright[m] = b

    band(1.239, 1.527, 0.22, 0.55)   # C ring (faint, darker)
    band(1.527, 1.951, 0.92, 1.00)   # B ring (bright, dense)
    band(1.951, 2.027, 0.07, 0.40)   # Cassini division
    band(2.027, 2.269, 0.70, 0.88)   # A ring
    band(2.214, 2.220, 0.05, 0.40)   # Encke gap
    band(2.262, 2.266, 0.10, 0.40)   # Keeler gap
    band(2.320, 2.330, 0.35, 0.80)   # F ring
    # B ring is brighter in its middle, C ring has plateaus
    mB = (r >= 1.527) & (r < 1.951)
    bright[mB] *= 0.85 + 0.15 * np.sin((r[mB] - 1.527) / 0.424 * np.pi)
    # fine ringlets
    fine = np.zeros(w, np.float32)
    rng = np.random.default_rng(3)
    for scale, amp in ((3, 0.18), (9, 0.12), (27, 0.08)):
        k = rng.random(w // scale + 2)
        fine += amp * (np.interp(np.arange(w) / scale, np.arange(len(k)), k) - 0.5)
    alpha = np.clip(alpha * (1 + fine * 1.5), 0, 1)
    bright = np.clip(bright * (1 + fine), 0, 1.1)
    # soft edges
    alpha = np.convolve(alpha, np.ones(3) / 3, mode="same")
    base = np.array([226, 205, 170], np.float32)
    inner = np.array([150, 130, 110], np.float32)
    mix = smoothstep(1.3, 1.7, r)[:, None]
    col = (inner * (1 - mix) + base * mix) * bright[:, None]
    img = np.zeros((h, w, 4), np.uint8)
    img[..., :3] = np.clip(col, 0, 255).astype(np.uint8)[None, :, :]
    img[..., 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)[None, :]
    Image.fromarray(img, "RGBA").save(path)


def make_milkyway(path, w=2048, h=1024):
    """Faint Milky Way band + dim background stars (equirectangular)."""
    n = Noise3(21)
    x, y, z, lat, lon = sphere_grid(w, h)
    # galactic plane: tilt the band by rotating around the z axis
    t = np.radians(62)
    gy = -x * np.sin(t) + y * np.cos(t)
    d = np.abs(gy)
    f = n.fbm(x * 3, y * 3, z * 3, 6)
    f2 = n.fbm(x * 9 + 3, y * 9, z * 9, 5)
    glow = np.exp(-(d / 0.22) ** 2) * (0.35 + 0.9 * f) + np.exp(-(d / 0.55) ** 2) * 0.12
    # bulge towards one side
    bulge = np.exp(-(((x - 0.85) ** 2 + (z + 0.35) ** 2) / 0.25)) * np.exp(-(d / 0.3) ** 2)
    glow += bulge * 0.6
    dust = smoothstep(0.45, 0.75, f2) * np.exp(-(d / 0.08) ** 2)
    glow = np.clip(glow - dust * 0.5, 0, None)
    warm = np.array([255, 236, 214], np.float32)
    cool = np.array([170, 190, 255], np.float32)
    mix = np.clip(bulge * 2, 0, 1)[..., None]
    col = (cool * (1 - mix) + warm * mix) * (glow[..., None] * 0.20)
    # dim stars
    count = 9000
    sx = RNG.integers(0, w, count)
    sy = RNG.integers(0, h, count)
    br = RNG.random(count) ** 3 * 150 + 25
    col[sy, sx] += br[:, None]
    col += np.array([3, 4, 9], np.float32)
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(path, quality=90)


def resize_copy(src, dst, size):
    im = Image.open(src).convert("RGB")
    if im.size != size:
        im = im.resize(size, Image.LANCZOS)
    im.save(dst, quality=88, optimize=True)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    small = os.path.join(out, "small")
    os.makedirs(small, exist_ok=True)
    files = {
        "mercury": "mercury-2k.jpg",
        "earth": "earth-bmng-july-4k.jpg",
        "mars": "mars-2k.jpg",
        "jupiter": "jupiter-2k.jpg",
        "saturn": "saturn-2k.jpg",
        "uranus": "uranus-2k.jpg",
        "neptune": "neptune-2k.jpg",
        "sun": "sun-2k.jpg",
    }
    for name, f in files.items():
        resize_copy(os.path.join(src, f), os.path.join(out, name + ".jpg"), (2048, 1024))
    make_venus(os.path.join(out, "venus.jpg"))
    for name in list(files) + ["venus"]:
        resize_copy(os.path.join(out, name + ".jpg"), os.path.join(small, name + ".jpg"), (512, 256))
    make_rings(os.path.join(out, "saturn_rings.png"))
    make_milkyway(os.path.join(out, "milkyway.jpg"))
    print("done")


if __name__ == "__main__":
    main()
