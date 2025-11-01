import { useState, useEffect } from "react";
import type { ConversationSummary } from "../../../shared/types";
import { getHistoriesUrl } from "../config/api";

interface LatestChatResult {
  latestSessionId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the latest chat session ID from conversation history
 * Used to auto-load the most recent conversation on app startup
 */
export function useLatestChat(encodedProjectName?: string): LatestChatResult {
  const [latestSessionId, setLatestSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no encodedProjectName, don't attempt to load
    if (!encodedProjectName) {
      setLoading(false);
      setLatestSessionId(null);
      return;
    }

    const fetchLatestChat = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = getHistoriesUrl(encodedProjectName);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch histories: ${response.statusText}`);
        }

        const data = await response.json();
        const conversations: ConversationSummary[] = data.conversations || [];

        // Conversations are already sorted by newest first (from grouping.ts)
        // Get the first one (most recent)
        if (conversations.length > 0) {
          setLatestSessionId(conversations[0].sessionId);
        } else {
          // No conversations exist yet
          setLatestSessionId(null);
        }
      } catch (err) {
        console.error("Error fetching latest chat:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch latest chat");
        setLatestSessionId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestChat();
  }, [encodedProjectName]);

  return {
    latestSessionId,
    loading,
    error,
  };
}
