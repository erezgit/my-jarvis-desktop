import { Context } from "hono";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger.ts";

interface TokenResponse {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
}

/**
 * Get cumulative token usage for a session by parsing its JSONL file
 * @param c - Hono context
 * @returns JSON response with cumulative token totals
 */
export async function getSessionTokens(c: Context): Promise<Response> {
  const sessionId = c.req.param("sessionId");

  logger.chat.debug("Fetching session tokens for: {sessionId}", { sessionId });

  // Construct JSONL file path
  // Claude Code writes JSONL files to ~/.claude/projects/-workspace/{sessionId}.jsonl
  const claudeHome = process.env.HOME || "/root";
  const jsonlPath = path.join(
    claudeHome,
    ".claude/projects/-workspace",
    `${sessionId}.jsonl`
  );

  logger.chat.debug("JSONL file path: {jsonlPath}", { jsonlPath });

  // Check if file exists
  if (!fs.existsSync(jsonlPath)) {
    logger.chat.warn("Session JSONL file not found: {jsonlPath}", { jsonlPath });
    return c.json({ error: "Session not found", sessionId }, 404);
  }

  try {
    // Parse JSONL file and sum tokens from all assistant messages
    let totalInput = 0;
    let totalOutput = 0;
    let messageCount = 0;

    const fileContent = fs.readFileSync(jsonlPath, "utf-8");
    const lines = fileContent.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Look for assistant messages with token usage data
        if (data.type === "assistant" && data.message?.usage) {
          const usage = data.message.usage;
          totalInput += usage.input_tokens || 0;
          totalOutput += usage.output_tokens || 0;
          messageCount++;
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        logger.chat.debug("Skipping invalid JSON line in JSONL file");
      }
    }

    const totalTokens = totalInput + totalOutput;

    logger.chat.debug(
      "Session tokens calculated: {totalTokens} ({inputTokens} in, {outputTokens} out, {messageCount} messages)",
      { totalTokens, inputTokens: totalInput, outputTokens: totalOutput, messageCount }
    );

    const response: TokenResponse = {
      sessionId,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      totalTokens,
      messageCount,
    };

    return c.json(response);
  } catch (error) {
    logger.chat.error("Error reading session JSONL file: {error}", { error });
    return c.json(
      { error: "Failed to read session tokens", sessionId },
      500
    );
  }
}
