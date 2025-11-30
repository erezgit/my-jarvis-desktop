# Ticket #110: Path to 10 Paying Users - Backlog

**Status:** In Progress
**Priority:** Critical
**Goal:** Get 10 paying users (engineers or general knowledge workers)
**Timeline:** 4-6 weeks

---

## Current Status

### 🟢 Category A: UI & Bug Fixes (Agent 1 - Terminal 1)

- 🟡 **File Tree Not Updating** (Ticket 111) - Agent 1 working on Playwright tests, can move forward
- 🟡 **File Preview Not Working** - In progress with Agent 1
- **Voice Messages Need Refresh** - Pending
- **Clean Workspace View** - Pending
- **UI Updates for Tool Responses** - Pending
- **Usage Dashboard** - Pending
- **Microphone Integration** - Pending

### 🟡 Category B: Backend Infrastructure (Agent 2 - Terminal 2)

- ✅ **API Token Authentication** (Ticket 113) - COMPLETED - Company API key implemented
- 🟡 **Token Tracking System** (Ticket 114) - Agent 2 implementing with Supabase MCP testing
- **Company API Key Management** - Pending
- **Payment Integration with Stripe** - Pending
- **Billing Portal** - Pending
- **Signup Flow Enhancement** - Pending
- **Fly Machine Provisioning** - Pending

### 🔴 Category C: Sequential Core Changes (Must be done in order - Terminal 3)

- **Configure Allowed Tools** - Set up SDK tools (Read, Write, Edit, Glob), configure Claude SDK allowedTools
- **Database Schema Setup** - Create all Supabase tables for usage and billing
- **Pricing Tiers Definition** - Define Free/Pro/Enterprise tiers and limits

---

## Next Priority After Ticket 114

**Ticket 115: Usage Dashboard & Analytics**
- Create usage dashboard showing token consumption, billing info, usage history
- Real-time usage tracking widget in UI
- Foundation for subscription tiers and limits

**Why Next:**
- Builds directly on token tracking from Ticket 114
- Required before implementing billing/payment system
- Gives users visibility into their usage before introducing limits

---

## Overview

Path to 10 paying users: Fix critical bugs, implement token tracking, add billing system, enable payments.

**Goal:** $200 MRR (10 users × $20/month Pro tier)
**Timeline:** 4-6 weeks total

**Summary:** Fix bugs → implement token tracking → add billing → enable payments → reach 10 paying users.

---

*Ticket created: 2025-11-26*
*Target: 10 paying users in 6 weeks*
*Revenue Goal: $200 MRR*
*Next Action: Complete Ticket 114, then start Ticket 115*
