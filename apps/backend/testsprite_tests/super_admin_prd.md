# Comprehensive Super Admin Requirements (PRD)

## Overview
The Super Admin is the highest level of authority in the platform, responsible for managing companies, system health, development tasks, and global AI/RAG settings.

## Core Modules & Tools

### 1. Platform & Company Management
- **Company Administration**: Create, update, activate/deactivate companies.
- **Plan Management**: Define and manage subscription plans (BASIC, PRO, ENTERPRISE).
- **Subscription & Billing**: Monitor platform-wide revenue, marketplace stats, and billing overviews.
- **Wallet & Revenue**: Manage platform revenue and company wallets.

### 2. System Monitoring & Infrastructure
- **Server Health**: Real-time monitoring of backend services and database connections.
- **Server Usage**: Detailed statistics on CPU, memory, and disk usage.
- **Active Users**: Real-time tracking of active users across the platform.
- **Logs Management**: Access to system logs, AI logs, and activity logs.
- **System Maintenance**: Database migrations, cleanup of orphaned files, and image compression status.

### 3. Development Operations (DevOps)
- **Project Management**: Create and track platform-level development projects.
- **Task Management**: Kanban-style task tracking with details, priorities, and assignments.
- **Team Management**: Manage the development team, including XP, levels, and leaderboards.
- **Time Tracking**: Live timers, activity logs, and detailed time analytics for team members.
- **Releases & Changelog**: Documenting platform updates and version history.

### 4. AI & RAG Administration
- **AI Key Management**: Central management of AI provider keys (Google, OpenAI, DeepSeek).
- **RAG Control**: Global settings for Retrieval-Augmented Generation, including source management and indexing.
- **AI Monitoring**: Quality evaluation, error tracking, and usage analytics for AI responses.
- **Image Studio**: Monitoring AI image generation and quotas.

### 5. Access Control
- **Staff Company Access**: Managing which staff members can access specific company dashboards.
- **Super Admin User Management**: Creating and managing other Super Admin accounts.

## Test Scenarios for Testsprite

### Scenario A: Full Lifecycle of a Company
1. Create a new company.
2. Assign a subscription plan.
3. Verify company can log in (via staff access).
4. Monitor its usage in Super Admin stats.

### Scenario B: System Fault Tolerance
1. Check server health.
2. Simulate/Identify orphaned files.
3. Run maintenance (if applicable via API).

### Scenario C: Dev Task Workflow
1. Create a project.
2. Add a task to the project.
3. Start a timer for the task.
4. Complete the task and verify XP award.

### Scenario D: AI Key Failover
1. List active keys.
2. Verify usage limits in Super Admin dashboard.
3. Check AI logs for errors.
