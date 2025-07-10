# Seed Data Documentation

This document describes the test data available in `seed.sql`.

## Test Users

| Email               | Name          | Role in Acme Corp | Role in StartupXYZ | GitHub Username |
| ------------------- | ------------- | ----------------- | ------------------ | --------------- |
| alice@example.com   | Alice Johnson | Owner             | Member             | alicejohnson    |
| bob@example.com     | Bob Smith     | Admin             | -                  | bobsmith        |
| charlie@example.com | Charlie Brown | Member            | -                  | charliebrown    |
| diana@example.com   | Diana Prince  | -                 | Owner              | dianaprince     |

## Test Organizations

| Name       | Slug       | Status | Description                              |
| ---------- | ---------- | ------ | ---------------------------------------- |
| Acme Corp  | acme-corp  | Active | Established company with 3 members       |
| StartupXYZ | startupxyz | Trial  | New startup with 2 members, 14-day trial |

## Test Projects

### Acme Corp Projects

- **Q1 Features** (Frontend repo) - New features for Q1 2025
- **Bug Fixes** (Frontend repo) - Critical bug fixes
- **API v2** (Backend repo) - Major API rewrite

### StartupXYZ Projects

- **MVP Launch** (Mobile app repo) - Initial MVP features

## Test Issues

### Open Issues

- **Implement dark mode** (#101) - High priority, assigned to Charlie
- **Setup push notifications** (#301) - Medium priority, unassigned

### In Progress

- **Add search functionality** (#102) - High priority, assigned to Bob

### In Review

- **Fix login redirect loop** (#103) - Urgent priority, assigned to Bob

### Completed

- **Design GraphQL schema** (#201) - Completed by Alice

## Using the Seed Data

1. **Local Development**:

   ```bash
   npx supabase db reset
   ```

   This will apply migrations and seed data.

2. **Manual Seeding**:

   ```bash
   psql $DATABASE_URL < supabase/seed.sql
   ```

3. **Testing Authentication**:
   - Use the test user emails with magic link authentication
   - GitHub usernames are available for OAuth testing

## Notes

- All timestamps are relative to the current time
- Trial organization expires in 14 days
- Completed issues have completion dates set to 2 days ago
- AI usage records demonstrate different model usage patterns
