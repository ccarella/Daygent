Daygent PRD
# Product Requirements Document (PRD) — **Daygent**

## 1. Executive Summary

**Product Name**: Daygent
**Domain**: Daygent.ai
**Tagline**: Project Management for working with software developer agents

**Vision**: Daygent is a project management platform designed specifically for developers using Claude Code as their primary development tool. It bridges the gap between project planning and AI-driven development by creating Claude Code-optimized issue descriptions and maintaining synchronization with GitHub throughout the development lifecycle.

**Core Value Proposition**: Transform simple issue descriptions into comprehensive, AI-ready specifications that Claude Code can execute effectively, while maintaining full visibility of the development process through GitHub synchronization.

---

## 2. Product Overview

### 2.1 Primary Use Case

1. **User creates an issue** in Daygent with a brief description
2. **AI expands the issue** into a detailed, Claude Code-ready specification
3. **Issue syncs to GitHub** for version control and collaboration
4. **User provides issue URL to Claude Code** for implementation
5. **Claude Code develops the solution** and creates a PR
6. **Daygent tracks progress** through GitHub webhooks
7. **Human reviews and merges** the completed work

### 2.2 Key Differentiators

- **Claude Code Optimization**: Issues are specifically formatted for Claude Code consumption
- **Seamless GitHub Integration**: Full bidirectional sync with GitHub Issues and PRs
- **AI-First Workflow**: Designed for AI agents as primary developers, humans as reviewers
- **Minimal UI**: Fast, keyboard-driven interface optimized for productivity

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Frontend Framework | Next.js 14+ (App Router) | SSR/ISR, React 18+, TypeScript support |
| Styling | Tailwind CSS | Utility-first, fast development, consistent design |
| UI Components | Shadcn/ui | Accessible, customizable, keyboard-friendly |
| Backend/Database | Supabase | PostgreSQL, Auth, Realtime, Row Level Security |
| AI Integration | Anthropic API | Claude models for issue expansion and analysis |
| Version Control | GitHub API v4 (GraphQL) | Comprehensive repository management |
| Testing | Vitest + Playwright | Unit and E2E testing with MCP support |
| Hosting | Vercel | Optimized for Next.js, edge functions |
| Payments | Stripe | Subscription management, usage tracking |
| State Management | Zustand | Lightweight, TypeScript-friendly |
| Form Handling | React Hook Form + Zod | Type-safe forms with validation |

### 3.2 Architecture Principles

- **API-First Design**: All features accessible via API for future integrations
- **Event-Driven**: GitHub webhooks drive state changes
- **Optimistic UI**: Immediate feedback with background synchronization
- **Progressive Enhancement**: Core features work without JavaScript
- **Mobile-Responsive**: Fully functional on tablets and phones

---

## 4. Database Schema

### 4.1 Core Tables

sql
-- Organizations (workspace container)
CREATE TABLE organizations (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
slug TEXT UNIQUE NOT NULL,
subscription_status TEXT DEFAULT 'trialing',
subscription_id TEXT, -- Stripe subscription ID
trial_ends_at TIMESTAMPTZ,
seats_used INTEGER DEFAULT 1,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email TEXT UNIQUE NOT NULL,
name TEXT,
avatar_url TEXT,
github_id INTEGER UNIQUE,
github_username TEXT,
google_id TEXT UNIQUE,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members
CREATE TABLE organization_members (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
role TEXT DEFAULT 'member', -- all members have full access
invited_by UUID REFERENCES users(id),
invited_at TIMESTAMPTZ DEFAULT NOW(),
joined_at TIMESTAMPTZ,
UNIQUE(organization_id, user_id)
);

-- GitHub Repositories
CREATE TABLE repositories (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
github_id INTEGER UNIQUE NOT NULL,
name TEXT NOT NULL,
full_name TEXT NOT NULL, -- owner/repo format
private BOOLEAN DEFAULT true,
default_branch TEXT DEFAULT 'main',
installation_id INTEGER, -- GitHub App installation
webhook_secret TEXT, -- for webhook validation
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
name TEXT NOT NULL,
description TEXT,
status TEXT DEFAULT 'active', -- active, completed, archived
created_by UUID REFERENCES users(id),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues
CREATE TABLE issues (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
github_issue_number INTEGER,
github_issue_id INTEGER,
title TEXT NOT NULL,
original_description TEXT, -- user's original input
expanded_description TEXT, -- AI-expanded version
status TEXT DEFAULT 'shaping', -- shaping, todo, in_progress, in_review, deployed
priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
created_by UUID REFERENCES users(id),
assigned_to UUID REFERENCES users(id),
github_pr_number INTEGER,
github_pr_id INTEGER,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
completed_at TIMESTAMPTZ,
UNIQUE(repository_id, github_issue_number)
);

-- Issue Comments
CREATE TABLE issue_comments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
user_id UUID REFERENCES users(id),
content TEXT NOT NULL,
is_ai_generated BOOLEAN DEFAULT false,
github_comment_id INTEGER,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Feed
CREATE TABLE activities (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
project_id UUID REFERENCES projects(id),
issue_id UUID REFERENCES issues(id),
user_id UUID REFERENCES users(id),
type TEXT NOT NULL, -- issue_created, issue_updated, pr_created, etc.
description TEXT NOT NULL, -- one-line description
metadata JSONB, -- additional context
external_url TEXT, -- GitHub URL if applicable
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage Tracking
CREATE TABLE ai_usage (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
user_id UUID REFERENCES users(id),
model TEXT NOT NULL, -- claude-3-haiku, claude-3-sonnet, etc.
tokens_used INTEGER,
purpose TEXT, -- issue_expansion, code_review, etc.
cost_cents INTEGER, -- calculated cost in cents
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_repository ON issues(repository_id);
CREATE INDEX idx_activities_organization ON activities(organization_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);


### 4.2 Row Level Security (RLS)

sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
id IN (
SELECT organization_id FROM organization_members
WHERE user_id = auth.uid()
)
);

-- Similar policies for other tables...


---

## 5. Feature Specifications

### 5.1 Authentication & Onboarding

#### 5.1.1 Authentication Methods
- **GitHub OAuth**
- Scopes: `repo`, `read:user`, `user:email`
- Store GitHub ID and username for API calls
- **Google OAuth**
- Scopes: `email`, `profile`
- Fallback for non-GitHub users

#### 5.1.2 Onboarding Flow
1. User signs up via GitHub/Google
2. Create or join organization
3. Connect GitHub repository
4. Create first project
5. Tutorial: Create AI-expanded issue

### 5.2 Issue Management

#### 5.2.1 Issue Creation
typescript
interface IssueCreationFlow {
// Step 1: Quick Creation
quickCreate: {
title: string;
description: string; // 1-3 sentences
};

// Step 2: AI Expansion
aiExpansion: {
model: 'claude-3-haiku-20240307';
prompt: IssueExpansionPrompt;
output: {
expandedDescription: string;
suggestedLabels: string[];
estimatedComplexity: 'small' | 'medium' | 'large';
implementationSteps: string[];
};
};

// Step 3: GitHub Sync
githubSync: {
createIssue: boolean;
issueTemplate: GithubIssueTemplate;
};
}


#### 5.2.2 Kanban Board
- **Columns**: Shaping → To-Do → In Progress → In Review → Deployed
- **Drag & Drop**: Update status with optimistic UI
- **Filters**: By project, assignee, priority, labels
- **Quick Actions**: Edit, assign, change priority via keyboard

#### 5.2.3 Issue Expansion Prompt Template
markdown
You are helping expand a brief issue description into a comprehensive specification for Claude Code.

Original Issue:
Title: {{title}}
Description: {{description}}

Please create an expanded issue description that includes:
1. Clear acceptance criteria
2. Technical implementation details
3. Edge cases to consider
4. Testing requirements
5. Any relevant code examples or API references

Format the response as a GitHub issue body with markdown.


### 5.3 GitHub Integration

#### 5.3.1 GitHub App Permissions
- **Repository permissions**:
- Issues: Read & Write
- Pull requests: Read & Write
- Contents: Read
- Metadata: Read
- Webhooks: Read
- Checks: Read

#### 5.3.2 Webhook Events
typescript
interface WebhookHandlers {
'issues': ['opened', 'edited', 'closed', 'reopened', 'assigned', 'unassigned', 'labeled', 'unlabeled'];
'pull_request': ['opened', 'edited', 'closed', 'reopened', 'synchronize', 'ready_for_review'];
'issue_comment': ['created', 'edited', 'deleted'];
'pull_request_review': ['submitted', 'edited', 'dismissed'];
'pull_request_review_comment': ['created', 'edited', 'deleted'];
'push': ['commits'];
'check_run': ['created', 'completed'];
'check_suite': ['completed'];
}


#### 5.3.3 Sync Strategy
- **Bidirectional sync**: Changes in either platform reflect immediately
- **Conflict resolution**: GitHub is source of truth
- **Offline queue**: Store local changes when GitHub is unavailable
- **Webhook validation**: Verify signatures for security

### 5.4 Command Palette (Cmd+K)

#### 5.4.1 Global Actions
typescript
interface CommandPaletteActions {
navigation: [
'Go to Issues',
'Go to Projects',
'Go to Repository',
'Go to Settings'
];

creation: [
'Create New Issue',
'Create New Project',
'Quick Add Issue (inline)',
'Import from GitHub'
];

issueActions: [
'Change Status',
'Assign Issue',
'Set Priority',
'Add Comment',
'View on GitHub',
'Copy Claude Code Command'
];

search: [
'Search Issues',
'Search by Number',
'Search Comments',
'Filter by Status'
];

aiActions: [
'Expand Issue with AI',
'Generate Test Cases',
'Suggest Improvements'
];
}


#### 5.4.2 Keyboard Shortcuts
- `Cmd+K`: Open command palette
- `Cmd+I`: Create new issue
- `Cmd+/`: Search issues
- `J/K`: Navigate up/down in lists
- `Enter`: Open selected item
- `Cmd+Enter`: Quick save
- `Esc`: Cancel/close modal

### 5.5 AI Integration

#### 5.5.1 Issue Expansion Service
typescript
interface IssueExpansionService {
async expandIssue(input: {
title: string;
description: string;
projectContext?: string;
previousIssues?: Issue[];
}): Promise<{
expandedDescription: string;
suggestedLabels: string[];
implementationSteps: string[];
testingStrategy: string;
estimatedTokens: number;
estimatedCost: number;
}>;
}


#### 5.5.2 Model Selection Strategy
- **Issue Expansion**: Claude 3 Haiku (fast, cost-effective)
- **Code Review Analysis**: Claude 3 Sonnet (balanced)
- **Complex Planning**: Claude 3 Opus (when requested)
- **Future**: Allow BYO-API key with OpenRouter support

### 5.6 Activity Feed

#### 5.6.1 Event Types
- Issue created/updated/closed
- PR created/updated/merged
- Comments added
- Status changes
- AI expansions completed
- Test results posted

#### 5.6.2 Display Format
typescript
interface ActivityItem {
icon: IconType;
actor: User | 'Daygent AI';
action: string; // "expanded issue", "created PR", etc.
target: string; // "Feature: Add user authentication"
timestamp: Date;
link: {
internal?: string; // Daygent URL
external?: string; // GitHub URL
};
}


---

## 6. User Interface Design

### 6.1 Design System

#### 6.1.1 Color Palette
css
:root {
--background: 0 0% 100%; /* white */
--foreground: 0 0% 3.9%; /* near-black */
--primary: 0 0% 9%; /* black */
--primary-foreground: 0 0% 98%; /* white */
--secondary: 0 0% 96.1%; /* light gray */
--muted: 0 0% 96.1%; /* light gray */
--accent: 217 91% 60%; /* blue accent */
--destructive: 0 84.2% 60.2%; /* red */
--border: 0 0% 89.8%; /* gray */
--ring: 0 0% 3.9%; /* focus ring */
}


#### 6.1.2 Typography
- **Font**: Inter (sans-serif)
- **Headings**: Bold, tight tracking
- **Body**: Regular, relaxed leading
- **Code**: JetBrains Mono

#### 6.1.3 Component Library (Shadcn/ui)
- Button variants: default, secondary, outline, ghost
- Form components: Input, Textarea, Select, Checkbox
- Layout: Card, Dialog, Sheet, Tabs
- Feedback: Toast, Alert, Progress

### 6.2 Page Layouts

#### 6.2.1 Dashboard Layout

┌─────────────────────────────────────────────────────┐
│ Logo Daygent Search (Cmd+/) User ▼ │
├─────────────────────────────────────────────────────┤
│ ┌───────────┬───────────────────────────────────┐ │
│ │ Sidebar │ Main Content Area │ │
│ │ │ │ │
│ │ • Issues │ [Kanban Board / List View] │ │
│ │ • Projects│ │ │
│ │ • Activity│ │ │
│ │ • Settings│ │ │
│ │ │ │ │
│ └───────────┴───────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘


#### 6.2.2 Issue Creation Modal

┌─────────────────────────────────────────────────────┐
│ Create New Issue X │
├─────────────────────────────────────────────────────┤
│ Title* │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Add user authentication │ │
│ └─────────────────────────────────────────────────┘ │
│ │
│ Brief Description* │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Allow users to sign up and log in with │ │
│ │ email/password and social auth │ │
│ └─────────────────────────────────────────────────┘ │
│ │
│ Project Priority │
│ [MVP Phase 1 ▼] [Medium ▼] │
│ │
│ ┌─────────────────────────┐ ┌───────────────────┐ │
│ │ Cancel │ │ Create & Expand → │ │
│ └─────────────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────┘


### 6.3 Responsive Design
- **Desktop**: Full sidebar, multi-column kanban
- **Tablet**: Collapsible sidebar, horizontal scroll for kanban
- **Mobile**: Bottom navigation, single column view

---

## 7. API Specifications

### 7.1 REST API Endpoints

typescript
// Authentication
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/session
POST /api/auth/refresh

// Organizations
GET /api/organizations
POST /api/organizations
GET /api/organizations/:id
PATCH /api/organizations/:id
DELETE /api/organizations/:id

// Repositories
GET /api/repositories
POST /api/repositories
GET /api/repositories/:id
PATCH /api/repositories/:id
DELETE /api/repositories/:id
POST /api/repositories/:id/sync

// Projects
GET /api/projects
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id

// Issues
GET /api/issues
POST /api/issues
GET /api/issues/:id
PATCH /api/issues/:id
DELETE /api/issues/:id
POST /api/issues/:id/expand
POST /api/issues/:id/sync

// Comments
GET /api/issues/:id/comments
POST /api/issues/:id/comments
PATCH /api/comments/:id
DELETE /api/comments/:id

// Activities
GET /api/activities
GET /api/activities/feed

// Webhooks
POST /api/webhooks/github


### 7.2 Real-time Events (Supabase Realtime)

typescript
interface RealtimeEvents {
'issue:created': Issue;
'issue:updated': Issue;
'issue:deleted': { id: string };
'comment:created': Comment;
'activity:new': Activity;
'sync:started': { repositoryId: string };
'sync:completed': { repositoryId: string };
}


---

## 8. Testing Requirements

### 8.1 Test Coverage Goals
- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Visual Regression**: Key UI components

### 8.2 Test Scenarios

#### 8.2.1 Unit Tests (Vitest)
typescript
// Example test structure
describe('IssueExpansionService', () => {
it('should expand a simple issue description', async () => {
const input = {
title: 'Add user authentication',
description: 'Users should be able to log in'
};

const result = await expandIssue(input);

expect(result.expandedDescription).toContain('Acceptance Criteria');
expect(result.implementationSteps).toHaveLength(greaterThan(3));
expect(result.estimatedTokens).toBeLessThan(1000);
});
});


#### 8.2.2 E2E Tests (Playwright)
typescript
// Critical flows to test
const e2eFlows = [
'User signup and onboarding',
'Create and expand an issue',
'Sync issue to GitHub',
'Update issue status via drag-drop',
'Command palette navigation',
'GitHub webhook processing',
'Activity feed updates'
];


### 8.3 Performance Requirements
- **Page Load**: < 1s initial paint
- **API Response**: < 500ms p95
- **AI Expansion**: < 5s average
- **Realtime Updates**: < 100ms latency

---

## 9. Security & Privacy

### 9.1 Security Measures
- **Authentication**: OAuth 2.0 with PKCE
- **API Security**: JWT with refresh tokens
- **Data Encryption**: TLS 1.3+ in transit, AES-256 at rest
- **GitHub Webhook**: Signature validation
- **Rate Limiting**: 100 requests/minute per user
- **CORS**: Strict origin validation

### 9.2 Data Privacy
- **PII Handling**: Minimal collection, encrypted storage
- **Code Privacy**: No source code storage, only metadata
- **AI Processing**: No training on user data
- **Data Retention**: 90 days for deleted items
- **Export**: Full data export available

---

## 10. Monetization & Pricing

### 10.1 Pricing Model
- **Price**: $9.99 per seat per month
- **Billing**: Monthly or annual (2 months free)
- **Trial**: 14 days free, no credit card required
- **Seats**: Each active user counts as a seat

### 10.2 Subscription Management (Stripe)
- **Payment Methods**: Credit card, ACH (for annual)
- **Invoice Management**: Automatic receipts
- **Seat Management**: Add/remove seats anytime
- **Proration**: Automatic for mid-cycle changes
- **Cancellation**: Immediate with access until period end

---

## 11. MVP Deliverables

### 11.1 Core Features (Launch)
1. **Authentication**: GitHub + Google OAuth
2. **Repository Connection**: Single GitHub repo
3. **Issue Management**: Create, expand with AI, sync to GitHub
4. **Kanban Board**: All stages, drag-drop
5. **Command Palette**: Navigation + quick actions
6. **Activity Feed**: Basic event tracking
7. **Single Seat**: No team features yet

### 11.2 Post-MVP Roadmap
- **Phase 1** (Month 1-2): Multi-seat support, team invites
- **Phase 2** (Month 3-4): BYO API keys, OpenRouter
- **Phase 3** (Month 5-6): Advanced AI features, analytics
- **Phase 4** (Month 7+): GitLab support, custom workflows

---

## 12. Implementation Guidelines

### 12.1 Development Workflow
1. **Issue Creation**: Use Daygent to create all development issues
2. **AI Expansion**: Let Daygent expand issues before starting
3. **Claude Code**: Use expanded issues with Claude Code
4. **PR Creation**: Claude Code creates PRs
5. **Code Review**: Human review in GitHub
6. **Deployment**: Manual merge and deploy

### 12.2 Code Standards
- **TypeScript**: Strict mode, no any
- **Components**: Functional with hooks
- **State**: Zustand for global, useState for local
- **Styling**: Tailwind classes only, no custom CSS
- **Testing**: Test before commit
- **Documentation**: JSDoc for public APIs

### 12.3 Deployment Strategy
- **Preview**: Vercel preview for each PR
- **Staging**: Auto-deploy main to staging
- **Production**: Manual promote from staging
- **Rollback**: One-click via Vercel
- **Monitoring**: Vercel Analytics + Sentry

---

## 13. Success Metrics

### 13.1 Launch Metrics (First 30 Days)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Sign-ups | 500 | Unique users registered |
| Trial Conversion | 15% | Trials → paid subscriptions |
| Active Issues | 20/user | Issues created per active user |
| AI Expansions | 80% | Issues expanded vs created |
| GitHub Sync Success | 95% | Successful sync operations |

### 13.2 Growth Metrics (90 Days)
| Metric | Target | Measurement |
|--------|--------|-------------|
| MRR | $5,000 | Monthly recurring revenue |
| Retention | 85% | Month-over-month retention |
| DAU/MAU | 40% | Daily/monthly active users |
| NPS | 50+ | Net promoter score |
| Support Tickets | <5% | Tickets per active user |

---

## 14. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GitHub API rate limits | High | Medium | Implement caching, queue system |
| AI API costs exceed budget | High | Medium | Usage limits, efficient prompts |
| Claude Code adoption slow | High | Low | Clear docs, video tutorials |
| Sync conflicts | Medium | High | GitHub as source of truth |
| Subscription fraud | Medium | Low | Stripe Radar, email verification |

---

## 15. Support & Documentation

### 15.1 Documentation Requirements
- **Getting Started**: 5-minute quickstart
- **Video Tutorials**: Issue creation, Claude Code workflow
- **API Reference**: OpenAPI spec
- **Troubleshooting**: Common issues FAQ
- **Best Practices**: Effective issue writing

### 15.2 Support Channels
- **In-app**: Help widget with common actions
- **Email**: support@daygent.ai
- **Discord**: Community support channel
- **GitHub Issues**: Public bug tracking

---

## 16. Appendices

### A. GitHub API Integration Details

#### Required GitHub API Endpoints
graphql
# GraphQL queries needed
query GetRepository($owner: String!, $name: String!) {
repository(owner: $owner, name: $name) {
id
issues(first: 100, states: [OPEN, CLOSED]) {
nodes {
number
title
body
state
author { login }
labels { nodes { name } }
assignees { nodes { login } }
}
}
}
}

mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String!) {
createIssue(input: {
repositoryId: $repositoryId,
title: $title,
body: $body
}) {
issue {
id
number
url
}
}
}


### B. Claude Code Integration Format

#### Recommended Issue Format for Claude Code
markdown
## Task
[Concise task description]

## Context
[Any relevant background or constraints]

## Acceptance Criteria
[ ] Specific, measurable outcome 1
[ ] Specific, measurable outcome 2
[ ] Edge case handling

## Technical Details
- Framework/library versions
- API endpoints to integrate
- Database schema changes needed

## Testing Requirements
- Unit tests for [components]
- E2E test for [user flow]
- Performance: [metric] < [threshold]

## Code Examples
\typescript
// Any helpful code snippets or interfaces
\

## References
- [Relevant documentation links]
- [Related issues or PRs]


### C. Keyboard Shortcuts Reference

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+K` | Open command palette | Global |
| `Cmd+I` | Create new issue | Global |
| `Cmd+/` | Search issues | Global |
| `J` | Next item | Lists |
| `K` | Previous item | Lists |
| `Enter` | Open item | Lists |
| `Space` | Preview | Issues |
| `E` | Edit | Issue view |
| `C` | Comment | Issue view |
| `Cmd+Enter` | Save | Forms |
| `Esc` | Cancel/Close | Modals |

---
