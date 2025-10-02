import type { ThinkingMessage } from "../types";

// Browser-compatible path.basename implementation
function basename(filePath: string): string {
  return filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
}

interface ThinkingPattern {
  toolName: string;
  pattern: RegExp;
  messageTemplate: (matches: RegExpMatchArray, input: any) => string;
}

const THINKING_PATTERNS: ThinkingPattern[] = [
  {
    toolName: "Read",
    pattern: /.*/,
    messageTemplate: (_, input) => {
      const filename = basename(input.file_path || "unknown");
      return `Reading - ${filename}`;
    }
  },
  {
    toolName: "Glob",
    pattern: /tickets/,
    messageTemplate: () => "Searching - tickets"
  },
  {
    toolName: "Glob",
    pattern: /\*\*\/\*/,
    messageTemplate: () => "Scanning - project files"
  },
  {
    toolName: "Bash",
    pattern: /ls -la/,
    messageTemplate: () => "Exploring - workspace structure"
  }
];

export function generateThinkingMessage(
  toolName: string,
  toolInput: Record<string, unknown>,
  timestamp: number
): ThinkingMessage | null {
  const command = toolInput.command as string || "";
  const filePath = toolInput.file_path as string || "";
  const pattern = toolInput.pattern as string || "";

  // Create search string combining all relevant data
  const searchString = `${command} ${filePath} ${pattern}`.toLowerCase();

  for (const thinkingPattern of THINKING_PATTERNS) {
    if (thinkingPattern.toolName === toolName) {
      const match = searchString.match(thinkingPattern.pattern);
      if (match) {
        return {
          type: "thinking",
          content: thinkingPattern.messageTemplate(match, toolInput),
          timestamp
        };
      }
    }
  }

  return null;
}