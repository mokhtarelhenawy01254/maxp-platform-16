from __future__ import annotations

import re
from typing import Any

DATA_URL_RE = re.compile(r"^data:(?P<mime>[^;,]+);base64,(?P<data>.+)$", re.IGNORECASE | re.DOTALL)
IMAGE_MIME_PREFIX = "image/"
DEFAULT_IMAGE_MIME = "image/jpeg"
SUPPORTED_DETAIL = {"low", "high", "auto", "original"}


def build_user_content(message: str, attachments: list[dict[str, Any]] | None) -> str | list[dict[str, Any]]:
    """Build chat-completion content parts for text plus image attachments."""
    image_parts = [_part for item in (attachments or []) if (_part := image_attachment_to_openai_part(item))]
    if not image_parts:
        return message
    # Annotate text with image URLs so LLMs can pass them to product_search(image_url=...)
    text_content = message
    for part in image_parts:
        if part.get("type") == "image_url":
            url = (part.get("image_url") or {}).get("url", "")
            if url and url.startswith(("http://", "https://")):
                text_content = text_content + "\n[image_url: " + url + "]"
    return [{"type": "text", "text": text_content}, *image_parts]


def image_attachment_to_openai_part(attachment: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(attachment, dict):
        return None
    # Pass-through: already in OpenAI image_url format
    if attachment.get("type") == "image_url" and isinstance(attachment.get("image_url"), dict):
        url = str(attachment["image_url"].get("url") or "").strip()
        if url:
            return attachment
    if not _is_image_attachment(attachment):
        return None

    image_url = _image_url(attachment)
    if not image_url:
        return None

    image_payload: dict[str, Any] = {"url": image_url}
    detail = str(attachment.get("detail") or "").strip().lower()
    if detail in SUPPORTED_DETAIL:
        image_payload["detail"] = detail

    return {
        "type": "image_url",
        "image_url": image_payload,
    }


def _is_image_attachment(attachment: dict[str, Any]) -> bool:
    kind = str(attachment.get("type") or attachment.get("kind") or "").strip().lower()
    mime = str(
        attachment.get("mime_type")
        or attachment.get("mimeType")
        or attachment.get("content_type")
        or attachment.get("contentType")
        or ""
    ).strip().lower()
    return kind in {"image", "photo", "picture"} or mime.startswith(IMAGE_MIME_PREFIX)


def _image_url(attachment: dict[str, Any]) -> str | None:
    data_url = str(attachment.get("data_url") or attachment.get("dataUrl") or "").strip()
    if data_url.startswith("data:image/"):
        return data_url

    url = str(
        attachment.get("url")
        or attachment.get("image_url")
        or attachment.get("imageUrl")
        or attachment.get("file_url")
        or attachment.get("fileUrl")
        or ""
    ).strip()
    if url.startswith(("http://", "https://", "data:image/")):
        return url

    base64_data = str(
        attachment.get("base64_data")
        or attachment.get("base64Data")
        or attachment.get("image_bytes")
        or attachment.get("imageBytes")
        or ""
    ).strip()
    if base64_data:
        mime = str(
            attachment.get("mime_type")
            or attachment.get("mimeType")
            or attachment.get("content_type")
            or attachment.get("contentType")
            or DEFAULT_IMAGE_MIME
        ).strip() or DEFAULT_IMAGE_MIME
        return f"data:{mime};base64,{base64_data}"

    return None


def data_url_to_inline_data(url: str) -> tuple[str, str] | None:
    match = DATA_URL_RE.match(str(url or "").strip())
    if match:
        return match.group("mime"), match.group("data")
    if url.startswith(("http://", "https://")):
        import httpx
        try:
            resp = httpx.get(url, timeout=10, verify=False)
            if resp.status_code == 200:
                import base64
                ct = resp.headers.get("content-type", "image/jpeg")
                return ct, base64.b64encode(resp.content).decode()
        except Exception:
            pass
    return None
