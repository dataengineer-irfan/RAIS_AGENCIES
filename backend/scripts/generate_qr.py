import os
import sys

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
URL = "http://10.136.202.94:3000"

try:
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = os.path.join(ARTIFACT_DIR, "mobile_qr_code.png")
    img.save(qr_path)
    print(f"QR code generated at: {qr_path}")
except ImportError:
    print("qrcode library not installed, generating ASCII QR or installing qrcode...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode", "pillow"])
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = os.path.join(ARTIFACT_DIR, "mobile_qr_code.png")
    img.save(qr_path)
    print(f"QR code generated at: {qr_path}")
