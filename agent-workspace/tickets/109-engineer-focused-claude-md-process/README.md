# Ticket #109: Engineer-Focused Claude MD Process

**Status:** 🟢 READY TO IMPLEMENT
**Priority:** High
**Target User:** Engineers (Hardware/Software)
**Created:** 2025-11-24
**Estimated Time:** 4-6 weeks (iterative with real user testing)

---

## 🎯 Product Vision

Transform Claude MD from a general conversational tool into a **structured discovery and execution process** specifically designed for engineers. Based on successful pilot session with Elad (hardware engineer), we've validated that a guided multi-stage process produces significantly better outcomes than ad-hoc conversation.

### Key Insight from Pilot

**Before (Failed):** Elad tried Claude directly → Didn't work
**After (Succeeded):** Structured JARVIS process → Code worked first time

The difference: **Process-led collaboration beats tool access.**

---

## 🧑‍💻 Target User: Engineers

### Who They Are
- **Hardware Engineers**: Programming microcontrollers, sensors, embedded systems
- **Software Engineers**: Building tools, automation, integrations, prototypes
- **Domain Experts**: Deep technical knowledge in their field, varying AI/prompt experience

### What They Need
- **Clear structure**: Step-by-step guidance through problem-solving
- **Technical depth**: AI that understands domain-specific requirements
- **Working solutions**: Code that actually runs, not just plausible-looking snippets
- **Learning curve**: Gentle onboarding to AI-assisted development

### What Doesn't Work
- **Free-form chat**: Too much cognitive load on "how to ask"
- **Direct code generation**: Skips critical context gathering
- **One-shot solutions**: Ignores constraints, edge cases, architecture

---

## 📋 Current Process (Validated with Elad)

### Stage 1: Discovery Document
**Goal:** Capture the full problem space before touching code

**JARVIS leads by asking:**
1. "What are you trying to build?" (high-level goal)
2. "What hardware/software are you working with?" (platform constraints)
3. "What have you tried so far?" (context on failures)
4. "What's your timeline and success criteria?" (constraints)

**Output:** `discovery.md` - Comprehensive problem statement

**Time:** 15-30 minutes

---

### Stage 2: Product Requirements Document (PRD)
**Goal:** Define what success looks like in measurable terms

**JARVIS leads by asking:**
1. "What are the must-have features?" (MVP scope)
2. "What should the user experience be?" (interaction model)
3. "What are the edge cases and error states?" (robustness)
4. "What are non-goals?" (scope boundaries)

**Output:** `PRD.md` - Detailed requirements with acceptance criteria

**Time:** 20-40 minutes

---

### Stage 3: Architecture Document
**Goal:** Design the technical solution before implementation

**JARVIS leads by asking:**
1. "What are the major components?" (system design)
2. "How will data flow through the system?" (integration points)
3. "What libraries/frameworks should we use?" (technology choices)
4. "What are potential technical risks?" (risk mitigation)

**Output:** `architecture.md` - Technical design with diagrams

**Time:** 30-60 minutes

---

### Stage 4: Implementation Plan
**Goal:** Break down the work into executable steps

**JARVIS creates:**
1. **Checklist of tasks** - Ordered by dependencies
2. **File structure** - What files need creation/modification
3. **Testing strategy** - How to validate each step
4. **Rollback plan** - How to undo if things break

**Output:** `implementation-plan.md` - Actionable task breakdown

**Time:** 15-30 minutes

---

### Stage 5: Execution
**Goal:** Write code that works

**JARVIS executes:**
1. **Implements each task** from the plan
2. **Tests incrementally** after each step
3. **Documents decisions** and deviations from plan
4. **Validates against PRD** before marking complete

**Output:** Working code + test results + `implementation-log.md`

**Time:** 1-4 hours (depending on complexity)

---

## 🎯 Success Metrics (How We Measure "Works Better")

### Quantitative Metrics
- **Success Rate**: % of sessions where code works on first deployment
- **Iteration Count**: Number of back-and-forth fixes needed
- **Time to Working Solution**: Discovery → deployed code (target: <3 hours)
- **User Satisfaction**: Post-session rating (1-5 scale)

### Qualitative Metrics
- **User Confidence**: "I understand what the code does" (yes/no)
- **Process Clarity**: "I knew what to expect at each step" (yes/no)
- **Autonomy**: "I could do this again without help" (yes/no)
- **Value vs. Direct Claude**: "This was better than using Claude directly" (yes/no)

---

## 🏗️ Implementation Requirements

### Phase 1: Process Definition (This Ticket)
**Goal:** Document the exact behavior JARVIS should exhibit

- [ ] Create detailed prompt templates for each stage
- [ ] Define transition criteria between stages (when to move on)
- [ ] Document question frameworks for discovery
- [ ] Create example sessions for different engineering domains

**Deliverables:**
- `process-guide.md` - Full process documentation
- `prompt-templates/` - Stage-specific prompts
- `examples/` - 3-5 example sessions (hardware, software, data)

**Time:** 1-2 days

---

### Phase 2: Claude MD Behavior Implementation
**Goal:** Encode the process into Claude MD system prompts

- [ ] Update `CLAUDE.md` with engineer-specific mode
- [ ] Create `.claude/agents/engineer-guide.md` agent definition
- [ ] Implement stage tracking in backend (which stage are we in?)
- [ ] Add document generation tools (create discovery.md, PRD.md, etc.)

**Deliverables:**
- Updated `CLAUDE.md` with engineer mode
- New agent definition for structured process
- Backend handlers for document management

**Time:** 2-3 days

---

### Phase 3: Testing with Real Engineers
**Goal:** Validate the process with 5-10 engineers

**Recruitment Criteria:**
- Mix of hardware and software engineers
- Varying AI experience (novice to expert)
- Real problems they're trying to solve (not toy examples)

**Testing Protocol:**
1. **Pre-session survey**: Experience level, problem description
2. **Guided session**: JARVIS leads through 5-stage process
3. **Outcome measurement**: Did code work? How many iterations?
4. **Post-session survey**: Satisfaction, clarity, likelihood to use again
5. **Session recording**: Save all documents + conversation logs

**Deliverables:**
- Test session reports (one per engineer)
- Aggregate metrics dashboard
- Qualitative feedback summary
- Process refinements based on learnings

**Time:** 2-3 weeks (recruiting + sessions + analysis)

---

### Phase 4: Iteration & Refinement
**Goal:** Fix pain points discovered in testing

**Common Expected Issues:**
- Stage transitions too rigid/loose
- Questions too generic or too technical
- Missing domain-specific knowledge
- Process too slow for simple problems

**Approach:**
- Categorize feedback into themes
- Prioritize high-impact changes
- Implement refinements
- Re-test with subset of users

**Deliverables:**
- Updated process guide
- Refined prompts
- Version 2.0 of engineer mode

**Time:** 1-2 weeks

---

## 🚀 Go-to-Market Strategy

### Target Audience
**Primary:** Hardware engineers programming embedded systems
**Secondary:** Software engineers building internal tools
**Tertiary:** Data engineers building ETL pipelines

### Value Proposition
**"From idea to working code in 3 hours, guided by AI that understands your domain."**

### Distribution Channels
1. **Direct outreach** - Reach out to engineers in our network
2. **Engineering communities** - Share in forums (Reddit r/embedded, Hacker News)
3. **Case studies** - Document Elad's success story as proof

---

## 📊 Success Criteria for This Ticket

### Must Have (Ticket Complete)
- [ ] Full process documentation (`process-guide.md`)
- [ ] Prompt templates for all 5 stages
- [ ] 3 example sessions documented
- [ ] Claude MD implementation (updated `CLAUDE.md` + agent definition)
- [ ] Backend support for document generation
- [ ] Test plan for Phase 3

### Should Have
- [ ] Metrics dashboard for tracking sessions
- [ ] Automated session logging
- [ ] User feedback form integration

### Could Have (Future)
- [ ] Domain-specific variations (hardware vs. software vs. data)
- [ ] Multi-language support
- [ ] Integration with project management tools

---

## 🧪 Testing Strategy

### Unit Testing (Process Components)
- Test each stage prompt independently
- Validate document generation tools
- Verify stage transition logic

### Integration Testing (Full Process)
- Run through 5 stages with synthetic problems
- Verify document handoffs between stages
- Check that context carries forward

### User Acceptance Testing (Real Engineers)
- 5-10 engineers with real problems
- Measure success rate, time, satisfaction
- Iterate based on feedback

---

## 🤔 What I Think (Claude's Analysis)

### Strengths of This Approach
1. **Proven with real user**: Elad's success de-risks the concept
2. **Process over tools**: Addresses root cause (unclear workflow) not symptoms
3. **Measurable outcomes**: Clear success metrics = data-driven iteration
4. **Scalable**: Process can be encoded once, used by many engineers

### Potential Challenges
1. **Process rigidity**: Some engineers may find 5 stages too much for simple problems
   - **Solution:** Add "fast track" mode for experienced users or simple tasks

2. **Domain breadth**: Hardware engineers have very different needs than web developers
   - **Solution:** Start narrow (embedded systems), expand based on demand

3. **Time investment**: 2-3 hours upfront may feel slow compared to "just code it"
   - **Solution:** Emphasize time savings from fewer iterations/bugs

4. **Prompt engineering**: Getting the questions right will take iteration
   - **Solution:** Version control prompts, A/B test variations

### Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Engineers don't complete full process | High | Medium | Make stages skippable, save progress |
| Process feels robotic/unnatural | Medium | Medium | Add conversational flexibility within stages |
| Can't recruit test engineers | High | Low | Leverage existing network, offer incentives |
| Code still doesn't work despite process | High | Low | Add validation checkpoints, testing requirements |

### Recommended Next Steps
1. **Start with documentation** (Phase 1) - Get the process crystal clear
2. **Build minimal Claude MD implementation** - Just enough to test
3. **Run 2-3 pilot sessions** - Before scaling to 10 engineers
4. **Iterate rapidly** - Weekly refinements based on feedback
5. **Document everything** - Session logs become training data

### Key Questions to Answer
1. **How do we handle engineers who want to skip stages?**
   - Option A: Allow skipping but warn about risks
   - Option B: Require all stages, show time savings
   - Option C: Adaptive process based on problem complexity

2. **Should JARVIS create the documents, or guide the engineer to write them?**
   - Current: JARVIS asks questions, generates documents
   - Alternative: Engineer writes, JARVIS reviews and improves
   - Recommendation: JARVIS generates (less friction), engineer reviews

3. **What if code doesn't work after following the full process?**
   - Fallback: Debugging mode with more iterative testing
   - Prevention: Add validation checkpoints in Stage 4/5
   - Learning: Feed failures back into prompt refinement

4. **How do we differentiate this from GitHub Copilot / Cursor / other AI coding tools?**
   - **Our edge:** Process guidance, not just autocomplete
   - **Positioning:** For complex, multi-step problems where architecture matters
   - **Not for:** Quick one-liners or refactoring existing code

---

## 📚 Related Tickets

- **#107**: Multi-Agent Orchestrator System (for parallel execution of implementation plans)
- **#001-003** (my-jarvis-web): Landing page targeting engineers
- **Future**: Domain-specific agent definitions (hardware-engineer.md, software-engineer.md)

---

## 📖 References

### Existing Documentation
- `/home/node/my-jarvis/docs/user-profile.md` - User context
- `/home/node/guides/` - Process guides (PDF extraction, presentations)

### Elad's Session (Source of Truth)
- **What happened**: Discussed microcontroller programming problem
- **Discovery**: Captured hardware specs, constraints, prior attempts
- **Product**: Defined success criteria (read sensor, display data)
- **Architecture**: Chose libraries, defined code structure
- **Implementation**: Code worked first time after deployment

### Key Learnings
1. **Context is everything**: Rich discovery document eliminated ambiguity
2. **Architecture before code**: Technical design prevented dead ends
3. **User confidence**: Elad understood the solution, not just consumed it
4. **Time investment pays off**: 2 hours upfront saved days of debugging

---

## 🎬 Conclusion

This ticket is about **making the implicit process explicit**. We've validated that structured, process-led collaboration beats ad-hoc conversation for engineers. Now we need to:

1. **Document the exact process** (what JARVIS says/asks at each stage)
2. **Implement it in Claude MD** (encode behavior in system prompts)
3. **Test with real engineers** (measure success vs. direct Claude use)
4. **Iterate based on data** (refine prompts, add domain knowledge)

**Success looks like:** 10 engineers say "this was better than Claude alone" and their code works with minimal iteration.

**Timeline:** 4-6 weeks from start to validated process (with real user testing)

**Next immediate action:** Create `process-guide.md` with detailed stage-by-stage prompts.

---

*This is the foundation for JARVIS becoming the go-to AI pair programmer for engineers. Let's make it happen.*
