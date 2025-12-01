# Ticket #063: Knowledge Base Builder & Presentation Automation

## Status: Planning
**Created**: 2025-10-16
**Priority**: High - Real user validation and clear use cases

---

## Context: Real User Success & New Use Cases

### Major Milestone Achieved
- **Lilach**: Successfully using My Jarvis on her own computer in her own container
  - First real external user adoption
  - Validates the product concept and deployment architecture
  - Immediate need: Knowledge base creation from uploaded documents

- **Danielle**: Therapist/business owner identified presentation creation use case
  - Wants natural language interface to create presentations
  - Iterative editing through conversation
  - Meeting scheduled for next week to explore further

- **Mobile Access**: Erez now using My Jarvis from phone via Fly deployment
  - First-time mobile usage working successfully
  - Demonstrates web deployment value

### Weekly Meeting Cadence
- Lilach: Weekly meetings (ongoing)
- Danielle: Weekly meetings starting (4-week initial commitment)
- Strategy: Guide users through product while building requested features

---

## Core Challenge: Proactive Agency & Onboarding

### Current Gap
Jarvis needs to transform from **reactive responder** to **proactive coach/guide/leader**:

**What this means:**
- Actively drive conversations forward with questions
- Understand user goals (happiness, success) and guide toward them
- Teach users how to use Jarvis effectively
- Suggest next steps and options continuously
- Lead users through processes (like building presentations)

**Example Flow (Danielle's Presentation):**
1. Onboarding understands he wants to create presentations
2. Asks about communication style, knowledge level, audience
3. Asks practical questions about content, structure, goals
4. Actively drives the presentation creation process forward
5. Offers editing options and guides iterations

### Three-Layer Problem
1. **Immediate Use Cases** (tactical value)
   - Knowledge base builder for Lilach
   - Presentation creator for Danielle

2. **Foundational Features** (technical enablers)
   - Robust file upload and processing
   - Large PDF/Word document handling
   - Knowledge base architecture

3. **Deeper Transformation** (strategic capability)
   - Proactive agency and goal-oriented behavior
   - Onboarding system that guides users
   - Teaching Jarvis to be helpful, forward-driving

---

## Use Case #1: Knowledge Base Builder (Lilach)

### Requirements
- Upload large files (PDFs, Word documents)
- Break documents into structured markdown chunks
- Create searchable/indexable knowledge base
- Make content accessible to Jarvis in conversations

### Technical Approach Needed
- File upload handling (multiple, large files)
- Document parsing (PDF, DOCX)
- Chunking strategy (semantic or size-based)
- Summarization of chunks
- Storage format (markdown files, metadata)
- Search/retrieval mechanism
- Context injection for conversations

### Current State (Updated 2025-10-16)

**✅ What's Already Built:**
1. **Frontend File Upload Component**
   - `FileUploadButton.tsx` - Paperclip icon button component
   - Accepts `.pdf`, `.doc`, `.docx` files
   - Integrated into `ChatInput.tsx`
   - File selection triggers upload to backend

2. **Backend Upload Endpoint**
   - `handlers/upload.ts` - Complete upload handler
   - Endpoint: `POST /api/upload-document`
   - Saves files to `workspace/uploads/` directory
   - Returns success response with file metadata

3. **ChatPage Integration**
   - `handleFileUpload()` function in ChatPage.tsx
   - Sends files to API using FormData
   - Shows success/error messages after upload
   - Files are successfully saved to disk

4. **Existing Python Tools**
   - `tools/src/cli/jarvis_pdf.py` - Markdown to PDF converter (reverse direction)
   - Voice generation scripts in place
   - Basic CLI infrastructure exists

**❌ What's NOT Built Yet:**
1. **Document Processing Pipeline**
   - No PDF text extraction script
   - No Word document parser
   - No chunking logic (splitting into 10-15 page segments)
   - No markdown file generation from chunks

2. **AI Integration**
   - No Claude API integration for summarization
   - No index generation with chunk descriptions
   - No summary document creation

3. **Instruction System**
   - No instruction markdown file for automation workflow
   - No step-by-step processing guide for Claude Code

4. **Knowledge Base Structure**
   - No `workspace/knowledge-base/` directory structure
   - No storage organization for processed documents
   - No metadata.json files
   - No chunk storage system

5. **Conversation Integration**
   - No mechanism to load knowledge base into conversation context
   - No search/retrieval system for relevant chunks
   - No citation system for referencing sources

**Current Capability:**
- Users can upload files successfully
- Files are saved to `workspace/uploads/`
- **Files sit unprocessed** - no automated processing happens after upload
- User receives confirmation message suggesting manual processing

**Why Development Stopped:**
Likely realized the automation approach should use Claude Code itself to execute processing steps via instruction markdown, rather than building a separate standalone processing system. This aligns with the "automation via instructions" pattern mentioned by Erez.

---

## Use Case #2: Presentation Creator (Danielle)

### Requirements
- Natural language conversation to define presentation
- Jarvis asks guiding questions (style, audience, content)
- Generate presentation in standard format
- Iterative editing through conversation
- Export to usable format (PPTX, Google Slides, PDF)

### User Experience Vision
- Talk to Jarvis naturally about presentation needs
- Jarvis drives the process with smart questions
- Presentation gets created in real-time
- Give feedback: "make this slide more visual"
- Presentation updates based on feedback
- Much better UX than tools like Gamma

### Technical Approach Needed
- Presentation generation library/API
- Template system or dynamic creation
- Question-driven conversation flow (proactive agency)
- State management for presentation being built
- Export functionality
- Preview/iteration mechanism

### Current State
- No presentation creation capability
- No presentation agent or workflow
- Meeting with Danielle next week

---

## Strategic Priority Discussion

### Options
1. **Start with onboarding/agency framework**
   - Build the proactive, goal-oriented foundation
   - Then implement use cases as specialized agents
   - Longer to first user value

2. **Start with specific use cases**
   - Build knowledge base builder for Lilach (immediate value)
   - Build presentation creator for Danielle (immediate value)
   - Iterate on agency/onboarding in parallel
   - Faster to user validation

3. **Hybrid approach**
   - Enhance CLAUDE.md with agency principles
   - Build one use case feature (presentation or knowledge base)
   - Learn from user interaction
   - Improve agency based on real usage

### User (Erez) Will Lead Current Users
- Erez will guide Lilach and Danielle through weekly meetings
- Not dependent on perfect onboarding immediately
- Can gather feedback and iterate
- Onboarding important but not blocking user adoption

### Recommendation
**Focus on features (automations/use cases) first** because:
- Real users with real needs right now
- Validates product value immediately
- Provides data for improving agency/onboarding
- Erez can guide users manually while features are built
- Features ARE the value proposition (better than Gamma, etc.)

---

## Implementation Checklist

### Phase 1: File Upload (COMPLETED ✅)
- [✅] Frontend upload button component (`FileUploadButton.tsx`)
- [✅] Backend upload endpoint (`handlers/upload.ts`)
- [✅] ChatPage integration with success/error messaging
- [✅] File validation (.pdf, .doc, .docx)
- [✅] Upload directory creation (`workspace/uploads/`)

### Phase 2: Document Processing Pipeline (NOT STARTED ❌)
- [ ] Create PDF text extraction script/tool
- [ ] Create Word document parser (.doc, .docx)
- [ ] Implement chunking logic (10-15 page segments)
- [ ] Generate markdown files from chunks
- [ ] Create metadata structure for documents

### Phase 3: Knowledge Base Structure (NOT STARTED ❌)
- [ ] Define `workspace/knowledge-base/` directory structure
- [ ] Create storage organization for processed documents
- [ ] Implement metadata.json format
- [ ] Create chunk storage system
- [ ] Build index/catalog of processed documents

### Phase 4: AI Integration (NOT STARTED ❌)
- [ ] Integrate Claude API for chunk summarization
- [ ] Generate index with chunk descriptions
- [ ] Create summary documents for each uploaded file
- [ ] Build automation instruction system

### Phase 5: Conversation Integration (NOT STARTED ❌)
- [ ] Implement knowledge base loading mechanism
- [ ] Create search/retrieval system for relevant chunks
- [ ] Add citation system for referencing sources
- [ ] Test end-to-end flow with real documents

### Phase 6: Presentation Creator (NOT STARTED ❌)
- [ ] Research presentation generation libraries
- [ ] Design conversation flow for presentation creation
- [ ] Implement template system
- [ ] Add export functionality (PPTX, PDF)
- [ ] Build iterative editing capability

## Current Status Summary

**Overall Progress: ~15% Complete**
- **File Upload**: 100% ✅ (fully functional)
- **Document Processing**: 0% ❌ (not started)
- **Knowledge Base**: 0% ❌ (not started)
- **AI Integration**: 0% ❌ (not started)
- **Conversation Integration**: 0% ❌ (not started)
- **Presentation Creator**: 0% ❌ (not started)

**Blockers:**
- No processing pipeline exists after upload
- No defined knowledge base structure
- No automation/instruction system
- Upload functionality exists but files remain unprocessed

**Next Immediate Steps:**
1. Define knowledge base directory structure
2. Create document processing pipeline (PDF/Word → chunks → markdown)
3. Build automation instruction system for Claude Code to execute processing

### Decision Needed
1. Which use case to build first: Knowledge base or Presentation creator?
   - **Recommendation**: Knowledge base (Lilach has immediate need)
2. What's the timeline for first working version?
   - **Current**: No ETA set
3. How to structure the agent behavior for these use cases?
   - **Approach**: Use instruction markdown for automation workflows

### User Meetings
- Continue weekly with Lilach (knowledge base use case)
- Start weekly with Danielle (presentation use case)
- Gather feedback and iterate

---

## Technical Architecture Considerations

### Agent Workspace Structure
Current structure in `/workspace/my-jarvis/projects/my-jarvis-desktop/agent-workspace/`:
- `docs/` - Architecture and project overview
- `tickets/` - Task tracking (now at #063)

Need to consider:
- Where agent behavior definitions live
- How to teach Jarvis new capabilities
- How to make features accessible to users

### Integration Points
- File upload mechanism (frontend)
- File processing backend
- Agent orchestration (existing Swarm integration)
- User workspace/container architecture (per-user Fly containers)
- Knowledge persistence and retrieval

---

## Success Metrics

### Short-term (4-6 weeks)
- Lilach actively using knowledge base feature
- Danielle creates first presentation via conversation
- Mobile usage stable and responsive
- User feedback validates approach

### Medium-term (3 months)
- Multiple users adopting these "automation" features
- Onboarding successfully guides new users
- Feature becomes reference point (better than Gamma)
- Path to 100 paying users clear

---

*This ticket captures strategic direction discussion and user validation milestones. Implementation plans will be created based on priority decisions.*
