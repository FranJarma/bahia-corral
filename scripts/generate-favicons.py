"""Generate Bahía Corral's browser icons from the client-approved logo.

Run locally with: python3 -m pip install pillow && python3 scripts/generate-favicons.py
Outputs to public/; never replace the logo or download unapproved icon artwork.
"""

from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parents[1] / "public"
LOGO = Image.open(PUBLIC / "images" / "logo-bahia-corral.png").convert("RGBA")
CREAM = (247, 242, 232, 255)


def place_contained(canvas: Image.Image, logo: Image.Image, padding: int) -> None:
    width, height = logo.size
    available = canvas.width - padding * 2
    factor = min(available / width, available / height)
    target = (max(1, round(width * factor)), max(1, round(height * factor)))
    resized = logo.resize(target, Image.Resampling.LANCZOS)
    canvas.alpha_composite(
        resized,
        ((canvas.width - target[0]) // 2, (canvas.height - target[1]) // 2),
    )


def main() -> None:
    # The house illustration is used for the tiny favicons; the full identity
    # is preserved on larger home-screen and PWA icons.
    artwork = LOGO.crop((0, 0, LOGO.width, round(LOGO.height * 0.593)))
    artwork = artwork.crop(artwork.getchannel("A").getbbox())

    for size in (16, 32):
        square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        place_contained(square, artwork, max(1, round(size * 0.08)))
        square.save(PUBLIC / f"favicon-{size}x{size}.png", optimize=True)

    for size, filename in (
        (180, "apple-touch-icon.png"),
        (192, "android-chrome-192x192.png"),
        (512, "android-chrome-512x512.png"),
    ):
        square = Image.new("RGBA", (size, size), CREAM)
        place_contained(square, LOGO, round(size * 0.07))
        square.save(PUBLIC / filename, optimize=True)

    Image.open(PUBLIC / "favicon-32x32.png").save(
        PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32)]
    )


if __name__ == "__main__":
    main()
