#!/usr/bin/env python3
"""Generate HotelHQ PWA icons and the install-guide QR code.

Brand: navy #14365d, gold #f9c74f, white wordmark.
Maskable icons are full-bleed with the mark inside the center 80% safe zone.
"""
import os

import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAVY = (20, 54, 93, 255)
GOLD = (249, 199, 79, 255)
WHITE = (255, 255, 255, 255)
FONT = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
SITE = "https://jrhospitality.github.io/hotelhq/"


def font(size):
    return ImageFont.truetype(FONT, size)


def text_size(draw, text, face):
    box = draw.textbbox((0, 0), text, font=face)
    return box[2] - box[0], box[3] - box[1], box


def draw_roof(draw, cx, y, width):
    """Gold roof mark centered at cx, sitting on baseline y."""
    h = width * 0.38
    draw.polygon(
        [(cx, y - h), (cx + width / 2, y), (cx - width / 2, y)],
        fill=GOLD,
    )


def paint(size, radius, safe):
    """Draw the mark. If safe is set, keep pixels inside the center circle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if radius:
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=NAVY)
    else:
        draw.rectangle((0, 0, size, size), fill=NAVY)

    # Usable box. Maskable safe zone is a circle of diameter 80%.
    if safe:
        box = size * 0.62
    else:
        box = size * 0.78
    cx = size / 2
    top = (size - box) / 2

    roof_w = box * 0.34
    draw_roof(draw, cx, top + box * 0.22, roof_w)

    hotel = font(int(size * (0.145 if safe else 0.16)))
    hq = font(int(size * (0.30 if safe else 0.30)))
    hw, hh, hb = text_size(draw, "Hotel", hotel)
    qw, qh, qb = text_size(draw, "HQ", hq)

    hotel_y = top + box * 0.30
    hq_y = top + box * 0.48
    draw.text((cx - hw / 2, hotel_y - hb[1]), "Hotel", font=hotel, fill=WHITE)
    draw.text((cx - qw / 2, hq_y - qb[1]), "HQ", font=hq, fill=GOLD)
    return img


def save(img, name):
    path = os.path.join(ROOT, name)
    img.save(path, "PNG", optimize=True)
    print(name, img.size)
    return img


def assert_safe_zone(img, name):
    """Important pixels stay inside the center circle (80% of the icon)."""
    w, h = img.size
    px = img.convert("RGBA").load()
    cx, cy = (w - 1) / 2, (h - 1) / 2
    limit = (w * 0.40) ** 2
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] == NAVY[:3]:
                continue
            if (x - cx) ** 2 + (y - cy) ** 2 > limit:
                raise SystemExit(name + " paints outside the maskable safe zone at %s,%s" % (x, y))


def main():
    # "any" icons keep a rounded tile so they look finished on any launcher.
    save(paint(192, 42, False), "icon-192.png")
    save(paint(512, 112, False), "icon-512.png")
    # Maskable: full bleed, mark inside the safe zone. OS applies the shape.
    assert_safe_zone(save(paint(192, 0, True), "icon-maskable-192.png"), "icon-maskable-192.png")
    assert_safe_zone(save(paint(512, 0, True), "icon-maskable-512.png"), "icon-maskable-512.png")
    # Apple adds its own squircle. Square, opaque, no pre-rounded corners.
    apple = paint(180, 0, False).convert("RGB")
    apple.save(os.path.join(ROOT, "apple-touch-icon.png"), "PNG", optimize=True)
    print("apple-touch-icon.png", apple.size)

    qr = segno.make(SITE, error="h")
    qr.save(
        os.path.join(ROOT, "install-qr.svg"),
        scale=4,
        dark="#14365d",
        light="#ffffff",
        xmldecl=False,
        svgns=True,
    )
    print("install-qr.svg")


if __name__ == "__main__":
    main()
