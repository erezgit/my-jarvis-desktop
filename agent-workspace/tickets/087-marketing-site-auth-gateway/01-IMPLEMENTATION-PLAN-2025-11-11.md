# Authentication System Implementation Plan

## Overview
End-to-end authentication system connecting My Jarvis Web (marketing site) with My Jarvis Desktop instances through secure JWT token exchange.

## Project Structure
- **My Jarvis Web**: `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-web/`
- **My Jarvis Desktop**: `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/`

---

## Phase 1: Database & User Management Setup

### My Jarvis Web Project
- [ ] Set up Supabase database connection
- [ ] Create `users` table schema
  ```sql
  users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    instance_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
  )
  ```
- [ ] Create `waitlist` table schema
  ```sql
  waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
  ```
- [ ] Seed initial user accounts for existing users (erez, lilah, daniel, iddo, elad, yaron)

---

## Phase 2: My Jarvis Web Authentication Pages

### Landing & Authentication Pages
- [ ] Create login page (`/login`)
- [ ] Create waiting list signup page (`/waitlist`)
- [ ] Update homepage with authentication CTAs
- [ ] Add user feedback/status messages

### Backend API Routes
- [ ] Create `/api/auth/login` endpoint
  - Validate credentials against database
  - Generate JWT token (60-second expiration)
  - Return redirect URL with token
- [ ] Create `/api/waitlist` endpoint
  - Store email in waitlist table
  - Send confirmation response
- [ ] Add JWT token generation utilities

---

## Phase 3: My Jarvis Desktop Authentication Middleware

### Authentication Infrastructure
- [ ] Create JWT validation middleware (`lib/claude-webui-server/middleware/auth.js`)
  - Validate JWT tokens from query params or headers
  - Create user sessions on successful validation
  - Redirect to marketing site on authentication failure
- [ ] Add session management configuration
- [ ] Add environment variable for JWT secret (`JWT_SECRET`)

### Server Integration
- [ ] Apply authentication middleware to all routes in `lib/claude-webui-server/server.js`
- [ ] Add graceful error handling for auth failures
- [ ] Ensure existing functionality remains unchanged

---

## Phase 4: Deployment & Configuration

### Environment Setup
- [ ] Add `JWT_SECRET` environment variable to all Fly.io instances
- [ ] Update package.json dependencies (jsonwebtoken, express-session)
- [ ] Deploy authentication middleware to test instance (my-jarvis-erez)

### Production Rollout
- [ ] Test complete authentication flow on my-jarvis-erez
- [ ] Deploy to remaining instances:
  - [ ] my-jarvis-lilah
  - [ ] my-jarvis-daniel
  - [ ] my-jarvis-iddo
  - [ ] my-jarvis-elad
  - [ ] my-jarvis-yaron

---

## Phase 5: Testing & Validation

### End-to-End Testing
- [ ] **Unauthenticated Access Test**: Direct instance access redirects to login
- [ ] **Authentication Flow Test**: Login → JWT generation → Instance redirect → Session creation
- [ ] **Session Persistence Test**: User remains authenticated across page refreshes
- [ ] **Token Expiration Test**: Expired tokens properly redirect to login
- [ ] **Waitlist Test**: Email collection and storage working

### User Acceptance Testing
- [ ] Create test accounts for existing users
- [ ] Send credentials to users for testing
- [ ] Validate user experience feedback
- [ ] Address any UX issues discovered

---

## Technical Implementation Details

### JWT Token Structure
```javascript
{
  username: "erez",
  instance_url: "https://my-jarvis-erez.fly.dev",
  iat: timestamp,
  exp: timestamp + 60 // 60-second expiration
}
```

### Authentication Flow Sequence
1. User visits `https://myjarvis.com/login`
2. Submits username/password
3. Server validates credentials against database
4. Server generates JWT with user info and instance URL
5. Server responds with redirect: `https://my-jarvis-erez.fly.dev?token=JWT_HERE`
6. My Jarvis Desktop middleware validates JWT
7. Creates user session and proceeds to application

### File Structure Changes

#### My Jarvis Web (New Files)
```
src/
  app/
    login/
      page.tsx
    waitlist/
      page.tsx
    api/
      auth/
        login/
          route.ts
      waitlist/
        route.ts
  lib/
    auth.ts
    database.ts
```

#### My Jarvis Desktop (New Files)
```
lib/
  claude-webui-server/
    middleware/
      auth.js
```

---

## Risk Mitigation

### Rollback Plan
- [ ] Document current working state before changes
- [ ] Maintain ability to disable authentication middleware quickly
- [ ] Keep original instance access available via admin override

### Security Considerations
- [ ] JWT secret management across instances
- [ ] HTTPS enforcement for token transmission
- [ ] Session security and timeout handling
- [ ] Password hashing best practices

### Performance Impact
- [ ] Minimal latency impact from authentication checks
- [ ] No impact on existing My Jarvis Desktop functionality
- [ ] Efficient JWT validation implementation

---

## Success Criteria

### Functional Requirements
- [ ] Existing users can login with provided credentials
- [ ] New users can join waitlist successfully
- [ ] Unauthenticated users cannot access instances
- [ ] Authenticated users have seamless experience
- [ ] All existing My Jarvis Desktop features work normally

### Non-Functional Requirements
- [ ] Authentication adds <100ms latency
- [ ] Zero downtime deployment possible
- [ ] User experience feels professional and polished
- [ ] System handles concurrent users efficiently

---

## Timeline Estimate

- **Phase 1**: 2-3 hours (Database setup)
- **Phase 2**: 4-5 hours (Web frontend/backend)
- **Phase 3**: 2-3 hours (Desktop middleware)
- **Phase 4**: 2-3 hours (Deployment)
- **Phase 5**: 2-3 hours (Testing)

**Total**: 12-17 hours implementation time

---

## Notes

- This is a **minimal viable authentication system** focusing on core functionality
- Future enhancements can include automated provisioning, admin dashboards, and advanced user management
- The system follows enterprise B2B patterns appropriate for a curated service
- Implementation maintains backward compatibility and allows for easy rollback if needed