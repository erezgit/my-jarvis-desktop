# Ticket #091: URL Migration from my-jarvis-web.vercel.app to myjarvis.io

## Summary
Migrate the My Jarvis Web authentication gateway from `my-jarvis-web.vercel.app` to the new domain `https://www.myjarvis.io/`. This requires updating environment variables, Fly.io secrets, authentication middleware, and documentation across all components.

## Status
- **Priority**: HIGH (Infrastructure Change)
- **Status**: 🟡 **IN PROGRESS**
- **Assignee**: Erez (Manual Tasks) + Claude (Code Updates)
- **Created**: 2025-11-14

## Problem Statement
The My Jarvis Web authentication gateway is currently deployed at `my-jarvis-web.vercel.app` but needs to be accessible via the production domain `https://www.myjarvis.io/` for professional branding and user experience.

## Current State Analysis

### URLs Currently in Use
- **Marketing Site**: `my-jarvis-web.vercel.app` → should become `www.myjarvis.io`
- **Login URL**: `my-jarvis-web.vercel.app/login` → should become `www.myjarvis.io/login`
- **Authentication Flow**: Uses JWT tokens with 60-second expiration
- **Individual Instances**: `my-jarvis-{user}.fly.dev` (these remain unchanged)

### Components Affected
1. **My Jarvis Web** (Next.js app on Vercel)
2. **My Jarvis Desktop instances** (authentication middleware)
3. **Documentation files**
4. **Environment configurations**

## 🚨 MANUAL TASKS REQUIRED (Erez Action Items)

### 1. Vercel Deployment Configuration
**Action Required**: Update Vercel deployment settings

**Steps**:
1. Go to Vercel dashboard for `my-jarvis-web` project
2. Navigate to Settings → Domains
3. Add custom domain: `www.myjarvis.io`
4. Configure DNS records as instructed by Vercel
5. Update production environment variables if needed

**Files to Check After Domain Setup**:
- Verify SSL certificate is active
- Test `https://www.myjarvis.io` loads correctly
- Test `https://www.myjarvis.io/login` works

### 2. Fly.io Secrets Update (HIGH PRIORITY)
**Action Required**: Update LOGIN_URL secrets for all Fly.io instances

**Current LOGIN_URL values to update**:
- From: `https://my-jarvis-web.vercel.app/login`
- To: `https://www.myjarvis.io/login`

**Commands to Run** (for each instance):

**✅ WORKING INSTANCES (authentication already enabled)**:
```bash
# These 3 instances are already working and just need LOGIN_URL updated
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-erez
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-lilah
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-guy

# Verify secrets are updated (should show both JWT_SECRET and LOGIN_URL)
fly secrets list --app my-jarvis-erez
```

**🚧 OTHER INSTANCES (need full authentication setup later)**:
```bash
# These will need complete authentication middleware deployment first
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-daniel
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-iddo
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-elad
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-yaron
fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-newuser
```

**IMPORTANT**: For working instances (erez, lilah, guy), **NO REDEPLOYMENT NEEDED**!
- The authentication middleware already supports `LOGIN_URL` environment variable
- Updating the secret takes effect immediately
- The code falls back to the old URL if secret is missing

### 3. Environment Variables Update
**Action Required**: Update production environment files

**Files that need manual updates**:

1. **my-jarvis-desktop/.env.production**:
   ```
   Current: LOGIN_URL=https://myjarvis.app/login
   Update to: LOGIN_URL=https://www.myjarvis.io/login
   ```

2. **Verify my-jarvis-web/.env.local** (for local development):
   ```
   Check: NEXTAUTH_URL=http://localhost:3000 (should remain for local dev)
   ```

### 4. DNS Configuration Verification
**Action Required**: Ensure DNS is properly configured

**Steps**:
1. Verify `myjarvis.io` domain points to Vercel
2. Verify `www.myjarvis.io` CNAME points to Vercel
3. Test both `myjarvis.io` and `www.myjarvis.io` resolve correctly
4. Verify SSL certificates are active for both

## 🤖 AUTOMATED TASKS (Claude Will Handle)

### 1. Code Updates Required

#### Authentication Middleware Updates
**Files to Update**:
- `/my-jarvis-desktop/lib/claude-webui-server/middleware/auth.ts`
  - Update default LOGIN_URL from `myjarvis.app` to `www.myjarvis.io`

#### Documentation Updates
**Files to Update**:
- All references to `my-jarvis-web.vercel.app` → `www.myjarvis.io`
- All references to `myjarvis.app` → `www.myjarvis.io`

**Documentation Files Identified**:
- `/agent-workspace/docs/deployment.md`
- `/agent-workspace/docs/users.md`
- `/agent-workspace/tickets/087-marketing-site-auth-gateway/`
- `/agent-workspace/tickets/088-authentication-integration-troubleshooting/README.md`

## ✅ IMPORTANT DISCOVERY

**Good News**: The `my-jarvis-web` project already has the correct URLs configured!

**File**: `/my-jarvis-web/config/site.ts`
```typescript
export const siteConfig = {
  name: "My Jarvis",
  url: "https://www.myjarvis.io",
  description: "Your AI assistant for everything",
  ogImage: "https://www.myjarvis.io/og.jpg",
  links: {
    twitter: "https://twitter.com/myjarvis",
    github: "https://github.com/my-jarvis/my-jarvis",
  },
}
```

This means the **my-jarvis-web Next.js application is already configured for the new domain**. The main work needed is:
1. Vercel domain configuration (manual)
2. Fly.io secrets update (manual)
3. Environment files update (manual)

## Implementation Plan

### Phase 1: Domain Setup (Manual - Erez)
- [ ] Configure Vercel domain settings
- [ ] Set up DNS records
- [ ] Verify SSL certificates

### Phase 2: Environment Updates (Manual - Erez)
- [ ] Update Fly.io secrets for all instances
- [ ] Update production environment files
- [ ] Test environment variable loading

### Phase 3: Code Updates (Automated - Claude)
- [ ] Update authentication middleware default URLs
- [ ] Update documentation references
- [ ] Update hardcoded URLs in configuration files

### Phase 4: Verification & Testing
- [ ] Test complete authentication flow with new URL
- [ ] Verify all instances redirect correctly on auth failure
- [ ] Test signup/login flows end-to-end
- [ ] Verify old URLs still work during transition (if needed)

## Critical Configuration Details

### Current Authentication Flow
1. User visits `www.myjarvis.io/login` (NEW)
2. User authenticates with credentials
3. System generates JWT token (60-second expiration)
4. User redirected to `my-jarvis-{user}.fly.dev?token=xyz`
5. Fly.io instance validates token and creates session
6. On auth failure: redirect to `www.myjarvis.io/login` (NEW)

### JWT Token Configuration (No Changes)
- **Secret**: `dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=` (shared)
- **Expiration**: 60 seconds
- **Usage**: Cross-domain authentication handshake

### Supabase Configuration (No Changes)
- **Project URL**: `https://ocvkyhlfdjrvvipljbsa.supabase.co`
- **Auth flow**: Remains unchanged
- **Database schema**: No modifications needed

## Verification Checklist

### Pre-Migration Tests
- [ ] Current system works with `my-jarvis-web.vercel.app`
- [ ] All Fly.io instances have correct current LOGIN_URL
- [ ] Authentication flow is functional

### Post-Migration Tests
- [ ] `www.myjarvis.io` loads correctly
- [ ] `www.myjarvis.io/login` authentication works
- [ ] JWT token generation functions correctly
- [ ] All Fly.io instances redirect to new login URL on auth failure
- [ ] End-to-end auth flow: login → instance access → session management

### Rollback Plan
- [ ] Revert Fly.io secrets to previous LOGIN_URL
- [ ] Revert environment variables
- [ ] Verify old domain still works as fallback

## Security Considerations

### No Security Changes Required
- JWT secret remains the same (shared between systems)
- Token expiration and validation logic unchanged
- Authentication middleware logic unchanged
- Only URL endpoints are changing

### SSL/TLS Verification
- Ensure `www.myjarvis.io` has valid SSL certificate
- Verify HTTPS enforcement is active
- Test secure cookie functionality with new domain

## Success Criteria

### Must Work After Migration
1. **Authentication Flow**: Complete login → instance access works
2. **Session Management**: Persistent sessions across browser restarts
3. **Auth Failure Handling**: Proper redirect to new login URL
4. **No Broken Links**: All documentation references updated
5. **Performance**: No degradation in auth flow timing

### User Experience
- Seamless transition (users may not notice URL change)
- Professional domain enhances brand credibility
- All existing functionality preserved

## Risk Assessment

### Low Risk Items
- URL changes (straightforward find/replace)
- Documentation updates
- Environment variable updates

### Medium Risk Items
- Fly.io secrets update (requires careful execution across all instances)
- DNS configuration (potential downtime if misconfigured)

### Mitigation Strategies
- Test each Fly.io instance update individually
- Keep old domain active during transition period
- Have rollback plan ready

## Related Files & Dependencies

### Configuration Files
- `my-jarvis-desktop/.env.production`
- `my-jarvis-web/.env.local`
- Vercel environment variables (via dashboard)

### Code Files
- `my-jarvis-desktop/lib/claude-webui-server/middleware/auth.ts`
- All authentication middleware implementations

### Documentation
- All files in `/agent-workspace/docs/`
- All files in `/agent-workspace/tickets/087-*/`
- All files in `/agent-workspace/tickets/088-*/`

---

## 📋 EXECUTIVE SUMMARY

### What Needs to Change
The authentication system currently points to temporary URLs and needs to be updated to use the production domain `www.myjarvis.io`.

### Key Findings
✅ **my-jarvis-web app is ready** - Already configured for `www.myjarvis.io`
🔧 **Fly.io instances need updates** - LOGIN_URL secrets must be updated
📝 **Documentation needs updates** - References to old URLs
⚙️ **Environment files need updates** - Production configuration files

### Manual Tasks for Erez (Priority Order)
1. **Configure Vercel domain** (30 min)
   - Add `www.myjarvis.io` to Vercel project
   - Configure DNS records

2. **Update Fly.io secrets for WORKING instances** (5 min) **🔥 PRIORITY**
   ```bash
   # ✅ These 3 instances work and just need LOGIN_URL updated (NO REDEPLOYMENT!)
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-erez
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-lilah
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-guy
   ```

3. **Update Fly.io secrets for OTHER instances** (10 min) **⚠️ LATER**
   ```bash
   # 🚧 These need full auth setup first, but set URL now for when they're ready
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-daniel
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-iddo
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-elad
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-yaron
   fly secrets set LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-newuser
   ```

4. **Update environment file** (5 min)
   - Edit `my-jarvis-desktop/.env.production`
   - Change `LOGIN_URL=https://myjarvis.app/login` to `LOGIN_URL=https://www.myjarvis.io/login`

### Automated Tasks (Claude handles)
- Update authentication middleware default URL
- Update all documentation references
- Verify no URLs are missed

### Risk Assessment
**LOW RISK** - Simple URL changes with easy rollback plan

---

## Next Steps

1. **Erez**: Configure Vercel domain and DNS
2. **Erez**: Update Fly.io secrets for all instances
3. **Erez**: Update environment files
4. **Claude**: Update code references and documentation
5. **Both**: Test and verify complete authentication flow

**Estimated Time**: 1-2 hours for complete migration and testing

---

*Created: 2025-11-14*
*Priority: HIGH - Required for production domain launch*