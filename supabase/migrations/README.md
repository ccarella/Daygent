# Database Migrations

This directory contains SQL migrations for the Daygent database schema.

## Migration Files

- `20250110000000_initial_schema.sql` - Initial database schema with all tables, indexes, and RLS policies
- `20250110000000_initial_schema_rollback.sql` - Rollback script for the initial schema

## Running Migrations

### Local Development

1. Start Supabase locally:

   ```bash
   npx supabase start
   ```

2. Run migrations:
   ```bash
   npx supabase db push
   ```

### Production

Migrations are automatically applied when pushed to the main branch via the Supabase dashboard.

## Creating New Migrations

1. Create a new migration file:

   ```bash
   npx supabase migration new <migration_name>
   ```

2. Write your SQL changes in the generated file

3. Test locally:
   ```bash
   npx supabase db reset
   ```

## Migration Naming Convention

- Format: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Use snake_case for the descriptive name
- Keep names concise but descriptive

## Best Practices

1. Always include a rollback script for complex migrations
2. Test migrations locally before deploying
3. Use transactions for data migrations
4. Document any manual steps required
5. Use enum types for constrained values
6. Add indexes for frequently queried columns
7. Always enable RLS on new tables
