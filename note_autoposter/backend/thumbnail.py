"""
Thumbnail generator for note.com articles.
Creates 1280x670 (OGP standard) images with strong copy.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import textwrap
import hashlib
import time
import random

THUMBNAILS_DIR = Path(__file__).parent.parent / "thumbnails"
THUMBNAILS_DIR.mkdir(exist_ok=True)

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"

WIDTH, HEIGHT = 1280, 670

COLOR_SCHEMES = [
    {"bg": "#1a1a2e", "accent": "#e94560", "text": "#ffffff", "sub": "#a8dadc"},
    {"bg": "#0f3460", "accent": "#f5a623", "text": "#ffffff", "sub": "#e2e2e2"},
    {"bg": "#2d6a4f", "accent": "#95d5b2", "text": "#ffffff", "sub": "#d8f3dc"},
    {"bg": "#3d0c02", "accent": "#ff6b35", "text": "#ffffff", "sub": "#ffd700"},
    {"bg": "#16213e", "accent": "#0f3460", "text": "#e94560", "sub": "#ffffff"},
]

def _get_font(size: int):
    """Try to load a Japanese font, fall back to default."""
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJKjp-Bold.otf",
        str(FONTS_DIR / "NotoSansCJK-Bold.ttc"),
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def _draw_gradient_bg(draw: ImageDraw, color1: str, color2: str):
    """Simple vertical gradient background."""
    r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
    r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
    for y in range(HEIGHT):
        t = y / HEIGHT
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

def _hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def _draw_decorations(draw: ImageDraw, scheme: dict):
    """Add geometric decorations."""
    accent_rgb = _hex_to_rgb(scheme["accent"]) + (60,)
    bg_rgb = _hex_to_rgb(scheme["bg"])
    lighter = tuple(min(255, c + 40) for c in bg_rgb)

    draw.ellipse([(-100, -100), (300, 300)], fill=lighter + (255,))
    draw.ellipse([(980, 370), (1380, 770)], fill=lighter + (255,))
    draw.rectangle([0, HEIGHT - 8, WIDTH, HEIGHT], fill=scheme["accent"])
    draw.rectangle([0, 0, 8, HEIGHT], fill=scheme["accent"])

def generate_thumbnail(
    main_copy: str,
    sub_copy: str = "",
    filename: str = "",
    scheme_index: int = -1,
) -> str:
    """Generate a thumbnail image and return the file path."""
    if not filename:
        uid = hashlib.md5(f"{main_copy}{time.time()}".encode()).hexdigest()[:8]
        filename = f"thumb_{uid}.png"

    scheme = COLOR_SCHEMES[scheme_index % len(COLOR_SCHEMES)] if scheme_index >= 0 else random.choice(COLOR_SCHEMES)

    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img, "RGBA")

    _draw_gradient_bg(draw, scheme["bg"], "#000000")
    _draw_decorations(draw, scheme)

    font_large = _get_font(92)
    font_medium = _get_font(52)
    font_small = _get_font(38)
    font_label = _get_font(30)

    label_text = "有料記事"
    draw.rounded_rectangle([60, 52, 220, 102], radius=10, fill=scheme["accent"])
    draw.text((140, 77), label_text, font=font_label, fill="#ffffff", anchor="mm")

    lines = textwrap.wrap(main_copy, width=14)
    y = 140
    for line in lines[:3]:
        draw.text((80, y), line, font=font_large, fill=scheme["text"])
        y += 110

    if sub_copy:
        sub_lines = textwrap.wrap(sub_copy, width=22)
        y = max(y + 20, 480)
        for line in sub_lines[:2]:
            draw.text((80, y), line, font=font_medium, fill=scheme["sub"])
            y += 65

    note_label = "note"
    draw.text((WIDTH - 80, HEIGHT - 40), note_label, font=font_small, fill=scheme["accent"], anchor="rm")

    out_path = THUMBNAILS_DIR / filename
    img.save(out_path, "PNG", optimize=True)
    return str(out_path)
