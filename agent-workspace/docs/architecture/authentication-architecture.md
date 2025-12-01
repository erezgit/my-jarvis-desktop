# Authentication System Architecture

## Project Overview

This document outlines the authentication architecture for the My Jarvis ecosystem, connecting My Jarvis Web (marketing site) with My Jarvis Desktop instances through secure JWT token exchange.

---

## Database Configuration

### Supabase Project: "My Jarvis Web"

**Project URL**: `https://ocvkyhlfdjrvvipljbsa.supabase.co`

**API Keys**:
- **Public Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdmt5aGxmZGpydnZpcGxqYnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTU5MjksImV4cCI6MjA3ODQ3MTkyOX0.Lm3MaulYKHYl_XHBgF5ixA_aMZl3J2GlzmKTAuDxVVo`
- **Service Role Key**: `sbp_4b23d38fb597138830f7cfa14c0e6f5fe95d12a6`

**Connection Example**:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ocvkyhlfdjrvvipljbsa.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Architecture Components

### 1. My Jarvis Web (Authentication Hub)
- **Role**: Primary authentication service
- **Database Connection**: Direct Supabase integration
- **Responsibilities**:
  - User credential validation
  - JWT token generation
  - Waiting list management
  - User account creation

### 2. My Jarvis Desktop Instances (Authentication Consumers)
- **Role**: Token validation and session management
- **Database Connection**: None (stateless)
- **Responsibilities**:
  - JWT token validation
  - Local session creation
  - Authentication middleware

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant WebApp as My Jarvis Web
    participant Database as Supabase
    participant Desktop as My Jarvis Desktop

    User->>WebApp: Login (username/password)
    WebApp->>Database: Validate credentials
    Database-->>WebApp: User validated
    WebApp->>WebApp: Generate JWT token
    WebApp->>Desktop: Redirect with JWT
    Desktop->>Desktop: Validate JWT (no DB call)
    Desktop-->>User: Authenticated session
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    instance_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Waiting List Table
```sql
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Configuration

### JWT Token Structure
```json
{
  "username": "erez",
  "instance_url": "https://my-jarvis-erez.fly.dev",
  "iat": 1762895929,
  "exp": 1762895989
}
```

### Environment Variables

**My Jarvis Web (.env.local)**:
```env
SUPABASE_URL=https://ocvkyhlfdjrvvipljbsa.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdmt5aGxmZGpydnZpcGxqYnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTU5MjksImV4cCI6MjA3ODQ3MTkyOX0.Lm3MaulYKHYl_XHBgF5ixA_aMZl3J2GlzmKTAuDxVVo
SUPABASE_SERVICE_KEY=sbp_4b23d38fb597138830f7cfa14c0e6f5fe95d12a6
JWT_SECRET=[To be generated]
```

**My Jarvis Desktop (Fly.io secrets)**:
```bash
fly secrets set JWT_SECRET=[shared secret] --app my-jarvis-erez
```

---

## Technology Stack

### My Jarvis Web
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT implementation
- **UI**: Launch UI + Shadcn/ui + Tailwind CSS v4
- **TypeScript**: Full type safety

### My Jarvis Desktop
- **Framework**: Existing React application
- **Authentication**: JWT validation middleware
- **Session**: Express sessions
- **Deployment**: Fly.io containers

---

## Security Measures

### Implemented
- **JWT with short expiration** (60 seconds)
- **HTTPS-only communication**
- **Secure cookie configuration**
- **Password hashing** (Argon2id recommended)
- **Environment variable protection**

### To Be Implemented
- **CSRF protection** (`@edge-csrf/nextjs`)
- **Rate limiting** (`express-rate-limit`)
- **Input validation** (Zod schemas)
- **Redirect allowlist** (open redirect prevention)

---

## Deployment Configuration

### Supabase Setup
- [x] Project created: "My Jarvis Web"
- [ ] Database tables created
- [ ] Row Level Security (RLS) configured
- [ ] Service role key generated
- [ ] Initial user accounts seeded

### My Jarvis Web Deployment
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Authentication flows implemented
- [ ] Security measures activated

### My Jarvis Desktop Updates
- [ ] JWT validation middleware added
- [ ] Fly.io secrets configured
- [ ] Authentication integration tested
- [ ] Production deployment completed

---

## Initial User Accounts

The following accounts will be created during Phase 1:

| Username | Email | Instance URL |
|----------|--------|-------------|
| erez | [to be provided] | https://my-jarvis-erez.fly.dev |
| lilah | [to be provided] | https://my-jarvis-lilah.fly.dev |
| daniel | [to be provided] | https://my-jarvis-daniel.fly.dev |
| iddo | [to be provided] | https://my-jarvis-iddo.fly.dev |
| elad | [to be provided] | https://my-jarvis-elad.fly.dev |
| yaron | [to be provided] | https://my-jarvis-yaron.fly.dev |

---

## Next Steps

1. **Test Supabase MCP connection**
2. **Create database tables**
3. **Configure Row Level Security**
4. **Generate JWT secret**
5. **Begin Phase 1 implementation**

---

*Document created: 2025-11-11*
*Last updated: 2025-11-11*