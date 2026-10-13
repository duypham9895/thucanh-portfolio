"""Generate portfolio icons with Layered Overlap TA monogram — Feng Shui Mộc palette."""

from PIL import Image, ImageDraw, ImageFont
import os

# Feng Shui Mộc palette
COLOR_JADE = (10, 110, 92)         # #0A6E5C — Mộc (Wood)
COLOR_NAVY = (30, 58, 95)          # #1E3A5F — Thủy (Water)
COLOR_WHITE = (255, 255, 255)
COLOR_BG = (244, 248, 246)         # #F4F8F6 — Whisper mint

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(ICONS_DIR, exist_ok=True)


def create_gradient(size, color_top, color_bottom):
    """Create a vertical gradient image."""
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        ratio = y / size
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    return img


def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * radius, y0 + 2 * radius], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * radius, y0, x1, y0 + 2 * radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * radius, x0 + 2 * radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * radius, y1 - 2 * radius, x1, y1], 0, 90, fill=fill)


def get_serif_font(size):
    """Try to load a serif font for the T (bold)."""
    font_paths = [
        "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
        "/System/Library/Fonts/Times.ttc",
        "/usr/share/fonts/truetype/times/Times_New_Roman_Bold.ttf",
    ]
    for path in font_paths:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def get_serif_font_light(size):
    """Try to load a lighter serif font for the A."""
    font_paths = [
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Times.ttc",
        "/usr/share/fonts/truetype/times/Times_New_Roman.ttf",
    ]
    for path in font_paths:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def create_layered_monogram(size, on_dark=False):
    """Create the Layered Overlap TA monogram."""
    if on_dark:
        base = create_gradient(size, COLOR_JADE, COLOR_NAVY)
    else:
        base = Image.new("RGBA", (size, size), (*COLOR_BG, 255))

    # Create overlay for transparency blending
    t_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    a_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    t_draw = ImageDraw.Draw(t_layer)
    a_draw = ImageDraw.Draw(a_layer)

    # Font sizes relative to icon size
    t_font_size = int(size * 0.52)
    a_font_size = int(size * 0.42)

    t_font = get_serif_font(t_font_size)
    a_font = get_serif_font_light(a_font_size)

    # Colors
    if on_dark:
        t_color = (*COLOR_WHITE, 240)   # 94% opacity
        a_color = (*COLOR_WHITE, 190)   # 75% opacity
    else:
        t_color = (*COLOR_JADE, 230)    # 90% opacity
        a_color = (*COLOR_NAVY, 216)    # 85% opacity

    # Position T — centered horizontally, shifted slightly left
    t_bbox = t_draw.textbbox((0, 0), "T", font=t_font)
    t_w = t_bbox[2] - t_bbox[0]
    t_h = t_bbox[3] - t_bbox[1]
    t_x = (size - t_w) // 2 - int(size * 0.06)
    t_y = (size - t_h) // 2 - t_bbox[1] - int(size * 0.04)

    # Position A — overlapping, shifted right and slightly down
    a_bbox = a_draw.textbbox((0, 0), "A", font=a_font)
    a_w = a_bbox[2] - a_bbox[0]
    a_h = a_bbox[3] - a_bbox[1]
    a_x = (size - a_w) // 2 + int(size * 0.06)
    a_y = (size - a_h) // 2 - a_bbox[1] + int(size * 0.04)

    # Draw letters on separate layers
    t_draw.text((t_x, t_y), "T", fill=t_color, font=t_font)
    a_draw.text((a_x, a_y), "A", fill=a_color, font=a_font)

    # Composite layers
    base = Image.alpha_composite(base, t_layer)
    base = Image.alpha_composite(base, a_layer)

    return base


def create_icon(size, maskable=False):
    """Create an icon at the given size."""
    monogram = create_layered_monogram(size, on_dark=True)

    if not maskable:
        # Apply rounded corner mask
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        radius = size // 5
        draw_rounded_rect(mask_draw, (0, 0, size, size), radius, fill=255)
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.paste(monogram, mask=mask)
        return icon
    else:
        return monogram


def create_favicon():
    """Create favicon.ico with multiple sizes."""
    sizes = [16, 32, 48]
    images = []
    for s in sizes:
        img = create_icon(s)
        images.append(img.convert("RGBA"))

    images[0].save(
        os.path.join(ICONS_DIR, "favicon.ico"),
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )


if __name__ == "__main__":
    # Generate regular icons
    for size in [192, 512]:
        icon = create_icon(size, maskable=False)
        icon.save(os.path.join(ICONS_DIR, f"icon-{size}.png"))
        print(f"Created icon-{size}.png")

    # Generate maskable icons
    for size in [192, 512]:
        icon = create_icon(size, maskable=True)
        icon.save(os.path.join(ICONS_DIR, f"icon-{size}-maskable.png"))
        print(f"Created icon-{size}-maskable.png")

    # Generate apple-touch-icon (180x180)
    apple_icon = create_icon(180, maskable=False)
    apple_icon.save(os.path.join(ICONS_DIR, "apple-touch-icon.png"))
    print("Created apple-touch-icon.png")

    # Generate favicon
    create_favicon()
    print("Created favicon.ico")

    print("\nAll icons generated with Layered Overlap TA monogram!")
