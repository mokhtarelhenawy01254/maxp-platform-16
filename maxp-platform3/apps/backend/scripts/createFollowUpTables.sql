CREATE TABLE IF NOT EXISTS company_follow_ups (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'unassigned',
    assigned_owner_id TEXT,
    assigned_owner_name TEXT,
    assigned_owner_email TEXT,
    assigned_owner_role TEXT,
    last_note TEXT,
    updated_at TIMESTAMPTZ,
    contacted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    next_action_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    last_escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_history (
    id TEXT PRIMARY KEY,
    follow_up_id TEXT NOT NULL REFERENCES company_follow_ups(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    action TEXT NOT NULL DEFAULT 'updated',
    next_action_at TIMESTAMPTZ,
    actor_id TEXT,
    actor_name TEXT,
    actor_email TEXT,
    actor_role TEXT,
    assigned_owner_id TEXT,
    assigned_owner_name TEXT,
    assigned_owner_email TEXT,
    assigned_owner_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_follow_up_id ON follow_up_history(follow_up_id);
