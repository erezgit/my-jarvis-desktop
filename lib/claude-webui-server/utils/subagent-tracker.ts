/**
 * Subagent Tracker - Comprehensive tracking system for subagent tool calls
 * Adapted from claude-agent-sdk-demos/research-agent (MIT License)
 * Ticket #107 - Multi-Agent Orchestrator System
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger.ts';

export interface ToolCallRecord {
  timestamp: string;
  tool_name: string;
  tool_input: Record<string, any>;
  tool_use_id: string;
  subagent_type: string;
  parent_tool_use_id?: string;
  tool_output?: any;
  error?: string;
}

export interface SubagentSession {
  subagent_type: string;
  parent_tool_use_id: string;
  spawned_at: string;
  description: string;
  prompt_preview: string;
  subagent_id: string; // e.g., "TICKET-WORKER-1"
  tool_calls: ToolCallRecord[];
}

/**
 * Tracks all tool calls made by subagents using hooks and message stream parsing
 *
 * This tracker:
 * 1. Monitors the message stream to detect subagent spawns via Task tool
 * 2. Uses hooks (PreToolUse/PostToolUse) to capture all tool invocations
 * 3. Associates tool calls with their originating subagent
 * 4. Logs tool usage to JSONL files
 */
export class SubagentTracker {
  private sessions: Map<string, SubagentSession> = new Map();
  private tool_call_records: Map<string, ToolCallRecord> = new Map();
  private current_parent_id: string | null = null;
  private subagent_counters: Map<string, number> = new Map();
  private tool_log_stream: fs.WriteStream | null = null;

  constructor(session_dir?: string) {
    if (session_dir) {
      // Ensure session directory exists
      fs.mkdirSync(session_dir, { recursive: true });

      // Open JSONL log file for tool calls
      const tool_log_path = path.join(session_dir, 'tool_calls.jsonl');
      this.tool_log_stream = fs.createWriteStream(tool_log_path, { flags: 'a' });

      logger.agent.info('[SubagentTracker] Initialized with session directory: {dir}', {
        dir: session_dir,
        log_file: tool_log_path
      });
    }
  }

  /**
   * Register a new subagent spawn detected from the message stream
   */
  registerSubagentSpawn(
    tool_use_id: string,
    subagent_type: string,
    description: string,
    prompt: string
  ): string {
    // Increment counter for this subagent type
    const count = (this.subagent_counters.get(subagent_type) || 0) + 1;
    this.subagent_counters.set(subagent_type, count);

    const subagent_id = `${subagent_type.toUpperCase()}-${count}`;

    const session: SubagentSession = {
      subagent_type,
      parent_tool_use_id: tool_use_id,
      spawned_at: new Date().toISOString(),
      description,
      prompt_preview: prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt,
      subagent_id,
      tool_calls: []
    };

    this.sessions.set(tool_use_id, session);

    logger.agent.info('='.repeat(60));
    logger.agent.info('🚀 SUBAGENT SPAWNED: {id}', { id: subagent_id });
    logger.agent.info('='.repeat(60));
    logger.agent.info('Task: {task}', { task: description });
    logger.agent.info('='.repeat(60));

    return subagent_id;
  }

  /**
   * Update the current execution context from message stream
   */
  setCurrentContext(parent_tool_use_id: string | null) {
    this.current_parent_id = parent_tool_use_id;
  }

  /**
   * Format tool input for human-readable logging
   */
  private formatToolInput(tool_input: Record<string, any>, max_length: number = 100): string {
    if (!tool_input) return '';

    // WebSearch: show query
    if (tool_input.query) {
      const query = String(tool_input.query);
      return `query='${query.length <= max_length ? query : query.substring(0, max_length) + '...'}'`;
    }

    // Write: show file path and content size
    if (tool_input.file_path && tool_input.content) {
      const filename = path.basename(tool_input.file_path);
      return `file='${filename}' (${tool_input.content.length} chars)`;
    }

    // Read/Glob: show path or pattern
    if (tool_input.file_path) {
      return `path='${tool_input.file_path}'`;
    }
    if (tool_input.pattern) {
      return `pattern='${tool_input.pattern}'`;
    }

    // Task: show subagent spawn
    if (tool_input.subagent_type) {
      return `spawn=${tool_input.subagent_type} (${tool_input.description || ''})`;
    }

    // Fallback: generic (truncated)
    const str = JSON.stringify(tool_input);
    return str.length <= max_length ? str : str.substring(0, max_length) + '...';
  }

  /**
   * Write structured log entry to JSONL file
   */
  private logToJsonl(log_entry: Record<string, any>) {
    if (this.tool_log_stream) {
      this.tool_log_stream.write(JSON.stringify(log_entry) + '\n');
    }
  }

  /**
   * Hook callback for PreToolUse events - captures tool calls
   */
  preToolUse = async (hook_input: any, tool_use_id: string, context: any) => {
    const tool_name = hook_input.tool_name;
    const tool_input = hook_input.tool_input;
    const timestamp = new Date().toISOString();

    // Determine agent context
    const is_subagent = this.current_parent_id && this.sessions.has(this.current_parent_id);

    if (is_subagent && this.current_parent_id) {
      const session = this.sessions.get(this.current_parent_id)!;
      const agent_id = session.subagent_id;
      const agent_type = session.subagent_type;

      // Create and store record for subagent
      const record: ToolCallRecord = {
        timestamp,
        tool_name,
        tool_input,
        tool_use_id,
        subagent_type: agent_type,
        parent_tool_use_id: this.current_parent_id
      };

      session.tool_calls.push(record);
      this.tool_call_records.set(tool_use_id, record);

      // Log
      const input_detail = this.formatToolInput(tool_input);
      logger.agent.info('[{agent}] → {tool} {input}', {
        agent: agent_id,
        tool: tool_name,
        input: input_detail ? `(${input_detail})` : ''
      });

      this.logToJsonl({
        event: 'tool_call_start',
        timestamp,
        tool_use_id,
        agent_id,
        agent_type,
        tool_name,
        tool_input,
        parent_tool_use_id: this.current_parent_id
      });
    } else if (tool_name !== 'Task') {
      // Main agent tool call (skip Task calls, handled by spawn message)
      const input_detail = this.formatToolInput(tool_input);
      logger.agent.info('[MAIN AGENT] → {tool} {input}', {
        tool: tool_name,
        input: input_detail ? `(${input_detail})` : ''
      });

      this.logToJsonl({
        event: 'tool_call_start',
        timestamp,
        tool_use_id,
        agent_id: 'MAIN_AGENT',
        agent_type: 'lead',
        tool_name,
        tool_input
      });
    }

    return { continue: true };
  };

  /**
   * Hook callback for PostToolUse events - captures tool results
   */
  postToolUse = async (hook_input: any, tool_use_id: string, context: any) => {
    const tool_response = hook_input.tool_response;
    const record = this.tool_call_records.get(tool_use_id);

    if (!record) {
      return { continue: true };
    }

    // Update record with output
    record.tool_output = tool_response;

    // Check for errors
    const error = (typeof tool_response === 'object' && tool_response?.error) || null;
    if (error) {
      record.error = error;
      const session = this.sessions.get(record.parent_tool_use_id!);
      if (session) {
        logger.agent.warn('[{agent}] Tool {tool} error: {error}', {
          agent: session.subagent_id,
          tool: record.tool_name,
          error
        });
      }
    }

    // Get agent info for logging
    const session = this.sessions.get(record.parent_tool_use_id!);
    const agent_id = session ? session.subagent_id : 'MAIN_AGENT';
    const agent_type = session ? session.subagent_type : 'lead';

    // Log completion to JSONL
    this.logToJsonl({
      event: 'tool_call_complete',
      timestamp: new Date().toISOString(),
      tool_use_id,
      agent_id,
      agent_type,
      tool_name: record.tool_name,
      success: error === null,
      error,
      output_size: tool_response ? String(tool_response).length : 0
    });

    return { continue: true };
  };

  /**
   * Get all subagent sessions
   */
  getAllSessions(): SubagentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session for a specific tool use ID
   */
  getSession(tool_use_id: string): SubagentSession | undefined {
    return this.sessions.get(tool_use_id);
  }

  /**
   * Close the tracker and flush logs
   */
  close() {
    if (this.tool_log_stream) {
      this.tool_log_stream.end();
      this.tool_log_stream = null;
    }
  }
}
