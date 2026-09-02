"""Quick debug script to figure out why mock returns None."""
import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from src.api.admin import whatsapp_ai_ignore_list as m

_NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

session = MagicMock()
session.commit = AsyncMock(return_value=None)
session.rollback = AsyncMock(return_value=None)
nested = MagicMock()
nested.__aenter__ = AsyncMock(return_value=nested)
nested.__aexit__ = AsyncMock(return_value=None)
session.begin_nested = MagicMock(return_value=nested)

class _Map:
    def one_or_none(self_inner):
        return {'id': 'x', 'company_id': 'C', 'phone_number': 'P', 'label': None, 'notes': None, 'added_by_user_id': 'u', 'created_at': _NOW, 'updated_at': _NOW}

class _Res:
    def mappings(self_inner):
        return _Map()

call_count = {'n': 0}
async def fake_execute(*args, **kwargs):
    call_count['n'] += 1
    print(f'execute call {call_count["n"]}, kwargs keys={list(kwargs.keys())}')
    return _Res()

session.execute = AsyncMock(side_effect=fake_execute)

body = m.IgnoreBulkCreate(
    companyId='COMPANY_A',
    items=[m.IgnoreEntryCreate(companyId='COMPANY_A', phoneNumber='+966500000000')],
)
result = asyncio.run(m.bulk_add_ignore_entries(body=body, session=session, admin={'sub': 'user_1'}))
print('inserted:', result.inserted)
print('skipped:', result.skipped)
print('entries:', result.entries)
