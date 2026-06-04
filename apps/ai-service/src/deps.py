from __future__ import annotations

from fastapi import HTTPException, Request


def get_company_id(request: Request) -> str:
    """Extract validated company_id from request state."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise HTTPException(status_code=401, detail="Missing company context")
    return company_id


def get_customer_id(request: Request) -> str:
    """Extract customer_id from request state."""
    customer_id = getattr(request.state, "customer_id", None)
    if not customer_id:
        raise HTTPException(status_code=401, detail="Missing customer context")
    return customer_id
