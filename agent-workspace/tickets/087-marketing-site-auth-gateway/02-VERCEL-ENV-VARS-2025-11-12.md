# Vercel Environment Variables - My Jarvis Web Authentication

## Required Environment Variables for Vercel Deployment

Copy and paste these environment variables into your Vercel project settings:

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://ocvkyhlfdjrvvipljbsa.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdmt5aGxmZGpydnZpcGxqYnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTU5MjksImV4cCI6MjA3ODQ3MTkyOX0.Lm3MaulYKHYl_XHBgF5ixA_aMZl3J2GlzmKTAuDxVVo
```

### JWT Secret (Shared with Fly.io instances)

```
JWT_SECRET=dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=
```

## How to Add to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select Project**: my-jarvis-web
3. **Go to Settings** → **Environment Variables**
4. **Add each variable**:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://ocvkyhlfdjrvvipljbsa.supabase.co`
   - Environment: Production, Preview, Development
5. **Repeat for each variable above**
6. **Redeploy** the project

## Test Credentials

Once environment variables are set, test with:

- **Email**: `erez.test@gmail.com`
- **Password**: `Jar123vis`

## Expected Flow

1. **Visit**: https://my-jarvis-web.vercel.app/login
2. **Login**: With credentials above
3. **Redirect**: To https://my-jarvis-erez.fly.dev/ (authenticated)

---

**Status**: Environment variables needed for production deployment
**Created**: November 12, 2025
**Last Updated**: November 12, 2025