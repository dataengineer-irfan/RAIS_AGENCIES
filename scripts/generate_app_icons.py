"""
RAIS AGENCIES — Official Mobile Branding & Asset Generator
Generates high-resolution Fortune-grade Android launcher icons, adaptive icons,
round icons, and splash screens replacing default Capacitor assets.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES_DIR = os.path.join(BASE_DIR, "frontend", "android", "app", "src", "main", "res")
PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "public")

# Brand Palette
BG_DARK = (11, 19, 41)       # Deep Midnight Navy #0B1329
GOLD_PRIMARY = (245, 158, 11) # Radiant Amber Gold #F59E0B
GOLD_LIGHT = (251, 191, 36)   # Warm Gold #FBBF24
GOLD_DARK = (180, 83, 9)      # Deep Gold #B45309
CYAN_ACCENT = (56, 189, 248)  # Cold-Chain Ice Cyan #38BDF8
TEXT_WHITE = (255, 255, 255)  # Pure White
SLATE_LIGHT = (148, 163, 184) # Slate Gray #94A3B8

def create_master_emblem(size=1024, is_round=False, is_foreground=False):
    """Draws a crisp, fortune-grade RAIS AGENCIES crest with snowflake & crown."""
    if is_foreground:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (size, size), BG_DARK + (255,))

    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    r = int(size * 0.42)

    # If round launcher, draw circular dark navy base
    if is_round and not is_foreground:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG_DARK)

    # 1. Outer Golden Ring
    ring_w = max(int(size * 0.02), 3)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD_PRIMARY, width=ring_w)

    # 2. Inner Decorative Ring
    inner_r = int(r * 0.92)
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], outline=GOLD_DARK, width=max(int(ring_w * 0.5), 2))

    # 3. Cold-Chain Snowflake / Ice Crystal Central Geometry
    sf_r = int(r * 0.48)
    for angle in [0, 60, 120, 180, 240, 300]:
        import math
        rad = math.radians(angle)
        x2 = cx + int(sf_r * math.cos(rad))
        y2 = cy - int(r * 0.20) + int(sf_r * math.sin(rad))
        draw.line([cx, cy - int(r * 0.20), x2, y2], fill=CYAN_ACCENT, width=max(int(size * 0.015), 3))
        # Small branch tips
        for tip_angle in [angle - 35, angle + 35]:
            tip_rad = math.radians(tip_angle)
            bx = cx + int(sf_r * 0.65 * math.cos(rad))
            by = cy - int(r * 0.20) + int(sf_r * 0.65 * math.sin(rad))
            tx = bx + int(sf_r * 0.3 * math.cos(tip_rad))
            ty = by + int(sf_r * 0.3 * math.sin(tip_rad))
            draw.line([bx, by, tx, ty], fill=GOLD_LIGHT, width=max(int(size * 0.01), 2))

    # Center Crown / Depot Diamond
    diamond_s = int(size * 0.035)
    draw.polygon([
        (cx, cy - int(r * 0.20) - diamond_s),
        (cx + diamond_s, cy - int(r * 0.20)),
        (cx, cy - int(r * 0.20) + diamond_s),
        (cx - diamond_s, cy - int(r * 0.20))
    ], fill=GOLD_PRIMARY)

    # 4. Bold Typography: "RAIS"
    # Fallback to default font if custom font not available
    try:
        font_large = ImageFont.truetype("arialbd.ttf", int(size * 0.20))
        font_sub = ImageFont.truetype("arialbd.ttf", int(size * 0.065))
        font_micro = ImageFont.truetype("arial.ttf", int(size * 0.035))
    except Exception:
        font_large = font_sub = font_micro = ImageFont.load_default()

    # Draw "RAIS"
    rais_text = "RAIS"
    bbox = draw.textbbox((0, 0), rais_text, font=font_large)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2
    ty = cy + int(size * 0.06)

    # Text shadow / gold glow
    draw.text((tx + 2, ty + 2), rais_text, font=font_large, fill=GOLD_DARK)
    draw.text((tx, ty), rais_text, font=font_large, fill=TEXT_WHITE)

    # 5. Golden Banner: "AGENCIES"
    ag_text = "AGENCIES"
    bbox_ag = draw.textbbox((0, 0), ag_text, font=font_sub)
    aw, ah = bbox_ag[2] - bbox_ag[0], bbox_ag[3] - bbox_ag[1]
    ax = cx - aw // 2
    ay = ty + th + int(size * 0.02)

    # Banner pill
    pill_pad_x = int(size * 0.04)
    pill_pad_y = int(size * 0.015)
    draw.rounded_rectangle([
        ax - pill_pad_x, ay - pill_pad_y,
        ax + aw + pill_pad_x, ay + ah + pill_pad_y
    ], radius=int(size * 0.02), fill=GOLD_PRIMARY)

    draw.text((ax, ay), ag_text, font=font_sub, fill=BG_DARK)

    # 6. Micro Text: "RAYACHOTY DEPOT"
    micro_text = "-18°C COLD-CHAIN DEPOT"
    bbox_m = draw.textbbox((0, 0), micro_text, font=font_micro)
    mw, mh = bbox_m[2] - bbox_m[0], bbox_m[3] - bbox_m[1]
    draw.text((cx - mw // 2, ay + ah + pill_pad_y + int(size * 0.02)), micro_text, font=font_micro, fill=CYAN_ACCENT)

    return img

def create_splash_screen(width, height):
    """Draws a fullscreen, luxury dark navy splash screen for Android."""
    img = Image.new("RGBA", (width, height), (7, 13, 30, 255))
    draw = ImageDraw.Draw(img)

    # Central emblem size based on smaller dimension
    emblem_size = int(min(width, height) * 0.52)
    emblem = create_master_emblem(size=emblem_size, is_round=True)

    ex = (width - emblem_size) // 2
    ey = (height - emblem_size) // 2 - int(height * 0.04)
    img.paste(emblem, (ex, ey), emblem)

    # Bottom Branding & Tagline
    try:
        font_title = ImageFont.truetype("arialbd.ttf", max(int(min(width, height) * 0.05), 18))
        font_sub = ImageFont.truetype("arial.ttf", max(int(min(width, height) * 0.03), 12))
    except Exception:
        font_title = font_sub = ImageFont.load_default()

    title_text = "RAIS AGENCIES"
    bbox_t = draw.textbbox((0, 0), title_text, font=font_title)
    tw = bbox_t[2] - bbox_t[0]
    draw.text(((width - tw) // 2, ey + emblem_size + int(height * 0.03)), title_text, font=font_title, fill=TEXT_WHITE)

    sub_text = "Rayachoty Central Cold-Chain Depot (-18°C)"
    bbox_s = draw.textbbox((0, 0), sub_text, font=font_sub)
    sw = bbox_s[2] - bbox_s[0]
    draw.text(((width - sw) // 2, ey + emblem_size + int(height * 0.07)), sub_text, font=font_sub, fill=GOLD_PRIMARY)

    return img

def generate_all_assets():
    print("=" * 65)
    print(" 🎨  GENERATING OFFICIAL RAIS AGENCIES ANDROID BRAND ASSETS")
    print("=" * 65)

    # 1. Launcher Icons across all densities
    icon_densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    master_1024 = create_master_emblem(1024)
    master_round = create_master_emblem(1024, is_round=True)
    master_fg = create_master_emblem(1024, is_foreground=True)

    for folder, px in icon_densities.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        # Square Icon
        sq_img = master_1024.resize((px, px), Image.Resampling.LANCZOS)
        sq_img.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

        # Round Icon
        rd_img = master_round.resize((px, px), Image.Resampling.LANCZOS)
        rd_img.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")

        # Foreground Adaptive Icon (108dp canvas)
        fg_px = int(px * 2.25)
        fg_img = master_fg.resize((fg_px, fg_px), Image.Resampling.LANCZOS)
        fg_img.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")

        print(f"  ✓ {folder}: {px}x{px} (Square, Round, Foreground)")

    # 2. Splash Screens across all densities and orientations
    splash_sizes = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for folder, (w, h) in splash_sizes.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)
        splash_img = create_splash_screen(w, h)
        splash_img.save(os.path.join(dir_path, "splash.png"), "PNG")
        print(f"  ✓ {folder}: {w}x{h} Splash Screen")

    # 3. Web Public Assets (for Web login & favicon)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    master_round.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "icon-512.png"), "PNG")
    master_round.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "icon-192.png"), "PNG")
    master_round.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "favicon.ico"), "ICO")
    master_round.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "rais_logo.png"), "PNG")
    print("  ✓ Web Public Assets (icon-512, icon-192, favicon, rais_logo)")

    print("\n" + "=" * 65)
    print(" 🌟  ALL RAIS AGENCIES MOBILE ASSETS GENERATED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    generate_all_assets()
