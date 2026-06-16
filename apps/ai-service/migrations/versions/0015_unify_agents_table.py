"""Unify agents: add CompanyAgent fields to Agent, migrate data, drop CompanyAgent.

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-16 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add CompanyAgent fields to ai.agents
    op.add_column("agents", sa.Column("description", sa.String(500), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("icon", sa.String(50), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("soul", sa.Text(), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("rules", sa.Text(), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("skills", sa.Text(), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("department_id", sa.String(), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("manager_type", sa.String(20), nullable=True), schema="ai")
    op.add_column("agents", sa.Column("created_by", sa.String(100), nullable=True), schema="ai")

    # Step 2: Add FK for department_id
    op.create_foreign_key(
        "fk_agents_department_id",
        "agents",
        "agent_departments",
        ["department_id"],
        ["id"],
        source_schema="ai",
        referent_schema="ai",
        ondelete="SET NULL",
    )

    # Step 3: Add indexes
    op.create_index("ix_agents_department_id", "agents", ["department_id"], schema="ai")

    # Step 4: Migrate data from ai.company_agents to ai.agents
    # Use DISTINCT ON to deduplicate (company_id, name) pairs in the source
    op.execute("""
        INSERT INTO ai.agents (id, company_id, name, role, description, icon, soul, rules,
                               skills, status, model, persona, allowed_tools, allowed_skills,
                               channels, guardrails, budget, parent_id, department_id,
                               manager_type, template_slug, created_by, version, config, metadata_,
                               created_at, updated_at)
        SELECT
            ca.id,
            ca.company_id,
            ca.name,
            ca.role,
            ca.description,
            ca.icon,
            ca.soul,
            ca.rules,
            ca.skills,
            ca.status,
            ca.model,
            '{}'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            CASE 
                WHEN ca.channels IS NULL OR ca.channels = '' THEN '[]'::jsonb
                WHEN left(ca.channels, 1) = '[' THEN ca.channels::jsonb
                ELSE '[]'::jsonb
            END,
            '{}'::jsonb,
            '{}'::jsonb,
            ca.parent_id,
            ca.department_id,
            ca.manager_type,
            ca.template_slug,
            ca.created_by,
            '1.0.0',
            '{}'::jsonb,
            '{}'::jsonb,
            COALESCE(ca.created_at, now()),
            COALESCE(ca.updated_at, now())
        FROM (
            SELECT DISTINCT ON (company_id, name) *
            FROM ai.company_agents
            ORDER BY company_id, name, created_at DESC
        ) ca
        WHERE NOT EXISTS (
            SELECT 1 FROM ai.agents a WHERE a.id = ca.id
        )
    """)

    # Step 5: Update existing agents with CompanyAgent fields where missing
    op.execute("""
        UPDATE ai.agents a
        SET
            description = ca.description,
            icon = COALESCE(a.icon, ca.icon),
            soul = COALESCE(a.soul, ca.soul),
            rules = COALESCE(a.rules, ca.rules),
            skills = COALESCE(a.skills, ca.skills),
            department_id = COALESCE(a.department_id, ca.department_id),
            manager_type = COALESCE(a.manager_type, ca.manager_type),
            created_by = COALESCE(a.created_by, ca.created_by)
        FROM ai.company_agents ca
        WHERE a.id = ca.id
          AND (a.description IS NULL OR a.soul IS NULL OR a.rules IS NULL
               OR a.department_id IS NULL OR a.manager_type IS NULL)
    """)

    # Step 6: Drop CompanyAgent table (all data now in agents)
    op.drop_index("ix_company_agents_company_id", table_name="company_agents", schema="ai", if_exists=True)
    op.drop_index("ix_company_agents_department_id", table_name="company_agents", schema="ai", if_exists=True)
    op.drop_table("company_agents", schema="ai")


def downgrade() -> None:
    # Recreate company_agents table
    op.create_table(
        "company_agents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("company_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True, server_default="🤖"),
        sa.Column("soul", sa.Text(), nullable=True),
        sa.Column("rules", sa.Text(), nullable=True),
        sa.Column("skills", sa.Text(), nullable=True),
        sa.Column("channels", postgresql.JSONB(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("department_id", sa.String(), nullable=True),
        sa.Column("manager_type", sa.String(), nullable=True, server_default="AGENT"),
        sa.Column("template_slug", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["department_id"], ["ai.agent_departments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        schema="ai",
    )
    op.create_index(None, "company_agents", ["company_id"], schema="ai")
    op.create_index(None, "company_agents", ["department_id"], schema="ai")

    # Reverse migrate data from agents to company_agents
    op.execute("""
        INSERT INTO ai.company_agents (id, company_id, name, role, description, icon,
                                        soul, rules, skills, channels, model, status,
                                        parent_id, department_id, manager_type, template_slug, created_by)
        SELECT id, company_id, name, role, description, icon,
               soul, rules, skills, channels, model, status,
               parent_id, department_id, manager_type, template_slug, created_by
        FROM ai.agents
        WHERE soul IS NOT NULL OR department_id IS NOT NULL
    """)

    # Remove the new columns from agents
    op.drop_index("ix_agents_department_id", table_name="agents", schema="ai")
    op.drop_constraint("fk_agents_department_id", "agents", schema="ai", type_="foreignkey")
    op.drop_column("agents", "description", schema="ai")
    op.drop_column("agents", "icon", schema="ai")
    op.drop_column("agents", "soul", schema="ai")
    op.drop_column("agents", "rules", schema="ai")
    op.drop_column("agents", "skills", schema="ai")
    op.drop_column("agents", "department_id", schema="ai")
    op.drop_column("agents", "manager_type", schema="ai")
    op.drop_column("agents", "created_by", schema="ai")
