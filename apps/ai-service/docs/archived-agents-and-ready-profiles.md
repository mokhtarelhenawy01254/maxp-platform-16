# Archived Agents & Ready Agent Profiles Management

This document details the architecture, database configurations, and UI flows for:
1. **Archived Agents**: Soft deletion, restoration, and permanent removal of agents.
2. **Ready Agent Profiles**: A catalog of pre-configured agent templates managed by Super Admins and used by merchants for quick-creation.

---

## 1. Archived Agents Architecture

### Database Indexing & Constraint Updates
To prevent unique constraint conflicts when a merchant tries to create a new active agent with a name previously used by a soft-deleted (archived) agent:
- The strict `uq_company_agent_name` unique constraint on `(company_id, name)` in table `ai.agents` was dropped.
- It was replaced by a partial unique index `uq_company_agent_name_active` defined as:
  ```sql
  CREATE UNIQUE INDEX uq_company_agent_name_active 
  ON ai.agents (company_id, name) 
  WHERE status != 'ARCHIVED';
  ```
- This allows multiple archived agents within the same company to share a name, or an active agent to share a name with archived ones, while maintaining uniqueness across active agents.

### API Endpoints
- **Archive Agent (Soft Delete)**: `DELETE /agents/{agent_id}` updates status to `ARCHIVED`.
- **Permanent Delete (Hard Delete)**: `DELETE /agents/{agent_id}?permanent=true` deletes the record completely from the database. Note: The CEO agent is protected from both actions.
- **Get Archived Agents**: `GET /agents?status=ARCHIVED` retrieves all archived agents.
- **Restore Agent**: `PATCH /agents/{agent_id}/status` with body `{"status": "ACTIVE"}` restores the agent to an active state.

---

## 2. Ready Agent Profiles (Quick-Create Cards)

Super Admins can define and configure pre-set agent templates (e.g. Sales Agent, Customer Support) which merchants can select to deploy agents instantly.

### Storage
- Stored as a JSON array within the `SystemSettings` table under `systemName = 'agentQuickProfiles'`.
- Configuration Schema:
  ```typescript
  interface ReadyProfile {
    slug: string;          // Unique identifier, e.g. "sales-agent"
    icon: string;          // Emojis/icon representation
    title: string;         // Arabic title
    titleEn?: string;      // English title
    category?: string;     // Arabic category name
    categoryEn?: string;   // English category name
    desc: string;          // Arabic description
    descEn?: string;       // English description
    sortOrder: number;     // Order priority
    isActive: boolean;     // Enable/disable card visibility
    personalities: Array<{
      id: string;
      name: string;
      desc: string;
      tone: 'friendly' | 'formal' | 'concise' | 'detailed';
      persona: string;
      goal: string;
    }>;
  }
  ```

### Management (Super Admin Panel)
- Accessible via `/super-admin/agent-profiles`.
- Supports full CRUD actions, ordering changes (up/down reorder), and status activation toggle.
- Endpoints under `/super-admin/agents/quick-profiles`:
  - `GET /` - List all profiles.
  - `POST /` - Create profile.
  - `PUT /:slug` - Edit profile.
  - `DELETE /:slug` - Delete profile.
  - `PUT /reorder` - Reorder profiles by passing a list of slugs.

### Consumption (Merchant Panel)
- Located on the Agent Profiles page.
- Loads profiles dynamically from `/agent-manager/quick-profiles` instead of falling back to hardcoded configurations.
