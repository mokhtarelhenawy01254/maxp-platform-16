from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.base import BaseRepository


class FacebookPageRepository(BaseRepository):
    """Data access for Facebook page tokens."""

    async def get_page_token(self, company_id: str, page_id: str) -> str | None:
        """Get the access token for a Facebook page."""
        row = await self._session.execute(text("""
            SELECT "pageAccessToken" FROM public.facebook_pages
            WHERE "pageId" = :pid AND "companyId" = :cid
            LIMIT 1
        """), {"pid": page_id, "cid": company_id})
        result = row.first()
        return result[0] if result else None
