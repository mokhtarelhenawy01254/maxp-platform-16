"""Tests for Alembic migrations (offline SQL mode, no live DB needed)."""

from __future__ import annotations

import os

import pytest


@pytest.fixture
def alembic_config():
    """Load Alembic config in offline mode for SQL generation."""
    from alembic.config import Config as AlembicConfig

    os.environ.setdefault(
        "DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test"
    )
    cfg = AlembicConfig("alembic.ini")
    cfg.set_main_option("script_location", "migrations")
    return cfg


def test_pgvector_migration_offline_sql_generates(alembic_config):
    """Verify the pgvector migration generates valid SQL when run offline."""
    from alembic.command import upgrade as alembic_upgrade

    try:
        alembic_upgrade(alembic_config, "0006", sql=True)
    except Exception as exc:
        pytest.fail(f"pgvector migration should generate valid SQL: {exc}")


def test_pgvector_migration_sql_contains_expected_statements(alembic_config, capsys):
    """The generated SQL must include CREATE EXTENSION, ADD COLUMN, CREATE INDEX."""
    import contextlib
    import io

    from alembic.command import upgrade as alembic_upgrade

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        alembic_upgrade(alembic_config, "0006", sql=True)

    sql = buf.getvalue()
    assert "CREATE EXTENSION" in sql
    assert "vector" in sql.lower()
    assert "ai.agentic_memory_fact" in sql
    assert "embedding" in sql
    assert "vector(768)" in sql or "vector( 768 )" in sql
    assert "ivfflat" in sql.lower()
    assert "vector_cosine_ops" in sql.lower()


def test_migration_chain_is_linear(alembic_config):
    """Verify the migration chain is single-head and linear (no branches)."""
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(alembic_config)
    heads = script.get_heads()

    assert len(heads) == 1, f"Expected 1 head, got {len(heads)}: {heads}"
    # Linearity: every migration file must be reachable walking down from
    # the head — an orphaned branch would make the walked count smaller.
    import pathlib

    versions_dir = pathlib.Path(__file__).resolve().parents[2] / "migrations" / "versions"
    migration_files = [p for p in versions_dir.glob("*.py") if p.name != "__init__.py"]
    all_ids = [r.revision for r in script.walk_revisions()]
    assert len(all_ids) == len(migration_files), (
        f"Walked {len(all_ids)} revisions but {len(migration_files)} migration files exist "
        "— a revision is orphaned (not connected to the head)"
    )



def test_pgvector_migration_has_downgrade(alembic_config):
    """downgrade() must be reversible: drop the index and column."""
    import contextlib
    import io

    from alembic.command import downgrade as alembic_downgrade

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        alembic_downgrade(alembic_config, "0006:0005", sql=True)

    sql = buf.getvalue()
    assert "DROP INDEX" in sql
    assert "DROP COLUMN" in sql
    assert "embedding" in sql
