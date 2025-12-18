# WhoseHouse App - Changelog

## [2024-11-12] - RLS Infinite Recursion Fix

### 🐛 Bug Fixed
**Issue:** App stuck on loading screen with spinning cog indefinitely.

**Root Cause:** 
1. Row-Level Security (RLS) helper functions (`user_role()`, `is_social_worker()`, etc.) were querying the `profiles` table
2. These queries triggered RLS policies
3. RLS policies called the same helper functions
4. This created an infinite recursion loop
5. Additionally, `AuthContext` wasn't setting `isLoading = false` when no user session existed

### ✅ Solution Applied

#### Database Changes
Applied migration `011_fix_rls_and_schema.sql` which:
- Recreated all RLS helper functions with `SET row_security = off`
- This allows the functions to query `profiles` without triggering RLS policies
- Breaking the infinite recursion loop

**Functions Fixed:**
- `public.user_role()`
- `public.is_social_worker()`
- `public.is_foster_carer()`
- `public.is_admin()`
- `public.user_organization()`

#### Code Changes
**File:** `src/contexts/AuthContext.tsx`
- Fixed loading state bug: Now sets `isLoading = false` when no session exists
- Re-enabled `getUserPermissions()` call (was temporarily disabled)
- Cleaned up temporary comments
- Added better logging for debugging

### 🧹 Cleanup Performed

**Deleted Files:**
- `APPLY_THIS_FIX.sql` - Temporary fix file (already applied)
- `emergency_rls_fix.sql` - Old emergency fix attempt
- `disable_rls_emergency.sql` - Old emergency fix attempt  
- `temp_query.sql` - Temporary query file
- `RLS_PROBLEM_ANALYSIS.md` - Debugging documentation

**Code Cleanup:**
- Removed "TEMPORARY" comments from AuthContext
- Re-enabled permissions loading
- Improved console logging

### 📊 Current State

**Database Migrations:** All 11 migrations applied successfully
- ✅ 001: Initial schema
- ✅ 002: Row-level security (with recursion - fixed by 011)
- ✅ 003: Auth functions
- ✅ 004: Fix user registration
- ✅ 005: Messaging system
- ✅ 006: Admin management
- ✅ 007: Secure media storage
- ✅ 008: GDPR compliance
- ✅ 009: Typing indicators
- ✅ 010: Fix messaging audit
- ✅ 011: Fix RLS recursion ← **This one fixed the issue**

**App Status:** ✅ Working
- Login screen loads correctly
- Dashboard accessible for all roles
- No RLS errors
- No infinite loading states

### 🔍 Verification

To verify the fix is working:
```sql
-- Run in Supabase SQL Editor
SELECT 
  proname as function_name,
  proconfig as config
FROM pg_proc
WHERE proname IN ('user_role', 'is_social_worker', 'is_foster_carer', 'is_admin', 'user_organization')
AND pronamespace = 'public'::regnamespace;
```

Expected result: All functions should have `{row_security=off}` in config.

### 📝 Lessons Learned

1. **RLS Recursion is Subtle:** Helper functions that query tables with RLS policies must use `SET row_security = off`
2. **Loading States Matter:** Always ensure loading states are set to `false` in all code paths, including early returns
3. **Migration Tracking:** Keep track of which migrations have been applied to production
4. **Systematic Debugging:** When stuck, step back and map out the complete problem chain before applying fixes

### 🚀 Next Steps

- Monitor app for any remaining RLS issues
- Consider adding migration tracking to the database
- Add automated tests for RLS policies
- Document the RLS pattern for future developers
