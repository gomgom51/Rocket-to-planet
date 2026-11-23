"""Icons for the browser version (home screen, tab), from the Android icon.

The Android launcher icon is an adaptive icon: a starry background
(res/drawable/ic_launcher_background.xml) under the rocket foreground
rendered at 768 px by `SIZE=768 node tools/make_icon.js` (108dp canvas of
which 72dp are visible).
Usage (from the repository root): python3 tools/make_web_icons.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'web' / 'icons'
FOREGROUND = Image.open(ROOT / 'tools' / 'icon-foreground-768.png').convert('RGBA')
N = FOREGROUND.size[0]  # 108dp canvas

# Same as ic_launcher_background.xml (coordinates in dp on the 108dp canvas).
CENTER, RADIUS = (60, 46), 80
INNER, OUTER = (0x1C, 0x32, 0x70), (0x02, 0x03, 0x0A)
STARS = [(24, 28, 0.9, 0xCC), (80, 24, 0.7, 0x99), (86, 70, 0.8, 0xAA), (30, 80, 0.6, 0x88),
         (52, 18, 0.6, 0x99), (70, 88, 0.7, 0x77), (18, 56, 0.6, 0x88)]


def background(size):
    s = size / 108
    img = Image.new('RGBA', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = min(1.0, math.hypot(x / s - CENTER[0], y / s - CENTER[1]) / RADIUS)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(INNER, OUTER)) + (255,)
    stars = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(stars)
    for x, y, r, a in STARS:
        d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=(255, 255, 255, a))
    return Image.alpha_composite(img, stars)


def full_icon():
    """The whole 108dp adaptive icon canvas (for 'maskable' icons)."""
    return Image.alpha_composite(background(N), FOREGROUND)


def visible_icon():
    """What the Android launcher shows: the central 72dp of the canvas."""
    m = round(N * 18 / 108)
    return full_icon().crop((m, m, N - m, N - m))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    visible, full = visible_icon(), full_icon()
    for size in (192, 512):
        visible.resize((size, size), Image.LANCZOS).convert('RGB').save(OUT / f'icon-{size}.png', optimize=True)
    full.resize((512, 512), Image.LANCZOS).convert('RGB').save(OUT / 'icon-maskable-512.png', optimize=True)
    visible.resize((180, 180), Image.LANCZOS).convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)
    visible.resize((48, 48), Image.LANCZOS).convert('RGB').save(OUT / 'favicon-48.png', optimize=True)
    print('wrote', ', '.join(sorted(p.name for p in OUT.iterdir())))


if __name__ == '__main__':
    main()
