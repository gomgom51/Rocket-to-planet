#!/usr/bin/env python3
"""Textures of the bonus destinations (Moon, Europa, Titan, Pluto, comet).

Usage:
    python3 tools/make_bonus_textures.py <astraeus_textures_dir> <astraeus_data_textures_dir> <output_dir>

Sources (see the NOTICE files of the npm packages `astraeus` and `astraeus-data`):
  * Moon: NASA Scientific Visualization Studio, CGI Moon Kit (public domain)
  * Europa: USGS Astrogeology / NASA/JPL Galileo & Voyager (public domain)
  * Titan: NASA/JPL-Caltech/Space Science Institute (credit required)
  * Pluto: NASA/JHUAPL/SwRI, New Horizons (credit required)
The comet nucleus texture is generated here.

Areas that were never photographed (black in the maps) are filled from the
mirrored hemisphere, and Titan gets its orange hazy atmosphere colour.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from make_textures import Noise3, sphere_grid, smoothstep  # noqa: E402

SIZE = (2048, 1024)


def load(path):
    return np.asarray(Image.open(path).convert('RGB').resize(SIZE, Image.LANCZOS), dtype=np.float32)


def fill_black(a, threshold=14):
    """Replace unmapped (black) pixels with the mirrored latitude, softened."""
    lum = a.mean(axis=2)
    mask = lum < threshold
    mirrored = a[::-1, :, :]
    blurred = np.asarray(Image.fromarray(mirrored.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)
    out = a.copy()
    out[mask] = blurred[mask] * 0.92
    # soften the seam
    m = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), dtype=np.float32)[..., None] / 255
    return a * (1 - m) + out * m


def save(a, path):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(path, quality=88, optimize=True)


def make_europa(src, out):
    a = fill_black(load(src))
    lum = a.mean(axis=2, keepdims=True) / 255
    ice = np.array([236, 224, 204], np.float32)
    lineae = np.array([150, 104, 70], np.float32)
    # dark lines become reddish-brown, bright ice stays cream
    t = smoothstep(0.35, 0.8, lum)
    col = lineae * (1 - t) + ice * t
    col = col * (0.75 + 0.35 * lum)
    save(col, out)


def make_titan(src, out):
    a = load(src)
    lum = a.mean(axis=2) / 255
    n = Noise3(31)
    x, y, z, lat, lon = sphere_grid(*SIZE)
    haze = n.fbm(x * 2.0, y * 6.0, z * 2.0, 5)
    bands = 0.5 + 0.5 * np.sin(lat * 6 + haze * 3)
    orange_dark = np.array([176, 112, 46], np.float32)
    orange_light = np.array([232, 168, 84], np.float32)
    k = (0.55 * haze + 0.25 * bands + 0.2 * lum)[..., None]
    k = (k - k.min()) / (k.max() - k.min())
    col = orange_dark * (1 - k) + orange_light * k
    # darker northern polar hood, as seen by Cassini
    hood = smoothstep(0.9, 1.4, lat)[..., None]
    col = col * (1 - 0.25 * hood)
    save(col, out)


def make_pluto(src, out):
    save(fill_black(load(src), threshold=10), out)


def make_comet(out):
    """Dark, dusty comet nucleus with bright icy patches."""
    n1, n2 = Noise3(41), Noise3(42)
    x, y, z, lat, lon = sphere_grid(*SIZE)
    f = n1.fbm(x * 4, y * 4, z * 4, 6)
    g = n2.fbm(x * 12, y * 12, z * 12, 4)
    v = 38 + 70 * f + 30 * g
    ice = smoothstep(0.72, 0.8, g) * 90
    v = v + ice
    col = np.stack([v * 1.0, v * 0.97, v * 0.93], axis=-1)
    save(col, out)


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    a_dir, d_dir, out = sys.argv[1:]
    small = os.path.join(out, 'small')
    os.makedirs(small, exist_ok=True)
    save(load(os.path.join(a_dir, 'moon-lroc-2k.jpg')), os.path.join(out, 'moon.jpg'))
    make_europa(os.path.join(d_dir, 'europa-2k.jpg'), os.path.join(out, 'europa.jpg'))
    make_titan(os.path.join(d_dir, 'titan-4k.jpg'), os.path.join(out, 'titan.jpg'))
    make_pluto(os.path.join(d_dir, 'pluto-4k.jpg'), os.path.join(out, 'pluto.jpg'))
    make_comet(os.path.join(out, 'comet.jpg'))
    for name in ['moon', 'europa', 'titan', 'pluto', 'comet']:
        im = Image.open(os.path.join(out, name + '.jpg')).resize((512, 256), Image.LANCZOS)
        im.save(os.path.join(small, name + '.jpg'), quality=88, optimize=True)
    print('done')


if __name__ == '__main__':
    main()
