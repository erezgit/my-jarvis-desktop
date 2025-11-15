# Ticket #088: Authentication Integration Troubleshooting Guide

**Date Created:** 2025-11-14
**Status:** RESOLVED
**Priority:** HIGH
**Category:** Authentication, Database, Troubleshooting

## 🎯 Problem Summary

When integrating authentication for existing Jarvis instances, manual database record creation causes authentication failures with "Invalid email or password" errors and 500 server responses, even when credentials are correct.

## 🔍 Root Cause Analysis

### Issue: Manual Auth Record Creation
- **Problem**: Manually inserting records into `auth.users` table bypasses Supabase's authentication constraints
- **Symptoms**:
  - Login returns "Database error querying schema"
  - Web app shows 500 server error
  - Direct Supabase Auth API fails
  - Password validation works in database but authentication fails

### Missing Components in Manual Creation
1. **Identity Records**: Not created in `auth.identities` table
2. **Provider Metadata**: Missing proper `app_metadata` with provider information
3. **Authentication Constraints**: Supabase internal validation fails
4. **Email Verification Flow**: Bypassed proper verification process

## 📋 Step-by-Step Resolution Process

### 1. Identify Authentication Failure
```bash
# Test direct Supabase Auth API
curl -X POST 'https://PROJECT_URL.supabase.co/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -d '{"email":"user@domain.com","password":"password"}'

# Working response: Returns access_token
# Broken response: {"code":500,"error_code":"unexpected_failure","msg":"Database error querying schema"}
```

### 2. Compare Working vs Broken Records
```sql
-- Check auth.users structure
SELECT id, email, encrypted_password,
       LENGTH(encrypted_password) as pass_length,
       email_confirmed_at, instance_id,
       raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE email IN ('working_user@domain.com', 'broken_user@domain.com');

-- Check for identity records
SELECT * FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'broken_user@domain.com');
```

### 3. Delete Broken Authentication Record
```sql
-- Remove broken auth record
DELETE FROM auth.users WHERE email = 'broken_user@domain.com';

-- Update user_instances to unlink
UPDATE user_instances SET user_id = NULL WHERE fly_app_name = 'app-name';
```

### 4. Recreate Using Supabase Auth API
```bash
# Use proper signup flow
curl -X POST 'https://PROJECT_URL.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -d '{
    "email": "user@domain.com",
    "password": "password",
    "data": {
      "name": "User Name"
    }
  }'
```

### 5. Relink Database Records
```sql
-- Get new user ID from signup response
-- Update user_instances table
UPDATE user_instances
SET user_id = 'NEW_USER_ID_FROM_SIGNUP'
WHERE fly_app_name = 'app-name';

-- Recreate user_instances if deleted
INSERT INTO user_instances (
  user_id, waiting_list_id, fly_app_name,
  fly_app_url, status, created_at, provisioned_at
) VALUES (
  'NEW_USER_ID',
  'WAITING_LIST_ID',
  'app-name',
  'app-name.fly.dev',
  'ready',
  now(),
  now()
);
```

## ✅ Verification Steps

### 1. Test Supabase Auth API
```bash
curl -X POST 'https://PROJECT_URL.supabase.co/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -d '{"email":"user@domain.com","password":"password"}'

# Should return: access_token, user object, no errors
```

### 2. Test Web App Login
- Visit: `https://my-jarvis-web.vercel.app/login`
- Enter credentials
- Should redirect successfully to authenticated Jarvis instance

### 3. Verify Database Links
```sql
-- Confirm all relationships are correct
SELECT ui.*, wl.email, wl.name, au.email as auth_email
FROM user_instances ui
JOIN waiting_list wl ON ui.waiting_list_id = wl.id
JOIN auth.users au ON ui.user_id = au.id
WHERE wl.email = 'user@domain.com';
```

## 🚨 Prevention Guidelines

### NEVER: Manual Auth Record Creation
❌ **Don't use**: Direct SQL INSERT into `auth.users`
❌ **Don't use**: Manual password hashing
❌ **Don't use**: Bypassing Supabase Auth flows

### ALWAYS: Proper Authentication Setup
✅ **Use**: Supabase Auth signup API
✅ **Use**: Proper provider metadata
✅ **Use**: Built-in password hashing
✅ **Verify**: Identity records are created

## 📚 Key Technical Details

### Database Schema Requirements
- `auth.users`: Main authentication record
- `auth.identities`: Provider-specific identity data
- `user_instances`: Application-specific user data
- `waiting_list`: User registration tracking

### Required Metadata Structure
```json
{
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "email": "user@domain.com",
    "email_verified": true,
    "name": "User Name",
    "phone_verified": false,
    "sub": "user-id"
  }
}
```

## 🔧 Quick Fix Command
```bash
# One-liner to recreate user authentication
curl -X POST 'https://ocvkyhlfdjrvvipljbsa.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdmt5aGxmZGpydnZpcGxqYnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTU5MjksImV4cCI6MjA3ODQ3MTkyOX0.Lm3MaulYKHYl_XHBgF5ixA_aMZl3J2GlzmKTAuDxVVo' \
  -d '{"email":"EMAIL","password":"PASSWORD","data":{"name":"NAME"}}'
```

## 📖 Related Files
- `/agent-workspace/docs/authentication-architecture.md`
- `/agent-workspace/docs/users.md`
- `/agent-workspace/docs/deployment.md`

## ✅ Resolution Confirmation
- **User Authentication**: Working via Supabase Auth API
- **Web App Login**: Successful redirect flow
- **Database Integrity**: All relationships properly linked
- **Documentation**: Updated user credentials

---

**Lesson Learned**: Always use Supabase's native authentication APIs rather than manual database manipulation for user account creation.