"""
Google Cloud Vision — document text detection for menu images.

Requires:
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

Enable the Vision API on your GCP project and grant the service account
"Vertex AI User" / "Cloud Vision AI" access as needed.

Supabase may store a valid image that still triggers Vision \"Bad image data\"
(progressive JPEG, odd color space, huge dimensions). We decode with Pillow,
apply EXIF orientation, optionally downscale, and re-encode as baseline JPEG
before calling Vision.
"""

from __future__ import annotations

from io import BytesIO

from google.cloud import vision
from PIL import Image, ImageOps

# Vision document_text has practical limits; keep under ~4k on longest edge.
_MAX_LONG_EDGE_PX = 4096


def _prepare_image_bytes_for_vision(image_bytes: bytes) -> bytes:
    """
    Decode with Pillow, apply EXIF orientation, RGB, optional downscale, baseline JPEG.
    If decoding fails, return original bytes (caller may still fail downstream).
    """
    try:
        with Image.open(BytesIO(image_bytes)) as im:
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            w, h = im.size
            m = max(w, h)
            if m > _MAX_LONG_EDGE_PX:
                scale = _MAX_LONG_EDGE_PX / m
                im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
            out = BytesIO()
            im.save(out, format="JPEG", quality=90, optimize=True)
            return out.getvalue()
    except Exception:
        return image_bytes


def _detect_image_kind(data: bytes) -> str:
    """Return a short label for logging / errors; Vision expects JPEG, PNG, GIF, BMP, WEBP, etc. — not HEIC."""
    if len(data) < 12:
        return "empty_or_too_short"
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    # ISO BMFF (HEIC/HEIF/AVIF often start with ....ftyp)
    if len(data) >= 12 and data[4:8] == b"ftyp":
        brand = data[8:12]
        if brand in (b"heic", b"heix", b"hevc", b"mif1", b"msf1", b"avif"):
            return "heic_or_avif"
        return "iso_bmf_unknown"
    return "unknown"


def validate_image_bytes_for_vision(image_bytes: bytes) -> None:
    """
    Fail fast with a clear message before Vision returns generic Bad image data.
    """
    if not image_bytes or len(image_bytes) < 24:
        raise RuntimeError(
            "Image is empty or too small after download. Re-upload the photo or try again."
        )
    kind = _detect_image_kind(image_bytes)
    if kind == "heic_or_avif":
        raise RuntimeError(
            "This file looks like HEIC/HEIF (common from iPhone Photos). "
            "Cloud Vision needs JPEG or PNG — the app should convert before upload, or export the photo as JPEG in Photos."
        )
    if kind in ("empty_or_too_short", "unknown", "iso_bmf_unknown"):
        raise RuntimeError(
            f"Image bytes do not look like a supported format ({kind}). "
            "Use a clear JPEG or PNG from the camera or photo library."
        )


def extract_document_text(image_bytes: bytes) -> str:
    """
    Run Document Text Detection on image bytes.
    Returns the full concatenated text (may be empty if nothing detected).
    """
    if not image_bytes:
        return ""

    if isinstance(image_bytes, memoryview):
        image_bytes = image_bytes.tobytes()
    elif not isinstance(image_bytes, bytes):
        image_bytes = bytes(image_bytes)

    prepared = _prepare_image_bytes_for_vision(image_bytes)
    validate_image_bytes_for_vision(prepared)

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=prepared)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    if response.full_text_annotation and response.full_text_annotation.text:
        return response.full_text_annotation.text

    # Fallback: line-by-line from text_annotations[0] is the block; [1:] are words
    if response.text_annotations:
        return response.text_annotations[0].description or ""

    return ""
