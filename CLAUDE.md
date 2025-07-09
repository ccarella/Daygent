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
```

### Code Quality
```bash
npm run lint         # Run ESLint with Next.js rules
```

### Testing
```bash
npm test             # Run tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with Vitest UI
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Testing**: Vitest with React Testing Library and jsdom
- **Planned Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Planned Integrations**: Anthropic API, GitHub API v4 (GraphQL), Stripe

### Project Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - React components
  - `/ui/` - shadcn/ui components (currently button.tsx)
- `/src/lib/` - Utility functions
- `/src/test/` - Test configuration and setup

### Key Configuration Files
- `tsconfig.json` - TypeScript with strict mode enabled
- `vitest.config.ts` - Test configuration with jsdom environment
- `components.json` - shadcn/ui component configuration
- `PRD.md` - Comprehensive Product Requirements Document with full specifications

## Implementation Status

The project is currently a fresh Next.js installation with:
- Basic shadcn/ui setup (button component only)
- Testing infrastructure configured but no tests written
- Comprehensive PRD documenting all planned features
- No Daygent-specific features implemented yet

## Development Guidelines

### Component Development
When creating new components:
1. Use shadcn/ui patterns for consistency
2. Follow the existing structure in `/src/components/ui/`
3. Ensure components are keyboard-accessible
4. Use TypeScript strict mode types

### State Management
The PRD specifies Zustand for state management (not yet implemented). When implementing:
- Create stores in `/src/stores/`
- Use TypeScript interfaces for store shapes
- Follow Zustand best practices for actions and selectors

### API Integration
When implementing API routes:
- Use Next.js App Router API routes in `/src/app/api/`
- Follow RESTful conventions
- Implement proper error handling
- Add TypeScript types for all API responses

### Database Schema
The PRD includes a complete PostgreSQL schema for Supabase. Key tables include:
- organizations (workspaces)
- users (with GitHub/Google OAuth)
- projects (GitHub repo connections)
- issues (with AI-expanded content)
- Full schema available in PRD.md

### Testing Strategy
- Unit tests for utilities and hooks
- Component tests for UI components
- Integration tests for API routes
- E2E tests for critical user flows