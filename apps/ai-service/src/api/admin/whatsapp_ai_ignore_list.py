"""WhatsApp AI Ignore List (Do-Not-Reply for team members / VIP exclusions).

Each company can maintain a list of phone numbers whose incoming WhatsApp
messages the AI agent must NOT auto-reply to. Messages still arrive in the
inbox; only the AI auto-reply is suppressed.

Routes (mounted under the admin router):
    GET    /whatsapp-ai-ignore-list
    POST   /whatsapp-ai-ignore-list
    POST   /whatsapp-ai-ignore-list/bulk
    PATCH  /whatsapp-ai-ignore-list/{entry_id}
    DELETE /whatsapp-ai-ignore-list/{entry_id}
    GET    /whatsapp-ai-ignore-list/stats
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.auth import verify_admin_jwt
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]

MAX_BULK_SIZE = 500


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_phone(raw: str) -> str:
    """Return digits-only phone number. ``'+20 100-123-4567'`` → ``'201001234567'``."""
    if not raw:
        return ""
    return "".join(ch for ch in str(raw) if ch.isdigit())


def _validate_company_id(company_id: str | None) -> str:
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="company_id is required",
        )
    return company_id


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IgnoreEntryCreate(BaseModel):
    companyId: str = Field(..., description="Tenant ID")
    phoneNumber: str = Field(..., min_length=1, description="E.164 or local; will be normalized")
    label: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


class IgnoreEntryPatch(BaseModel):
    label: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


class IgnoreEntryRead(BaseModel):
    id: str
    companyId: str
    phoneNumber: str
    label: str | None
    notes: str | None
    addedByUserId: str | None
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(populate_by_name=True)


class IgnoreBulkCreate(BaseModel):
    companyId: str = Field(..., description="Tenant ID")
    items: list[IgnoreEntryCreate] = Field(..., min_length=1, max_length=MAX_BULK_SIZE)


class IgnoreBulkResponse(BaseModel):
    inserted: int
    skipped: int
    entries: list[IgnoreEntryRead]


class IgnoreStatsResponse(BaseModel):
    total: int
    skippedToday: int
    skippedThisWeek: int
    skippedAllTime: int

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/whatsapp-ai-ignore-list", response_model=list[IgnoreEntryRead])
async def list_ignore_entries(
    session: SessionDep,
    company_id: str = Query(..., min_length=1, alias="company_id"),
    admin: dict | None = Depends(verify_admin_jwt),
) -> list[IgnoreEntryRead]:
    """List all AI ignore-list entries for the given company."""
    result = await session.execute(
        text(
            "SELECT id, company_id, phone_number, label, notes, "
            "added_by_user_id, created_at, updated_at "
            "FROM ai.whatsapp_ai_ignore_list "
            "WHERE company_id = :cid "
            "ORDER BY created_at DESC"
        ),
        {"cid": company_id},
    )
    rows = result.mappings().all()
    return [
        IgnoreEntryRead(
            id=str(r["id"]),
            companyId=str(r["company_id"]),
            phoneNumber=r["phone_number"],
            label=r["label"],
            notes=r["notes"],
            addedByUserId=str(r["added_by_user_id"]) if r["added_by_user_id"] else None,
            createdAt=r["created_at"],
            updatedAt=r["updated_at"],
        )
        for r in rows
    ]


@router.post(
    "/whatsapp-ai-ignore-list",
    response_model=IgnoreEntryRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_ignore_entry(
    body: IgnoreEntryCreate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> IgnoreEntryRead:
    """Add a single phone number to the AI ignore list."""
    company_id = _validate_company_id(body.companyId)
    phone = _normalize_phone(body.phoneNumber)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="phoneNumber must contain at least one digit",
        )

    added_by = (admin or {}).get("sub") or (admin or {}).get("user_id")
    entry_id = str(uuid.uuid4())

    try:
        row = await session.execute(
            text(
                "INSERT INTO ai.whatsapp_ai_ignore_list "
                "(id, company_id, phone_number, label, notes, added_by_user_id) "
                "VALUES (:id, :cid, :pn, :lbl, :notes, :uid) "
                "RETURNING id, company_id, phone_number, label, notes, "
                "added_by_user_id, created_at, updated_at"
            ),
            {
                "id": entry_id,
                "cid": company_id,
                "pn": phone,
                "lbl": body.label,
                "notes": body.notes,
                "uid": added_by,
            },
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        logger.warning("wa_ignore_list_insert_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This number is already on the ignore list for this company",
        ) from exc

    r = row.mappings().one()
    return IgnoreEntryRead(
        id=str(r["id"]),
        companyId=str(r["company_id"]),
        phoneNumber=r["phone_number"],
        label=r["label"],
        notes=r["notes"],
        addedByUserId=str(r["added_by_user_id"]) if r["added_by_user_id"] else None,
        createdAt=r["created_at"],
        updatedAt=r["updated_at"],
    )


@router.post(
    "/whatsapp-ai-ignore-list/bulk",
    response_model=IgnoreBulkResponse,
)
async def bulk_add_ignore_entries(
    body: IgnoreBulkCreate,
    session: SessionDep,
    admin: dict | None = Depends(verify_admin_jwt),
) -> IgnoreBulkResponse:
    """Bulk insert numbers. Duplicates (per-company) are skipped silently."""
    company_id = _validate_company_id(body.companyId)
    if len(body.items) > MAX_BULK_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_BULK_SIZE} entries per request",
        )

    added_by = (admin or {}).get("sub") or (admin or {}).get("user_id")
    inserted: list[IgnoreEntryRead] = []
    skipped = 0

    for item in body.items:
        phone = _normalize_phone(item.phoneNumber)
        if not phone:
            skipped += 1
            continue
        entry_id = str(uuid.uuid4())
        try:
            row = await session.execute(
                text(
                    "INSERT INTO ai.whatsapp_ai_ignore_list "
                    "(id, company_id, phone_number, label, notes, added_by_user_id) "
                    "VALUES (:id, :cid, :pn, :lbl, :notes, :uid) "
                    "RETURNING id, company_id, phone_number, label, notes, "
                    "added_by_user_id, created_at, updated_at"
                ),
                {
                    "id": entry_id,
                    "cid": company_id,
                    "pn": phone,
                    "lbl": item.label,
                    "notes": item.notes,
                    "uid": added_by,
                },
            )
            r = row.mappings().one()
            inserted.append(
                IgnoreEntryRead(
                    id=str(r["id"]),
                    companyId=str(r["company_id"]),
                    phoneNumber=r["phone_number"],
                    label=r["label"],
                    notes=r["notes"],
                    addedByUserId=str(r["added_by_user_id"]) if r["added_by_user_id"] else None,
                    createdAt=r["created_at"],
                    updatedAt=r["updated_at"],
                )
            )
        except Exception:
            skipped += 1
            continue

    await session.commit()
    return IgnoreBulkResponse(inserted=len(inserted), skipped=skipped, entries=inserted)


@router.patch("/whatsapp-ai-ignore-list/{entry_id}", response_model=IgnoreEntryRead)
async def update_ignore_entry(
    entry_id: str,
    body: IgnoreEntryPatch,
    session: SessionDep,
    company_id: str = Query(..., min_length=1, alias="company_id"),
    admin: dict | None = Depends(verify_admin_jwt),
) -> IgnoreEntryRead:
    """Edit label/notes for an existing entry (company-scoped)."""
    updates: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if body.label is not None:
        updates["label"] = body.label
    if body.notes is not None:
        updates["notes"] = body.notes

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    params = {**updates, "id": entry_id, "cid": company_id}

    result = await session.execute(
        text(
            f"UPDATE ai.whatsapp_ai_ignore_list SET {set_clause} "
            "WHERE id = :id AND company_id = :cid "
            "RETURNING id, company_id, phone_number, label, notes, "
            "added_by_user_id, created_at, updated_at"
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    await session.commit()
    r = row
    return IgnoreEntryRead(
        id=str(r["id"]),
        companyId=str(r["company_id"]),
        phoneNumber=r["phone_number"],
        label=r["label"],
        notes=r["notes"],
        addedByUserId=str(r["added_by_user_id"]) if r["added_by_user_id"] else None,
        createdAt=r["created_at"],
        updatedAt=r["updated_at"],
    )


@router.delete(
    "/whatsapp-ai-ignore-list/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_ignore_entry(
    entry_id: str,
    session: SessionDep,
    company_id: str = Query(..., min_length=1, alias="company_id"),
    admin: dict | None = Depends(verify_admin_jwt),
) -> None:
    """Delete an entry (company-scoped)."""
    result = await session.execute(
        text(
            "DELETE FROM ai.whatsapp_ai_ignore_list "
            "WHERE id = :id AND company_id = :cid"
        ),
        {"id": entry_id, "cid": company_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    await session.commit()


@router.get("/whatsapp-ai-ignore-list/stats", response_model=IgnoreStatsResponse)
async def get_ignore_stats(
    session: SessionDep,
    company_id: str = Query(..., min_length=1, alias="company_id"),
    admin: dict | None = Depends(verify_admin_jwt),
) -> IgnoreStatsResponse:
    """Return counts: total entries + skipped messages (today / week / all-time).

    Skipped counts come from structlog's persisted log file via the worker's
    `wa_ai_reply_skipped_ignored` event. As a lightweight alternative (and to
    keep this endpoint DB-only), we estimate skipped counts from a counter
    column if present; otherwise we return 0s and let a future cron job fill
    the real numbers from logs.
    """
    # Total entries
    total_row = await session.execute(
        text(
            "SELECT COUNT(*) AS n FROM ai.whatsapp_ai_ignore_list "
            "WHERE company_id = :cid"
        ),
        {"cid": company_id},
    )
    total = int(total_row.scalar_one() or 0)

    # Skipped counts (best-effort): query a small counter table if it exists.
    # If the table is missing we silently return zeros — keeps the endpoint
    # working even before the optional counters table is provisioned.
    try:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_start = today_start - timedelta(days=today_start.weekday())

        async def _count_since(since: datetime) -> int:
            row = await session.execute(
                text(
                    "SELECT COUNT(*) FROM ai.whatsapp_ai_ignore_log "
                    "WHERE company_id = :cid AND skipped_at >= :since"
                ),
                {"cid": company_id, "since": since},
            )
            return int(row.scalar_one() or 0)

        skipped_today = await _count_since(today_start)
        skipped_week = await _count_since(week_start)
        all_time_row = await session.execute(
            text(
                "SELECT COUNT(*) FROM ai.whatsapp_ai_ignore_log "
                "WHERE company_id = :cid"
            ),
            {"cid": company_id},
        )
        skipped_all = int(all_time_row.scalar_one() or 0)
    except Exception:
        logger.debug("wa_ignore_stats_counter_table_missing", exc_info=True)
        skipped_today = skipped_week = skipped_all = 0

    return IgnoreStatsResponse(
        total=total,
        skippedToday=skipped_today,
        skippedThisWeek=skipped_week,
        skippedAllTime=skipped_all,
    )
