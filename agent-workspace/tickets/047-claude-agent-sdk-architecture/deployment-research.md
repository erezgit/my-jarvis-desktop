# Claude Agent SDK Deployment Research Report

**Research Date:** October 5, 2025
**Total Searches Conducted:** 25+
**Sources Analyzed:** Official Anthropic documentation, GitHub repositories, community blogs, technical tutorials

---

## Executive Summary

The Claude Agent SDK (formerly Claude Code SDK) is a production-ready framework built on the same agent harness that powers Claude Code. It provides comprehensive tools for building autonomous AI agents with capabilities extending far beyond coding tasks. This report synthesizes deployment patterns, server implementations, multi-user architectures, and comparative analyses from extensive research across official and community sources.

---

## 1. Official Documentation & Resources

### Primary Official Sources

1. **Official Documentation**
   - URL: https://docs.claude.com/en/api/agent-sdk/overview
   - Comprehensive API reference, deployment guides, authentication options
   - Covers TypeScript and Python SDKs

2. **Anthropic Engineering Blog**
   - URL: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
   - Best practices, architecture patterns, deployment strategies
   - Written by the team that built the SDK

3. **GitHub Repositories**
   - Python SDK: https://github.com/anthropics/claude-agent-sdk-python
   - TypeScript SDK: https://github.com/anthropics/claude-agent-sdk-typescript
   - Demo Examples: https://github.com/anthropics/claude-code-sdk-demos

### Additional Resources

4. **DataCamp Tutorial**
   - URL: https://www.datacamp.com/tutorial/how-to-use-claude-agent-sdk
   - Step-by-step implementation guide with 3 sample projects

5. **Community Guides**
   - PromptLayer Blog: https://blog.promptlayer.com/building-agents-with-claude-codes-sdk/
   - eesel AI Guide: https://www.eesel.ai/blog/python-claude-code-sdk

---

## 2. Deployment Architecture Patterns

### 2.1 Core Agent Loop Pattern

The fundamental architecture follows a feedback loop:

```
gather context → take action → verify work → repeat
```

**Context Gathering Strategies:**

1. **Agentic Search**
   - Uses bash commands (grep, find, glob) like a human developer
   - Performs on-demand searches rather than pre-indexing
   - Leverages file system structure for context engineering

2. **Subagents**
   - Enable parallel task processing
   - Use isolated context windows
   - Return only relevant information to main orchestrator
   - Example: Email agent spawning multiple search subagents

3. **Automatic Compaction**
   - Summarizes previous messages when approaching context limit
   - Prevents context overflow in long-running tasks

### 2.2 Production Deployment Features

**Built-in Production Essentials:**
- Error handling and recovery
- Session management and persistence
- Monitoring and observability
- Automatic context management
- Performance optimizations (prompt caching, reduced latency)

**Fine-Grained Permissions:**
- `allowedTools` - Whitelist specific tools
- `disallowedTools` - Blacklist dangerous operations
- `permissionMode` - Control approval requirements
- Per-tool allow/deny configurations

### 2.3 Authentication Options

```python
# Option 1: Claude API Key
ANTHROPIC_API_KEY=sk-ant-xxx

# Option 2: Amazon Bedrock
CLAUDE_CODE_USE_BEDROCK=1
# + AWS credentials configuration

# Option 3: Google Vertex AI
CLAUDE_CODE_USE_VERTEX=1
# + Google Cloud credentials configuration
```

---

## 3. Server Implementation Examples

### 3.1 FastAPI + Claude Agent SDK

**Repository:** https://github.com/e2b-dev/claude-code-fastapi

**Architecture:**
- FastAPI REST API for Claude Code execution
- E2B sandboxes for secure isolated execution
- Session management for persistent conversations
- GitHub integration for repository operations

**Key Features:**
- Remote Claude Code execution via HTTP
- WebSocket streaming for real-time updates
- MCP server support
- Repository cloning and pushing

**API Endpoints:**
```bash
# Start new conversation
POST /chat
{
  "prompt": "Add GPT 3.5-Turbo to models",
  "repo": "https://github.com/e2b-dev/fragments"
}

# Continue existing conversation
POST /chat/{session_id}
{
  "prompt": "Now add Claude 3.5 Sonnet"
}
```

**Deployment Steps:**
```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cat > .env << EOF
E2B_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
EOF

# 3. Build sandbox template
python build.py

# 4. Start server
uvicorn app.main:app --reload
```

### 3.2 Email Agent Demo (WebSocket Streaming)

**Repository:** https://github.com/anthropics/claude-code-sdk-demos/tree/main/email-agent

**Architecture:**
- IMAP email integration
- SQLite for email caching
- WebSocket for real-time UI updates
- Multi-turn conversation context

**Features:**
- Natural language email search
- AI-powered draft replies
- Thread summarization
- Real-time streaming updates

**Tech Stack:**
- Bun/Node.js 18+ runtime
- SQLite database
- WebSocket protocol
- Claude Agent SDK

**Security Note:** Local development only, not production-ready

### 3.3 In-Process MCP Server Pattern

**Python Implementation:**

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("greet", "Greet a user", {"name": str})
async def greet_user(args):
    return {
        "content": [
            {"type": "text", "text": f"Hello, {args['name']}!"}
        ]
    }

# Create SDK MCP server (in-process)
sdk_server = create_sdk_mcp_server(
    name="my-tools",
    version="1.0.0",
    tools=[greet_user]
)

# Configure agent with mixed servers
options = ClaudeAgentOptions(
    mcp_servers={
        "internal": sdk_server,          # In-process SDK server
        "external": {                     # External subprocess server
            "type": "stdio",
            "command": "external-server"
        }
    }
)
```

**Advantages:**
- No subprocess management
- Better performance (no IPC overhead)
- Simpler deployment (single Python process)
- Direct function calls

---

## 4. Multi-User Architecture Patterns

### 4.1 Current State

**Important Finding:** Specific multi-user architecture documentation is limited in official sources. The SDK focuses on single-agent deployment patterns.

### 4.2 Multi-Tenant Deployment Considerations

Based on general AI agent best practices and SDK capabilities:

**Isolation Strategies:**

1. **Silo Model**
   - Dedicated resource stacks per tenant
   - Coarse-grained access policies
   - Complete infrastructure isolation

2. **Pooled Resources**
   - Shared infrastructure with tenant ID tagging
   - Fine-grained access control
   - Data isolation via tenant identifiers

3. **Session-Based Isolation**
   ```python
   # Pseudo-code for multi-tenant session management
   async def create_tenant_session(tenant_id: str, user_id: str):
       options = ClaudeAgentOptions(
           cwd=f"/tenants/{tenant_id}/workspace",
           allowed_tools=get_tenant_permissions(tenant_id),
           permission_mode="acceptEdits" if is_premium(tenant_id) else "manual"
       )
       return ClaudeSDKClient(options=options)
   ```

**Key Considerations:**
- Tenant-specific context isolation
- Permission-based tool access
- Resource quotas and rate limiting
- Monitoring per tenant
- Session state management

### 4.3 Scalability Patterns

**Horizontal Scaling:**
- Run multiple Claude Code instances in parallel
- Message broker setup for work distribution
- Pub/sub for event distribution
- Load balancing across agent instances

**Subagent Parallelization:**
```python
# Example: Parallel research tasks
orchestrator_agent.spawn_subagents([
    {"type": "researcher", "task": "Analyze API patterns"},
    {"type": "researcher", "task": "Review security docs"},
    {"type": "researcher", "task": "Study performance metrics"}
])
```

**Context Management:**
- Automatic compaction prevents overflow
- Just-in-time retrieval patterns
- Structured note-taking for memory
- Vector search via MCP for semantic understanding

---

## 5. Docker Deployment

### 5.1 Community Docker Solutions

**1. claude-docker by VishalJ99**
- Repository: https://github.com/VishalJ99/claude-docker
- Features:
  - Isolated container execution
  - Persistent conversation history
  - Twilio SMS notifications for remote work
  - Automatic UID/GID file permissions
  - Full permissions mode with `--dangerously-skip-permissions`

**2. ClaudeBox by RchGrav**
- Repository: https://github.com/RchGrav/claudebox
- Features:
  - Per-project Docker isolation
  - Separate images per project
  - Pre-configured development profiles
  - Automatic dependency resolution

### 5.2 Security Recommendations

From Anthropic:
- Use `--dangerously-skip-permissions` only in containers
- Run in environment without internet access
- Keep Docker images secure (credentials baked in)
- Use reference implementation with Docker Dev Containers

### 5.3 MCP + Docker Integration

Docker provides official MCP server images:
- Available in Docker Hub `mcp` namespace
- Easy integration with Claude Desktop
- Configuration via `claude_desktop_config.json`

---

## 6. Claude Code CLI vs Claude Agent SDK

### 6.1 Key Differences

| Aspect | Claude Code CLI | Claude Agent SDK |
|--------|-----------------|------------------|
| **Purpose** | Interactive coding assistant | Programmable agent framework |
| **Use Case** | Terminal-based development | Build custom AI agents |
| **Scope** | Coding tasks | Any autonomous task |
| **Interface** | Command-line tool | SDK/API library |
| **Deployment** | Local terminal | Server/application embedding |

### 6.2 Relationship

- **Foundation:** Agent SDK is built on the same harness that powers Claude Code CLI
- **Migration:** Claude Code SDK was renamed to Claude Agent SDK to reflect broader capabilities
- **Tools:** SDK provides access to same core tools, context management, permissions

### 6.3 When to Use Each

**Use Claude Code CLI when:**
- Interactive development workflow
- Terminal-based coding tasks
- Quick prototyping and iteration
- Direct file system access needed

**Use Claude Agent SDK when:**
- Building custom applications
- Server-side agent deployment
- Multi-user systems
- Programmatic control required
- Integration with existing services

---

## 7. Production Best Practices

### 7.1 Architecture Recommendations

**From Anthropic Engineering:**

1. **Tool Design**
   - Make tools prominent in context window
   - Design for primary actions
   - Keep tool descriptions clear and concise

2. **Context Efficiency**
   - Use subagents for parallel processing
   - Implement automatic compaction
   - Leverage agentic search over RAG when possible

3. **Verification Strategies**
   - Rule-based validation for structured output
   - Visual feedback for UI tasks (Playwright)
   - LLM judging only when performance justifies latency

4. **Progressive Enhancement**
   - Start with in-process SDK MCP tools
   - Move critical services to external MCP servers
   - Use least privilege principles
   - Put dangerous operations behind hooks

### 7.2 Testing Approach

```python
# Representative test pattern
test_cases = [
    {
        "scenario": "API endpoint creation",
        "input": "Create REST endpoint for user auth",
        "expected_tools": ["Write", "Bash", "Edit"],
        "success_criteria": ["tests pass", "endpoint documented"]
    }
]

# Continuous improvement cycle
for failure in agent_failures:
    analyze_output()
    ask("Does agent have right tools?")
    refine_tool_design()
    update_test_set()
```

### 7.3 Performance Optimization

**Built-in Optimizations:**
- Automatic prompt caching
- Reduced latency through context management
- Improved throughput via parallel subagents
- Token usage optimization

**Implementation Tips:**
- Use streaming for interactive UX
- Single-shot for batch/deterministic runs
- Agentic search for dynamic lookups
- Add vector search via MCP when semantic understanding crucial

---

## 8. Code Examples from Research

### 8.1 Basic Agent Setup (Python)

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

# Configure agent options
options = ClaudeAgentOptions(
    cwd="/path/to/workspace",
    allowed_tools=["Read", "Write", "Bash"],
    permission_mode="acceptEdits",
    mcp_servers={
        "my-tools": sdk_mcp_server
    }
)

# Create client
client = ClaudeSDKClient(options=options)

# Execute query
async for message in client.query("Create a REST API"):
    if message.type == "text":
        print(message.content)
```

### 8.2 Custom Tool Definition

```python
@tool(
    name="database_query",
    description="Query the application database",
    input_schema={
        "query": str,
        "params": list
    }
)
async def query_database(args):
    result = await db.execute(args["query"], args["params"])
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(result, indent=2)
            }
        ]
    }
```

### 8.3 Session Management

```python
# Create session
session = await client.sessions.create(
    messages=[{"role": "user", "content": "Start task"}]
)

# Resume session
resumed = await client.sessions.resume(session.id)

# Continue conversation
response = await resumed.continue_session(
    message="Continue with next step"
)
```

### 8.4 Subagent Orchestration

```python
# Email agent spawning parallel search subagents
async def search_emails(queries: list[str]):
    subagents = []

    for query in queries:
        subagent = agent.spawn_subagent({
            "type": "researcher",
            "task": f"Search emails for: {query}",
            "context_isolation": True
        })
        subagents.append(subagent)

    # Collect results
    results = await asyncio.gather(*[
        sub.get_results() for sub in subagents
    ])

    # Return only relevant excerpts
    return [r.summary for r in results]
```

---

## 9. Community Projects & Templates

### 9.1 Production-Ready Subagents

**1. awesome-claude-code-subagents by VoltAgent**
- Repository: https://github.com/VoltAgent/awesome-claude-code-subagents
- 100+ specialized AI agents
- Categories: Full-stack dev, DevOps, data science, business ops

**2. agents by wshobson**
- Repository: https://github.com/wshobson/agents
- Production-ready subagents collection
- Enterprise architecture patterns

**3. Claude Agents Framework by lodetomasi**
- Repository: https://github.com/lodetomasi/claude-agents-framework
- TypeScript SDK
- CLI tools and agent templates
- Validation testing
- Agent marketplace

### 9.2 Integration Examples

**Multi-Agent Orchestration:**
- Repository: https://github.com/baryhuang/claude-code-by-agents
- Desktop app and API
- Local and remote agent coordination
- @mentions for agent communication

**AgentAPI HTTP Server:**
- Repository: https://github.com/coder/agentapi
- HTTP API for Claude Code, Goose, Aider, Gemini, Amp, Codex
- Unified interface for multiple agent systems

---

## 10. Model Context Protocol (MCP) Integration

### 10.1 MCP Overview

**What is MCP:**
- Open standard for connecting AI assistants to data systems
- Model-agnostic (works with Claude, GPT-4, open-source models)
- Handles authentication and API calls automatically
- Standardized integrations to external services

### 10.2 MCP vs Agent SDK

**MCP Provides:**
- Standardized external service connections
- Pre-built integrations (Slack, GitHub, Google Drive, etc.)
- Authentication handling
- API abstraction layer

**Agent SDK Provides:**
- Agent orchestration and lifecycle
- Built-in tooling (file ops, code execution)
- Context management
- Permission framework

**Together They Enable:**
- Agent SDK for orchestration
- MCP for data access
- Combined: Full-featured autonomous agents

### 10.3 MCP Server Types

```python
# Stdio servers (local processes)
mcp_servers = {
    "local-db": {
        "type": "stdio",
        "command": "python",
        "args": ["db_server.py"]
    }
}

# In-process SDK servers
sdk_server = create_sdk_mcp_server(
    name="custom-tools",
    tools=[custom_tool_1, custom_tool_2]
)

# Combined configuration
options = ClaudeAgentOptions(
    mcp_servers={
        "local": {"type": "stdio", "command": "local-server"},
        "sdk": sdk_server
    }
)
```

---

## 11. Real-World Use Cases

### 11.1 Financial Compliance Agent

**Capabilities:**
- Portfolio analysis
- Investment evaluation
- External API access for market data
- Calculation execution
- Risk assessment

### 11.2 Customer Support Agent

**Features:**
- High-ambiguity request handling
- User data collection and review
- External API connections
- Automated messaging
- Human escalation when needed

### 11.3 Personal Assistant Agent

**Functions:**
- Travel booking
- Calendar management
- Appointment scheduling
- Brief compilation
- Cross-application context tracking

### 11.4 Documentation Pipeline

**Rick Hightower's 7-Subagent Workflow:**
1. Diagram extraction agent
2. Image generation agent
3. Content compilation agents
4. Word/PDF conversion agents
5. Orchestrator for flow management

---

## 12. Limitations & Gaps Identified

### 12.1 Documentation Gaps

1. **Multi-User Architecture**
   - No official multi-tenant deployment guide
   - Limited session isolation patterns
   - Minimal concurrent user handling examples

2. **WebSocket Implementation**
   - No native WebSocket support in SDK
   - Email demo shows pattern but not production-ready
   - Need external implementation (see Cloudflare Agents SDK)

3. **Enterprise Deployment**
   - Limited Kubernetes/container orchestration docs
   - No official Docker deployment guide
   - Scaling strategies mostly community-driven

### 12.2 Production Considerations

**Security:**
- Email demo stores credentials in plain text
- `--dangerously-skip-permissions` requires careful container setup
- Multi-tenant isolation needs custom implementation

**Scalability:**
- Horizontal scaling patterns not well documented
- Load balancing strategies left to implementers
- Resource quotas require custom logic

**Monitoring:**
- Built-in monitoring exists but limited docs
- Custom observability needs integration
- Multi-agent coordination metrics unclear

---

## 13. Migration Guide

### 13.1 From Claude Code SDK to Agent SDK

**Breaking Changes:**
- Package renamed: `claude-code-sdk` → `claude-agent-sdk`
- Some API method names updated
- Configuration structure evolved

**Migration Resources:**
- Official migration guide in documentation
- Backward compatibility for core features
- Gradual migration path available

### 13.2 Migration Best Practices

1. Start with single-agent deployment
2. Test thoroughly in staging
3. Update MCP server configurations
4. Review permission settings
5. Update monitoring/logging

---

## 14. Future Directions & Trends

### 14.1 Emerging Patterns

**Multi-Agent Systems:**
- Increasing focus on agent coordination
- Swarm intelligence patterns
- Distributed task processing

**Context Engineering:**
- Advanced compaction strategies
- Hybrid search (agentic + vector)
- Long-term memory systems

**Integration Ecosystem:**
- Growing MCP server marketplace
- Standardized agent templates
- Cross-platform agent deployment

### 14.2 Community Momentum

**Active Development:**
- Multiple agent template repositories
- Docker deployment solutions
- Production architecture patterns emerging

**Enterprise Adoption:**
- Financial compliance agents
- Security and audit agents
- Business process automation

---

## 15. Recommended Learning Path

### 15.1 For Beginners

1. **Start with Official Docs**
   - Read Agent SDK overview
   - Follow quick start guide
   - Try examples directory

2. **Build Simple Agent**
   - Use DataCamp tutorial
   - Implement basic tools
   - Test with simple tasks

3. **Explore MCP Integration**
   - Add external MCP server
   - Connect to database
   - Integrate with API

### 15.2 For Advanced Users

1. **Study Production Patterns**
   - Anthropic engineering blog
   - FastAPI server example
   - Multi-agent orchestration

2. **Implement Server Deployment**
   - FastAPI + Agent SDK
   - Docker containerization
   - Session management

3. **Build Multi-Agent System**
   - Subagent patterns
   - Context isolation
   - Orchestrator design

### 15.3 For Enterprise Deployment

1. **Architecture Planning**
   - Multi-tenant design
   - Security considerations
   - Scalability requirements

2. **Infrastructure Setup**
   - Kubernetes/container orchestration
   - Load balancing
   - Monitoring and logging

3. **Production Hardening**
   - Permission policies
   - Rate limiting
   - Error handling

---

## 16. Key Takeaways

### 16.1 Core Insights

1. **SDK Maturity:** Claude Agent SDK is production-ready with robust features for error handling, session management, and context control.

2. **Deployment Flexibility:** Supports multiple authentication methods (API key, Bedrock, Vertex AI) and deployment patterns (in-process, containerized, serverless).

3. **MCP Integration:** Model Context Protocol is essential for connecting to external data sources and services.

4. **Subagent Power:** Parallel processing through subagents is a key scalability pattern.

5. **Community Support:** Strong community creating templates, tools, and deployment examples.

### 16.2 Critical Success Factors

**For Production Deployment:**
- Implement proper permission controls
- Use hooks for dangerous operations
- Monitor context usage and compaction
- Test with representative scenarios
- Iterate based on agent failures

**For Multi-User Systems:**
- Design tenant isolation early
- Implement session management
- Plan for resource quotas
- Monitor per-tenant usage
- Build proper authentication layer

**For Scalability:**
- Use subagent parallelization
- Implement message broker patterns
- Distribute load across instances
- Cache effectively
- Optimize context usage

---

## 17. Resources Summary

### 17.1 Official Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| Agent SDK Docs | https://docs.claude.com/en/api/agent-sdk/overview | API reference |
| Engineering Blog | https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk | Best practices |
| Python SDK | https://github.com/anthropics/claude-agent-sdk-python | Python implementation |
| TypeScript SDK | https://github.com/anthropics/claude-agent-sdk-typescript | TypeScript implementation |
| SDK Demos | https://github.com/anthropics/claude-code-sdk-demos | Example projects |

### 17.2 Community Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| FastAPI Example | https://github.com/e2b-dev/claude-code-fastapi | REST API server |
| awesome-subagents | https://github.com/VoltAgent/awesome-claude-code-subagents | Agent templates |
| Production Agents | https://github.com/wshobson/agents | Enterprise patterns |
| AgentAPI | https://github.com/coder/agentapi | HTTP interface |
| Docker Solutions | https://github.com/VishalJ99/claude-docker | Container deployment |
| ClaudeBox | https://github.com/RchGrav/claudebox | Dev environment |

### 17.3 Tutorials & Guides

| Resource | URL | Purpose |
|----------|-----|---------|
| DataCamp Tutorial | https://www.datacamp.com/tutorial/how-to-use-claude-agent-sdk | Step-by-step guide |
| PromptLayer Blog | https://blog.promptlayer.com/building-agents-with-claude-codes-sdk/ | Implementation guide |
| eesel AI Guide | https://www.eesel.ai/blog/python-claude-code-sdk | Python SDK guide |
| Bind AI Tutorial | https://blog.getbind.co/2025/10/03/how-to-create-agents-with-claude-agents-sdk/ | Agent creation |
| LangChain Guide | https://blog.langchain.com/how-to-turn-claude-code-into-a-domain-specific-coding-agent/ | Domain-specific agents |

---

## 18. Conclusion

The Claude Agent SDK represents a mature, production-ready framework for building autonomous AI agents. While originally focused on coding tasks as Claude Code, it has evolved into a versatile platform capable of powering diverse applications from financial compliance to customer support.

**Key Strengths:**
- Robust production features (error handling, session management, monitoring)
- Flexible deployment options (API key, Bedrock, Vertex AI)
- Powerful context management with automatic compaction
- Strong MCP integration for external services
- Active community creating tools and templates

**Areas for Growth:**
- Multi-user architecture documentation needs expansion
- WebSocket/real-time patterns need official guidance
- Enterprise deployment patterns could be more comprehensive
- Scaling strategies need more official documentation

**Recommendations for Implementation:**

1. **Start Simple:** Begin with in-process MCP tools and basic agent setup
2. **Iterate Based on Needs:** Add external services and complexity gradually
3. **Leverage Community:** Use existing templates and patterns when available
4. **Plan for Scale:** Design multi-tenant isolation and resource management early
5. **Monitor and Optimize:** Use built-in monitoring and optimize context usage

The SDK's foundation on the proven Claude Code harness, combined with growing community support and active development, positions it as a leading choice for building production AI agents in 2025.

---

## Appendix A: Glossary

- **Agent SDK:** Software development kit for building autonomous AI agents
- **MCP:** Model Context Protocol - standard for connecting AI to external systems
- **Subagent:** Isolated agent with specific task and context window
- **Context Compaction:** Automatic summarization to prevent context overflow
- **In-Process MCP Server:** MCP server running in same process as application
- **Agentic Search:** Dynamic on-demand search vs pre-indexed retrieval
- **Hook:** Preprocessing function for tool usage and safety
- **Session:** Persistent conversation context across requests

## Appendix B: Comparison Matrix

### Deployment Options Comparison

| Feature | In-Process SDK | External MCP | Docker | Serverless |
|---------|---------------|--------------|--------|------------|
| Performance | Excellent | Good | Good | Variable |
| Isolation | Process-level | Process-level | Container | Function |
| Complexity | Low | Medium | Medium | High |
| Scalability | Limited | Medium | High | Very High |
| Security | Moderate | Good | Excellent | Excellent |
| Best For | Prototypes | Production | Enterprise | Scale |

### Agent Types Comparison

| Agent Type | Use Case | Complexity | Deployment |
|------------|----------|------------|------------|
| Single Agent | Simple tasks | Low | Any |
| Multi-Agent | Complex workflows | High | Server |
| Subagent | Parallel processing | Medium | In-process |
| Orchestrator | Coordination | High | Dedicated |

---

**Report Compiled By:** Research Agent
**Based On:** 25+ comprehensive web searches and official documentation analysis
**Last Updated:** October 5, 2025
