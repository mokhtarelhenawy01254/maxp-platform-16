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
from sqlalchemy import Column, MetaData, String, Table, column, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.auth import require_admin_or_service, verify_admin_jwt
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]

MAX_BULK_SIZE = 500
# E.164 standard: country code + subscriber number, 7-15 digits total.
# We tighten the lower bound to 10 because every realistic phone we care
# about (EG, SA, AE) is at least 10 digits.
MIN_PHONE_DIGITS = 10
MAX_PHONE_DIGITS = 15
MAX_LABEL_LEN = 200
MAX_NOTES_LEN = 1000


# ---------------------------------------------------------------------------
# SQLAlchemy Core table reference for the bulk INSERT path.
# Defining it here (instead of pulling in ORM models) keeps the bulk
# endpoint free of session/state churn and lets us emit a single
# multi-row INSERT ... ON CONFLICT DO NOTHING statement.
# ---------------------------------------------------------------------------
_ai_schema = MetaData(schema="ai")
whatsapp_ai_ignore_list_tbl = Table(
    "whatsapp_ai_ignore_list",
    _ai_schema,
    Column("id", String),
    Column("company_id", String),
    Column("phone_number", String),
    Column("label", String),
    Column("notes", String),
    Column("added_by_user_id", String),
    Column("created_at", String),
    Column("updated_at", String),
)


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


def _is_valid_phone(phone: str) -> bool:
    """E.164 length check — at least 10 digits, at most 15, all digits."""
    return bool(phone) and phone.isdigit() and MIN_PHONE_DIGITS <= len(phone) <= MAX_PHONE_DIGITS


def _normalize_optional_text(value: str | None, max_len: int) -> str | None:
    """Trim text inputs and reject over-long values that could pollute logs.

    Returns ``None`` for empty strings so the database stores NULL rather
    than an empty string.
    """
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"text field exceeds {max_len} characters",
        )
    return cleaned


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
    admin: dict = Depends(require_admin_or_service),
) -> IgnoreBulkResponse:
    """Bulk insert numbers. Duplicates (per-company) are skipped atomically.

    Implementation
    --------------
    Single multi-row ``INSERT ... ON CONFLICT DO NOTHING RETURNING`` via
    SQLAlchemy's PostgreSQL dialect. This is the modern (2026) pattern
    and replaces a per-row loop with a single round-trip:

    * Duplicates are silently skipped at the DB level — the statement
      returns the rows that actually inserted, so the response can
      distinguish ``inserted`` from ``skipped`` without a second query.
    * Atomic at the transaction level — a single statement can't leave
      the transaction in a poisoned state, so the original "first
      duplicate kills the rest of the batch" bug is structurally
      impossible.
    * Items that fail client-side validation (bad phone format,
      over-long label/notes) are filtered out *before* the DB call and
      counted as ``skipped`` so a 500-row batch with 5 bad rows
      successfully inserts the other 495.

    Auth requires either an admin JWT (frontend users) or the
    ``MAXP_SERVICE_TOKEN`` (backend service-to-service). The 401 path
    prevents unauthenticated calls from the public internet.
    """
    company_id = _validate_company_id(body.companyId)
    if len(body.items) > MAX_BULK_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_BULK_SIZE} entries per request",
        )

    added_by = admin.get("sub") or admin.get("user_id") or "service"

    # ---- Phase 1: client-side validation + dedup (within the request) ----
    # Normalize + validate every row, drop bad ones, and dedupe the rest
    # so we don't ship a 500-row INSERT where 50 of them are obviously
    # broken before we even touch the DB.
    seen_in_batch: set[str] = set()
    valid_rows: list[dict[str, Any]] = []
    skipped = 0
    invalid_samples: list[str] = []

    for item in body.items:
        try:
            phone = _normalize_phone(item.phoneNumber)
            if not _is_valid_phone(phone):
                skipped += 1
                if len(invalid_samples) < 3:
                    invalid_samples.append(
                        f"{item.phoneNumber!r} (normalized={phone!r})"
                    )
                continue
            if phone in seen_in_batch:
                # Dedupe inside the request — the ON CONFLICT clause
                # would also catch this but the API contract is
                # cleaner if we report the exact skipped count.
                skipped += 1
                continue
            seen_in_batch.add(phone)

            label = _normalize_optional_text(item.label, MAX_LABEL_LEN)
            notes = _normalize_optional_text(item.notes, MAX_NOTES_LEN)
            valid_rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "company_id": company_id,
                    "phone_number": phone,
                    "label": label,
                    "notes": notes,
                    "added_by_user_id": added_by,
                }
            )
        except HTTPException:
            # _normalize_optional_text raises on over-long text — count
            # the row as skipped but keep validating the rest of the
            # batch so a single bad label doesn't 400 the whole call.
            skipped += 1

    if invalid_samples:
        logger.info(
            "wa_ignore_list_bulk_input_rejected",
            company_id=company_id,
            samples=invalid_samples,
        )

    if not valid_rows:
        return IgnoreBulkResponse(inserted=0, skipped=skipped, entries=[])

    # ---- Phase 2: single batch INSERT with ON CONFLICT DO NOTHING ----
    insert_stmt = pg_insert(whatsapp_ai_ignore_list_tbl).values(valid_rows)
    insert_stmt = insert_stmt.on_conflict_do_nothing(
        index_elements=["company_id", "phone_number"]
    ).returning(
        whatsapp_ai_ignore_list_tbl.c.id,
        whatsapp_ai_ignore_list_tbl.c.company_id,
        whatsapp_ai_ignore_list_tbl.c.phone_number,
        whatsapp_ai_ignore_list_tbl.c.label,
        whatsapp_ai_ignore_list_tbl.c.notes,
        whatsapp_ai_ignore_list_tbl.c.added_by_user_id,
        whatsapp_ai_ignore_list_tbl.c.created_at,
        whatsapp_ai_ignore_list_tbl.c.updated_at,
    )

    try:
        result = await session.execute(insert_stmt)
        rows = result.mappings().all()
    except Exception as exc:
        await session.rollback()
        logger.error(
            "wa_ignore_list_bulk_insert_failed",
            company_id=company_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk insert failed",
        ) from exc

    await session.commit()

    # The DB only returns the rows that actually inserted (because of
    # ON CONFLICT DO NOTHING). The remainder of ``valid_rows`` were
    # silently dropped as duplicates of rows that were already on the
    # list.
    db_inserted = len(rows)
    db_skipped = len(valid_rows) - db_inserted
    skipped += db_skipped

    inserted_entries = [
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

    logger.info(
        "wa_ignore_list_bulk_inserted",
        company_id=company_id,
        requested=len(body.items),
        valid=len(valid_rows),
        inserted=db_inserted,
        skipped=skipped,
        auth_kind=admin.get("auth_kind"),
    )

    return IgnoreBulkResponse(
        inserted=db_inserted,
        skipped=skipped,
        entries=inserted_entries,
    )


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
