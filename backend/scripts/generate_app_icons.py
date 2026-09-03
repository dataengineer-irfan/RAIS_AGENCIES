import os
from PIL import Image, ImageDraw, ImageFont

PUBLIC_DIR = r"C:\Users\affra\Documents\RAIS\frontend\public"

def generate_icon(size, filename):
    # Dark navy background with amber glow and bold 'R'
    img = Image.new("RGBA", (size, size), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)
    
    # Rounded badge
    padding = int(size * 0.1)
    radius = int(size * 0.22)
    badge_box = [padding, padding, size - padding, size - padding]
    draw.rounded_rectangle(badge_box, radius=radius, fill=(245, 158, 11, 255))
    
    # Draw Inner Accent
    inner_pad = int(size * 0.14)
    inner_rad = int(size * 0.16)
    draw.rounded_rectangle([inner_pad, inner_pad, size - inner_pad, size - inner_pad], radius=inner_rad, fill=(217, 119, 6, 255))
    
    # Save
    out_path = os.path.join(PUBLIC_DIR, filename)
    img.save(out_path)
    print(f"Generated {out_path}")

if __name__ == "__main__":
    generate_icon(192, "icon-192.png")
    generate_icon(512, "icon-512.png")
