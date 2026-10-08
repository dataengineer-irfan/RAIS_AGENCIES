"""
RAIS AGENCIES — Official Mobile Branding & Asset Generator
Generates high-resolution Android launcher icons, adaptive icons,
round icons, PWA icons, favicons, and splash screens from the official
3D Golden & Ruby RAIS mobile app logo.
"""

import os
import sys
import shutil
from PIL import Image, ImageDraw, ImageFont
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES_DIR = os.path.join(BASE_DIR, "frontend", "android", "app", "src", "main", "res")
PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "public")
ANDROID_PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "android", "app", "src", "main", "assets", "public")
DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")

BRAND_SOURCE_DIR = os.path.join(BASE_DIR, "frontend", "src", "assets", "brand")
os.makedirs(BRAND_SOURCE_DIR, exist_ok=True)
BRAND_SOURCE_PATH = os.path.join(BRAND_SOURCE_DIR, "rais_mobile_logo_master.jpg")
USER_UPLOAD_PATH = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020\.user_uploaded\media_1791456878423.jpg"

def get_source_image_path():
    if os.path.exists(BRAND_SOURCE_PATH):
        return BRAND_SOURCE_PATH
    if os.path.exists(USER_UPLOAD_PATH):
        shutil.copyfile(USER_UPLOAD_PATH, BRAND_SOURCE_PATH)
        return BRAND_SOURCE_PATH
    raise FileNotFoundError("Master mobile logo source image not found.")

def clean_watermark(pil_img):
    """Inpaints and removes the AI watermark from bottom-right corner (860..935, 855..935)
    by seamlessly sampling the symmetric bottom-left navy gradient."""
    arr = np.array(pil_img.convert("RGB"))
    for y in range(855, 935):
        for x in range(860, 935):
            arr[y, x] = arr[y, 1023 - x]
    return Image.fromarray(arr)

def create_master_assets():
    src_path = get_source_image_path()
    raw_img = Image.open(src_path)
    clean_src = clean_watermark(raw_img)

    # 1. Extract Squircle with Supersampled Anti-aliased Mask
    scale = 4
    w_box, h_box = 846, 852
    r_corner = 186

    mask_hi = Image.new("L", (w_box * scale, h_box * scale), 0)
    draw = ImageDraw.Draw(mask_hi)
    draw.rounded_rectangle([0, 0, w_box * scale, h_box * scale], radius=r_corner * scale, fill=255)
    mask = mask_hi.resize((w_box, h_box), Image.Resampling.LANCZOS)

    cropped = clean_src.crop((89, 95, 89 + w_box, 95 + h_box))
    r, g, b = cropped.split()
    squircle_rgba = Image.merge("RGBA", (r, g, b, mask))

    # Master Squircle (960x960 centered inside 1024x1024 with safe breathing room)
    master_squircle = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scaled_960 = squircle_rgba.resize((960, 960), Image.Resampling.LANCZOS)
    master_squircle.paste(scaled_960, (32, 32), scaled_960)

    # Edge-to-edge Squircle (1024x1024 without extra padding, for in-app / rais_logo)
    edge_squircle = squircle_rgba.resize((1024, 1024), Image.Resampling.LANCZOS)

    # 2. Master Round (Circular Mask)
    cx, cy, r_circ = 512, 521, 415
    cropped_circle = clean_src.crop((cx - r_circ, cy - r_circ, cx + r_circ, cy + r_circ))
    mask_circle_hi = Image.new("L", (r_circ * 2 * scale, r_circ * 2 * scale), 0)
    draw_c = ImageDraw.Draw(mask_circle_hi)
    draw_c.ellipse([0, 0, r_circ * 2 * scale, r_circ * 2 * scale], fill=255)
    mask_circle = mask_circle_hi.resize((r_circ * 2, r_circ * 2), Image.Resampling.LANCZOS)
    rc, gc, bc = cropped_circle.split()
    circle_rgba = Image.merge("RGBA", (rc, gc, bc, mask_circle))

    master_round = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scaled_round_960 = circle_rgba.resize((960, 960), Image.Resampling.LANCZOS)
    master_round.paste(scaled_round_960, (32, 32), scaled_round_960)

    # 3. Master Adaptive Foreground (centered in Android 108dp / 66.6% safe zone)
    master_fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    fg_size = 720
    scaled_fg = squircle_rgba.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
    master_fg.paste(scaled_fg, ((1024 - fg_size) // 2, (1024 - fg_size) // 2), scaled_fg)

    return {
        "squircle": master_squircle,
        "edge_squircle": edge_squircle,
        "round": master_round,
        "foreground": master_fg,
    }

def create_splash_screen(master_squircle, width, height):
    """Draws a fullscreen, luxury dark navy splash screen for Android."""
    img = Image.new("RGBA", (width, height), (11, 19, 41, 255)) # #0B1329

    emblem_size = int(min(width, height) * 0.54)
    emblem = master_squircle.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)

    ex = (width - emblem_size) // 2
    ey = (height - emblem_size) // 2 - int(height * 0.05)
    img.paste(emblem, (ex, ey), emblem)

    draw = ImageDraw.Draw(img)
    try:
        font_title = ImageFont.truetype("arialbd.ttf", max(int(min(width, height) * 0.048), 18))
        font_sub = ImageFont.truetype("arial.ttf", max(int(min(width, height) * 0.028), 12))
    except Exception:
        font_title = font_sub = ImageFont.load_default()

    title_text = "RAIS AGENCIES"
    bbox_t = draw.textbbox((0, 0), title_text, font=font_title)
    tw = bbox_t[2] - bbox_t[0]
    draw.text(((width - tw) // 2, ey + emblem_size + int(height * 0.03)), title_text, font=font_title, fill=(255, 255, 255, 255))

    sub_text = "Rayachoty Central Cold-Chain Depot (-18°C)"
    bbox_s = draw.textbbox((0, 0), sub_text, font=font_sub)
    sw = bbox_s[2] - bbox_s[0]
    draw.text(((width - sw) // 2, ey + emblem_size + int(height * 0.07)), sub_text, font=font_sub, fill=(245, 158, 11, 255))

    return img

def generate_all_assets():
    print("=" * 65)
    print(" 🎨  GENERATING OFFICIAL RAIS AGENCIES 3D MOBILE BRAND ASSETS")
    print("=" * 65)

    masters = create_master_assets()
    master_squircle = masters["squircle"]
    master_edge = masters["edge_squircle"]
    master_round = masters["round"]
    master_fg = masters["foreground"]

    # 1. Android Launcher Icons across all densities
    icon_densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, px in icon_densities.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        # Standard Launcher Icon (Squircle)
        sq_img = master_squircle.resize((px, px), Image.Resampling.LANCZOS)
        sq_img.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

        # Round Launcher Icon
        rd_img = master_round.resize((px, px), Image.Resampling.LANCZOS)
        rd_img.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")

        # Foreground Adaptive Icon (108dp canvas = 2.25x base size)
        fg_px = int(px * 2.25)
        fg_img = master_fg.resize((fg_px, fg_px), Image.Resampling.LANCZOS)
        fg_img.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")

        print(f"  ✓ Android {folder}: {px}x{px} (Launcher, Round, Foreground)")

    # 2. Android Splash Screens
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
        splash_img = create_splash_screen(master_squircle, w, h)
        splash_img.save(os.path.join(dir_path, "splash.png"), "PNG")
        print(f"  ✓ Splash {folder}: {w}x{h}")

    # 3. Web & PWA Public Assets
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    master_squircle.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "icon-512.png"), "PNG")
    master_squircle.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "icon-192.png"), "PNG")
    master_squircle.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG")
    
    # In-app brand logo (sharp edge squircle for UI header, sidebar, login)
    master_edge.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "rais_logo.png"), "PNG")

    # Multi-resolution Favicons
    master_squircle.resize((64, 64), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    master_squircle.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"), "PNG")
    master_squircle.resize((16, 16), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"), "PNG")
    master_squircle.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "favicon.png"), "PNG")

    print("  ✓ Web Public Assets (icon-512, icon-192, apple-touch-icon, favicon, rais_logo)")

    # 4. Synchronize with Android assets/public and dist (if present)
    target_dirs = [ANDROID_PUBLIC_DIR]
    if os.path.exists(DIST_DIR):
        target_dirs.append(DIST_DIR)

    for target in target_dirs:
        os.makedirs(target, exist_ok=True)
        for fname in ["icon-512.png", "icon-192.png", "apple-touch-icon.png", "favicon.ico", "favicon.png", "favicon-32x32.png", "favicon-16x16.png", "rais_logo.png"]:
            src_f = os.path.join(PUBLIC_DIR, fname)
            if os.path.exists(src_f):
                shutil.copyfile(src_f, os.path.join(target, fname))
        print(f"  ✓ Synchronized assets to {os.path.relpath(target, BASE_DIR)}")

    print("\n" + "=" * 65)
    print(" 🌟  ALL OFFICIAL RAIS MOBILE APP ASSETS GENERATED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    generate_all_assets()
