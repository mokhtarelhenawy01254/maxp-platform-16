#!/usr/bin/env python
"""Run tests without pytest to avoid conftest issues"""

import asyncio
import sys
sys.path.insert(0, "H:/maxp-platform/apps/ai-service")

# Simple test runner
async def test_company_snapshot():
    from sqlalchemy import text
    
    # Mock _make_row
    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()
    
    class _Rows:
        def __init__(self, data):
            self._data = data
        
        def first(self):
            return self._data[0] if self._data else None
    
    class _Session:
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, exc_type, exc, tb):
            return False
        
        async def execute(self, sql, params):
            statement = str(sql)
            print("DEBUG SQL:", repr(statement[:300]))
            print("DEBUG: has FILTER?", "FILTER" in statement)
            print("DEBUG: has status PENDING?", "status = 'PENDING'" in statement)
            # First query: has multiple FILTER clauses (pending, confirmed, shipped, etc.)
            if "FILTER (WHERE status = 'PENDING')" in statement and "FILTER (WHERE status = 'CONFIRMED')" in statement:
                print("DEBUG: matched first query (multiple FILTER)")
                return _Rows([_make_row({
                    "total": 5, "revenue": 2000.0,
                    "pending": 2, "confirmed": 1, "shipped": 1, "delivered": 1, "cancelled": 0,
                })])
            # Second query: simple COUNT with WHERE status = 'PENDING' (not in FILTER)
            if "status = 'PENDING'" in statement and "FILTER" not in statement:
                print("DEBUG: matched pending condition")
                return _Rows([_make_row({"cnt": 3})])
            print("DEBUG: no match, returning empty")
            if "FROM products" in statement:
                return _Rows([_make_row({"cnt": 4})])
            return _Rows([])
    
    # Mock async_session
    import src.db.session as db_session
    original_async_session = db_session.async_session
    db_session.async_session = lambda: _Session()
    
    try:
        from src.tools.definitions.sales import company_snapshot, CompanySnapshotInput
        result = await company_snapshot(CompanySnapshotInput(company_id="comp1"))
        print("Result:", result)
        
        # Check pending_total
        assert result["pendingOrders"] == 3, f"Expected pendingOrders=3, got {result['pendingOrders']}"
        print("✓ test_company_snapshot_with_data PASSED")
        return True
    except Exception as e:
        print(f"✗ test_company_snapshot_with_data FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db_session.async_session = original_async_session

if __name__ == "__main__":
    result = asyncio.run(test_company_snapshot())
    sys.exit(0 if result else 1)