/**
 * Global voice playback tracker to prevent duplicate audio playback
 *
 * This singleton ensures voice messages are only played once, even when
 * React components unmount/remount (e.g., view switches, page navigation).
 *
 * Fixes the bug where voice messages replay when:
 * - Switching between desktop and mobile views
 * - Navigating between pages (chat → file directory → back to chat)
 * - Any component remount that causes chat components to unmount/remount
 */
class VoicePlayedTracker {
  private playedMessages: Set<string> = new Set();
  private playingMessages: Set<string> = new Set();

  /**
   * Check if a message has already been played or is currently playing
   */
  hasPlayed(messageId: string): boolean {
    const result = this.playedMessages.has(messageId) || this.playingMessages.has(messageId);
    console.log('[VoicePlayedTracker] hasPlayed check for:', messageId);
    console.log('[VoicePlayedTracker] - In played set?', this.playedMessages.has(messageId));
    console.log('[VoicePlayedTracker] - In playing set?', this.playingMessages.has(messageId));
    console.log('[VoicePlayedTracker] - Result:', result);
    return result;
  }

  /**
   * Mark a message as currently playing
   */
  markAsPlaying(messageId: string): void {
    console.log('[VoicePlayedTracker] Marking as playing:', messageId);
    this.playingMessages.add(messageId);
  }

  /**
   * Mark a message as finished playing
   */
  markAsPlayed(messageId: string): void {
    console.log('[VoicePlayedTracker] Marking as played:', messageId);
    this.playingMessages.delete(messageId);
    this.playedMessages.add(messageId);
  }

  /**
   * Mark a message as failed to play (allows retry)
   */
  markAsFailed(messageId: string): void {
    console.log('[VoicePlayedTracker] Marking as failed (allowing retry):', messageId);
    this.playingMessages.delete(messageId);
    // Don't add to playedMessages so it can be retried
  }

  /**
   * Clear tracking for a specific message
   */
  clear(messageId: string): void {
    this.playedMessages.delete(messageId);
    this.playingMessages.delete(messageId);
  }

  /**
   * Clear all tracking (useful when switching conversations/threads)
   */
  clearAll(): void {
    console.log('[VoicePlayedTracker] Clearing all tracking');
    this.playedMessages.clear();
    this.playingMessages.clear();
  }

  /**
   * Get current state for debugging
   */
  getState(): { played: string[], playing: string[] } {
    return {
      played: Array.from(this.playedMessages),
      playing: Array.from(this.playingMessages)
    };
  }
}

// Export singleton instance
export const voicePlayedTracker = new VoicePlayedTracker();
