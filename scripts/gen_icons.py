#!/usr/bin/env python3
"""Generate dreAmI app icons: starry background + dreAmI wordmark."""

import math, random
from PIL import Image, ImageDraw, ImageFont

# ── Palette ───────────────────────────────────────────────────────────────────
BG       = (11,  22,  48,  255)   # #0b1630
AMBER    = (253, 230, 138, 255)   # #fde68a
LAVENDER = (196, 181, 253, 255)   # #c4b5fd
TEAL     = (103, 232, 249, 255)   # #67e8f9

# ── Font paths ────────────────────────────────────────────────────────────────
OUTFIT = 'node_modules/@expo-google-fonts/outfit/400Regular/Outfit_400Regular.ttf'
CINZEL = 'node_modules/@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf'

SIZE = 1024

PARTS = [
    ('dre', OUTFIT, AMBER),
    ('A',   CINZEL, LAVENDER),
    ('m',   OUTFIT, AMBER),
    ('I',   CINZEL, TEAL),
]


def draw_stars(draw: ImageDraw.ImageDraw, size: int, seed: int = 42,
               avoid_center: bool = True) -> None:
    """Scatter stars across the canvas, optionally less dense at the center."""
    rng = random.Random(seed)
    cx, cy = size / 2, size / 2
    avoid_r2 = (size * 0.22) ** 2   # soft exclusion radius for bright stars

    def near_center(x, y):
        return (x - cx) ** 2 + (y - cy) ** 2 < avoid_r2

    # Tiny dim stars
    for _ in range(120):
        x, y = rng.randint(0, size), rng.randint(0, size)
        r = rng.random()
        if avoid_center and near_center(x, y) and rng.random() < 0.7:
            continue
        radius  = 0.4 + r * 0.9
        opacity = int((0.12 + r * 0.32) * 255)
        draw.ellipse([x-radius, y-radius, x+radius, y+radius],
                     fill=(255, 255, 255, opacity))

    # Mid stars
    for _ in range(50):
        x, y = rng.randint(0, size), rng.randint(0, size)
        r = rng.random()
        if avoid_center and near_center(x, y) and rng.random() < 0.8:
            continue
        radius  = 1.0 + r * 1.6
        opacity = int((0.28 + r * 0.38) * 255)
        draw.ellipse([x-radius, y-radius, x+radius, y+radius],
                     fill=(255, 255, 255, opacity))

    # Bright stars with glow
    for _ in range(14):
        x, y = rng.randint(20, size-20), rng.randint(20, size-20)
        r = rng.random()
        if avoid_center and near_center(x, y):
            continue
        radius  = 1.6 + r * 2.2
        opacity = int((0.55 + r * 0.45) * 255)
        for glow_mult, glow_a in [(4.0, 0.07), (2.5, 0.14)]:
            gr = radius * glow_mult
            draw.ellipse([x-gr, y-gr, x+gr, y+gr],
                         fill=(200, 220, 255, int(glow_a * 255)))
        draw.ellipse([x-radius, y-radius, x+radius, y+radius],
                     fill=(255, 255, 255, opacity))


def draw_wordmark(draw: ImageDraw.ImageDraw, size: int, font_size: int) -> None:
    """Draw the dreAmI wordmark centered, baseline-aligned."""
    outfit = ImageFont.truetype(OUTFIT, font_size)
    cinzel = ImageFont.truetype(CINZEL, font_size)
    font_map = {OUTFIT: outfit, CINZEL: cinzel}

    # Measure each segment (anchor='ls' → origin = left, baseline)
    metrics = []
    total_w = 0
    min_top, max_bot = 0, 0
    for text, font_path, _ in PARTS:
        font = font_map[font_path]
        l, t, r, b = font.getbbox(text, anchor='ls')
        w = r - l
        metrics.append((l, t, r, b, w))
        total_w += w
        min_top = min(min_top, t)   # most negative = highest above baseline
        max_bot = max(max_bot, b)   # most positive = lowest below baseline

    # Baseline so the visual midpoint of the glyph block sits at canvas center
    visual_mid = (min_top + max_bot) / 2      # relative to baseline
    baseline_y = size / 2 - visual_mid

    start_x = (size - total_w) / 2

    x = start_x
    for i, (text, font_path, color) in enumerate(PARTS):
        font = font_map[font_path]
        l, _t, _r, _b, w = metrics[i]
        draw.text((x - l, baseline_y), text, font=font, fill=color, anchor='ls')
        x += w


# ── 1. Main icon (iOS + general) ──────────────────────────────────────────────
icon = Image.new('RGBA', (SIZE, SIZE), BG)
draw = ImageDraw.Draw(icon)
draw_stars(draw, SIZE, seed=42, avoid_center=True)
draw_wordmark(draw, SIZE, font_size=200)
icon.save('assets/icon.png')
print('✓  assets/icon.png')

# ── 2. Android adaptive foreground (wordmark on transparent) ─────────────────
fg = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(fg)
draw_wordmark(draw, SIZE, font_size=180)   # slightly smaller for safe-zone margin
fg.save('assets/android-icon-foreground.png')
print('✓  assets/android-icon-foreground.png')

# ── 3. Android adaptive background (stars on navy) ───────────────────────────
bg = Image.new('RGBA', (SIZE, SIZE), BG)
draw = ImageDraw.Draw(bg)
draw_stars(draw, SIZE, seed=99, avoid_center=False)
bg.save('assets/android-icon-background.png')
print('✓  assets/android-icon-background.png')

# ── 4. Android monochrome (white wordmark on transparent) ────────────────────
mono = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(mono)
outfit = ImageFont.truetype(OUTFIT, 180)
cinzel = ImageFont.truetype(CINZEL, 180)
font_map_mono = {OUTFIT: outfit, CINZEL: cinzel}
metrics_mono, total_w_mono = [], 0
min_top_m, max_bot_m = 0, 0
for text, font_path, _ in PARTS:
    font = font_map_mono[font_path]
    l, t, r, b = font.getbbox(text, anchor='ls')
    w = r - l
    metrics_mono.append((l, t, r, b, w))
    total_w_mono += w
    min_top_m = min(min_top_m, t)
    max_bot_m = max(max_bot_m, b)
baseline_y_m = SIZE / 2 - (min_top_m + max_bot_m) / 2
x = (SIZE - total_w_mono) / 2
for i, (text, font_path, _) in enumerate(PARTS):
    font = font_map_mono[font_path]
    l, _t, _r, _b, w = metrics_mono[i]
    draw.text((x - l, baseline_y_m), text, font=font,
              fill=(255, 255, 255, 255), anchor='ls')
    x += w
mono.save('assets/android-icon-monochrome.png')
print('✓  assets/android-icon-monochrome.png')
