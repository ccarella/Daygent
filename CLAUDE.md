# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daygent is a project management platform specifically designed for developers using Claude Code as their primary development tool. The vision is to bridge project planning and AI-driven development by creating Claude Code-optimized issue descriptions and maintaining synchronization with GitHub.

## Development Commands

### Running the Application

```bash
npm run dev          # Start development server with Turbopack on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run test:e2e     # Run Playwright E2E tests
```

### Code Quality

```bash
npm run lint         # Run ESLint with Next.js rules
npm run format       # Format code with Prettier
npx tsc --noEmit     # Check TypeScript types
```

### Testing

```bash
npm test             # Run tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with Vitest UI
```

### Pre-commit Hooks

The project uses Husky and lint-staged to ensure code quality. Commits must follow Conventional Commits format:

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`, `build`
- Example: `feat: add user authentication`

## Architecture

### Tech Stack

- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **State Management**: Zustand stores for auth and command palette
- **Backend**: Supabase (PostgreSQL, Auth, Realtime) - IMPLEMENTED
- **Authentication**: Supabase Auth with GitHub and Google OAuth - IMPLEMENTED
- **Testing**: Vitest with React Testing Library, jsdom, Playwright for E2E
- **Integrations**: Anthropic API, GitHub API v4 (GraphQL), Stripe (planned)

### Project Structure

- `/src/app/` - Next.js App Router pages and layouts
  - `/(auth)/` - Authentication pages (login)
  - `/(dashboard)/` - Protected dashboard pages (issues, projects, activity, settings)
  - `/api/` - API routes (auth callback, webhooks, supabase health)
- `/src/components/` - React components
  - `/ui/` - shadcn/ui components (30+ components implemented)
  - `/layout/` - Layout components (Header, Sidebar, DashboardLayout, etc.)
- `/src/lib/` - Utility functions and configurations
  - `/supabase/` - Supabase client, server, and auth utilities
- `/src/hooks/` - Custom React hooks
- `/src/stores/` - Zustand stores
- `/src/middleware.ts` - Next.js middleware for protected routes
- `/supabase/` - Database migrations and configuration

### Key Configuration Files

- `tsconfig.json` - TypeScript with strict mode enabled
- `vitest.config.ts` - Test configuration with jsdom environment
- `components.json` - shadcn/ui component configuration
- `supabase/config.toml` - Local Supabase configuration
- `PRD.md` - Comprehensive Product Requirements Document with full specifications
- `.commitlintrc.js` - Conventional commits configuration

## Implementation Status

### Completed Features

- ✅ Authentication system with Supabase Auth
- ✅ GitHub and Google OAuth integration
- ✅ Protected route middleware
- ✅ Database schema with comprehensive migrations
- ✅ Row Level Security (RLS) policies
- ✅ Command palette (Cmd+K) with keyboard navigation
- ✅ Dashboard layout with sidebar navigation
- ✅ Mobile-responsive navigation
- ✅ User menu with logout functionality
- ✅ Activity feed page structure
- ✅ Issues and projects page structure
- ✅ Settings page with sections
- ✅ Comprehensive shadcn/ui component library
- ✅ Auth state management with Zustand
- ✅ Test infrastructure with coverage setup

### In Progress

- 🔄 GitHub repository connection
- 🔄 Issue creation and management
- 🔄 AI-powered issue expansion

### Recently Completed

- ✅ GitHub webhook integration
- ✅ GitHub issue sync functionality
- ✅ Bulk issue import with pagination
- ✅ Sync status tracking

### Not Started

- ❌ Kanban board for issues
- ❌ Stripe subscription management
- ❌ AI usage tracking
- ❌ Real-time updates with Supabase Realtime

## Development Guidelines

### Component Development

When creating new components:

1. Use shadcn/ui patterns for consistency
2. Follow the existing structure in `/src/components/ui/`
3. Ensure components are keyboard-accessible
4. Use TypeScript strict mode types

### State Management

Zustand is implemented for state management. Current stores:

- `auth.store.ts` - Authentication state and user management
- `commandPalette.store.ts` - Command palette state

When creating new stores:

- Create stores in `/src/stores/`
- Use TypeScript interfaces for store shapes
- Follow existing patterns for actions and selectors

### API Integration

When implementing API routes:

- Use Next.js App Router API routes in `/src/app/api/`
- Follow RESTful conventions
- Implement proper error handling
- Add TypeScript types for all API responses

### Database Operations

**IMPORTANT**: All database operations should use the Supabase MCP server for consistency and proper handling.

The database schema is fully implemented with migrations. Key tables:

- workspaces (simplified from organizations)
- users (with GitHub/Google OAuth)
- workspace_members (simplified membership)
- repositories (GitHub connections)
- projects (repository groupings)
- issues (with AI-expanded content)
- issue_comments
- activities (audit trail)
- ai_usage (token tracking)

All tables have Row Level Security (RLS) policies enabled.

**Database Functions:**

- `create_workspace_with_member` - The correct function used by the application to create workspaces
- `create_workspace_with_owner` - Legacy function from earlier migration, kept for backward compatibility
- Both functions exist in the database, but the application uses `create_workspace_with_member`

### Testing Strategy

- Unit tests for utilities and hooks (Vitest)
- Component tests for UI components (React Testing Library)
- Integration tests for API routes
- E2E tests for critical user flows (Playwright)
- Test coverage goals: 80% minimum

## Environment Variables

Required environment variables for local development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GitHub App (required for issue sync and webhooks)
GITHUB_APP_ID=your_app_id
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
GITHUB_APP_PRIVATE_KEY=your_base64_encoded_private_key
GITHUB_APP_NAME=your_app_name

# OAuth (configure in Supabase dashboard)
# GitHub and Google OAuth settings are in supabase/config.toml
```

**Production Deployment (Vercel):**

- All three Supabase environment variables above are **required** in production
- The `SUPABASE_SERVICE_ROLE_KEY` is critical for organization creation and administrative operations
- Without it, users will get 500 errors when trying to create organizations
- GitHub App environment variables are required for:
  - Issue synchronization functionality
  - Webhook processing
  - GitHub App installations
- The `GITHUB_APP_PRIVATE_KEY` should be base64 encoded for storage
- See [VERCEL_ENV_FIX.md](./VERCEL_ENV_FIX.md) for troubleshooting deployment issues

## Development Workflow

1. **Start Supabase locally**: `npx supabase start`
2. **Run migrations**: Check `/supabase/migrations/` for latest schema
3. **Start dev server**: `npm run dev`
4. **Run tests before committing**: Tests will auto-run via pre-commit hooks

## Common Issues and Solutions

### Authentication Timeout

- Fixed by using `maybeSingle()` instead of `single()` for profile queries
- Emergency bypass implemented for hanging profile queries

### RLS Policy Errors

- Ensure user profiles are created automatically via database trigger
- Check migrations for proper policy setup

### GitHub OAuth Setup

- Configure OAuth app in GitHub settings
- Update redirect URLs in Supabase dashboard
- Set proper scopes: `repo`, `read:user`, `user:email`
