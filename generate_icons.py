"""Generate portfolio icons with Feng Shui Mộc color palette."""

from PIL import Image, ImageDraw, ImageFont
import os

# Feng Shui Mộc palette
COLOR_PRIMARY = (10, 110, 92)      # #0A6E5C — Jade green (Mộc)
COLOR_SECONDARY = (30, 58, 95)     # #1E3A5F — Deep navy (Thủy)
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


def get_font(size):
    """Try to load a serif font, fallback to default."""
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


def create_icon(size, maskable=False):
    """Create an icon at the given size."""
    gradient = create_gradient(size, COLOR_PRIMARY, COLOR_SECONDARY)

    if not maskable:
        # Regular icon with rounded corners
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        radius = size // 5
        draw_rounded_rect(mask_draw, (0, 0, size, size), radius, fill=255)
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.paste(gradient, mask=mask)
    else:
        # Maskable icon — full square with safe zone padding
        icon = gradient.copy()

    draw = ImageDraw.Draw(icon)

    # Draw "TA" text
    font_size = size // 3 if not maskable else size // 4
    font = get_font(font_size)
    text = "TA"

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    draw.text((x, y), text, fill=COLOR_WHITE, font=font)

    return icon


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

    print("\nAll icons generated with Feng Shui Mộc palette!")
