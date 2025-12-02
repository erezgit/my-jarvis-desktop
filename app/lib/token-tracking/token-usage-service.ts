import { supabaseService } from '../database/supabase-client'

export interface TokenUsageData {
  sessionId: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  thinkingTokens: number
  messageCount: number
  sessionStartedAt: string
  model: string
}

export class TokenUsageService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async processSessionUsage(data: TokenUsageData): Promise<void> {
    console.log('[TOKEN_SERVICE] Processing session usage for user:', this.userId)
    console.log('[TOKEN_SERVICE] Session data:', {
      sessionId: data.sessionId,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      total: data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens + data.thinkingTokens
    })

    const cost = this.calculateCost(data)
    const sessionData = this.formatSessionData(data, cost)
    const dailyData = this.formatDailyData(data, cost)

    console.log('[TOKEN_SERVICE] Attempting to save to database...')

    // Use centralized service with retry logic
    await supabaseService.withRetry(async () => {
      const { error } = await supabaseService.db.rpc('upsert_token_usage', {
        session_data: sessionData,
        daily_data: dailyData
      })

      if (error) {
        console.error('[TOKEN_SERVICE] Database error:', error)
        throw new Error(`Token tracking failed: ${error.message}`)
      }

      console.log('[TOKEN_SERVICE] Successfully saved to database')
    })
  }

  private calculateCost(data: TokenUsageData): number {
    // Updated pricing for different token types (per million tokens)
    const pricing = {
      input: 3,          // $3 per million
      output: 15,        // $15 per million
      cacheWrite: 3.75,  // $3.75 per million (125% of input cost)
      cacheRead: 0.30,   // $0.30 per million (90% discount)
      thinking: 3        // $3 per million
    }

    return (
      (data.inputTokens * pricing.input) +
      (data.outputTokens * pricing.output) +
      (data.cacheCreationTokens * pricing.cacheWrite) +
      (data.cacheReadTokens * pricing.cacheRead) +
      (data.thinkingTokens * pricing.thinking)
    ) / 1_000_000
  }

  private formatSessionData(data: TokenUsageData, cost: number) {
    return {
      user_id: this.userId,
      session_id: data.sessionId,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      cache_creation_tokens: data.cacheCreationTokens,
      cache_read_tokens: data.cacheReadTokens,
      thinking_tokens: data.thinkingTokens,
      message_count: data.messageCount,
      session_started_at: data.sessionStartedAt,
      estimated_cost_usd: cost.toFixed(6),
      model_used: data.model
    }
  }

  private formatDailyData(data: TokenUsageData, cost: number) {
    const today = new Date().toISOString().split('T')[0]
    return {
      user_id: this.userId,
      usage_date: today,
      daily_input_tokens: data.inputTokens,
      daily_output_tokens: data.outputTokens,
      daily_cache_creation_tokens: data.cacheCreationTokens,
      daily_cache_read_tokens: data.cacheReadTokens,
      daily_thinking_tokens: data.thinkingTokens,
      daily_message_count: data.messageCount,
      daily_cost_usd: cost.toFixed(6)
    }
  }
}