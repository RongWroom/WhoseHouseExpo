# Supabase Setup Instructions

## Overview

The Whose House app uses Supabase for authentication, database, and real-time features. This directory contains the SQL migrations needed to set up the database schema with proper security policies.

## Prerequisites

1. Create a Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Get your project URL and anon key from the project settings

## Environment Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Update the values with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Database Setup

### Running Migrations

The Supabase Migrations

This directory contains SQL migrations for the Whose House application database.

## Migrations

### 001_initial_schema.sql

Creates the core database schema:

- Organizations table
- Profiles table (extends auth.users)
- Cases table (anonymized child records)
- Child access tokens table
- Messages table
- Case media table
- Audit logs table (immutable)

### 002_row_level_security.sql

Implements Row-Level Security (RLS) policies:

- Role-based access control
- Foster carers can only see their active case
- Social workers can see their assigned cases
- Admins have full access
- Child access via token validation

### 003_auth_functions.sql

Authentication and helper functions:

- User registration with automatic profile creation
- Child token generation and validation
- Secure messaging for children
- Case assignment functions
- Audit logging functions

### 004_fix_user_registration.sql ⚠️ **REQUIRED UPDATE**

Fixes user registration to make organization_id optional:

- Removes hardcoded default organization requirement
- Allows users to sign up without an organization
- Organization can be assigned later by an admin
- **Run this migration if you're getting "Database error saving new user"**

## Running Migrations

### Local Development (Supabase CLI)

```bash
supabase db reset
```

### Production (Supabase Dashboard)

1. Go to SQL Editor in your Supabase dashboard
2. Run each migration file in order (001, 002, 003, 004)
3. Verify no errors in the output

## Important Notes

- Migrations must be run in order
- Do not modify existing migrations after they've been applied
- Create new migration files for schema changes
- Test migrations locally before applying to production

## Troubleshooting

### "Database error saving new user"

Run migration `004_fix_user_registration.sql` to fix the user registration trigger.

### Common Issues

1. **RLS policies blocking access**
   - Check that the user's role is set correctly in profiles
   - Verify the RLS policies match your use case

2. **Functions not working**
   - Ensure all functions have proper GRANT EXECUTE permissions
   - Check that SECURITY DEFINER is set where needed

3. **Token validation failing**
   - Verify token hasn't expired
   - Check that the case is still active
   - Ensure the token hasn't been revoked

### Debug Queries

Check user role:

```sql
SELECT * FROM profiles WHERE email = 'user@example.com';
```

View audit logs (as admin):

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

Check active tokens:

```sql
SELECT * FROM child_access_tokens
WHERE status = 'active'
AND expires_at > NOW();
```

## Enable Email Auth

1. Go to Authentication → Providers
2. Ensure Email provider is enabled
3. Configure email templates if needed

### Storage Buckets (Optional)

If you plan to use file storage for case media:

1. Go to Storage
2. Create a new bucket called `case-media`
3. Set appropriate policies for the bucket

## Security Considerations

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access data based on their role
- Foster carers can only see their active case
- Children access is token-based with no persistent auth

### Audit Logging

- All critical actions are logged
- Audit logs are immutable (cannot be updated or deleted)
- Only admins can view audit logs

### Child Access Tokens

- Single-use tokens with expiration
- No persistent authentication for children
- Tokens are hashed in the database
- Device info is logged when tokens are used

## Testing the Setup

### Create Test Users

You can create test users with different roles:

```sql
-- This will trigger the profile creation automatically
-- Use the Supabase Auth UI or API to create users with metadata:
-- { "full_name": "Test Social Worker", "role": "social_worker" }
```

### Verify Permissions

Test that:

1. Social workers can create cases and generate child tokens
2. Foster carers can only see their assigned case
3. Messages follow the allowed communication paths
4. Audit logs are being created for actions

## Troubleshooting

### Common Issues

1. **RLS policies blocking access**
   - Check that the user's role is set correctly in profiles
   - Verify the RLS policies match your use case

2. **Functions not working**
   - Ensure all functions have proper GRANT EXECUTE permissions
   - Check that SECURITY DEFINER is set where needed

3. **Token validation failing**
   - Verify token hasn't expired
   - Check that the case is still active
   - Ensure the token hasn't been revoked

### Debug Queries

Check user role:

```sql
SELECT * FROM profiles WHERE email = 'user@example.com';
```

View audit logs (as admin):

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

Check active tokens:

```sql
SELECT * FROM child_access_tokens
WHERE status = 'active'
AND expires_at > NOW();
```

## Next Steps

After setting up the database:

1. Configure the Supabase client in the app
2. Implement authentication flows
3. Set up real-time subscriptions
4. Test the messaging system
5. Implement the child access flow
