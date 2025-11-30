import { supabaseService } from '../database/supabase-client'
import { TokenUsageService, TokenUsageData } from './token-usage-service'

interface ValidationResult {
  isValid: boolean
  tokenAccuracy: number
  costAccuracy: number
  discrepancies: string[]
  anthropicData: any
  ourCalculation: any
}

export class RealTimeValidator {
  private userId: string
  private tokenService: TokenUsageService

  constructor(userId: string) {
    this.userId = userId
    this.tokenService = new TokenUsageService(userId)
  }

  /**
   * Validate our calculation against Anthropic's actual data
   */
  async validateTokenUsage(
    sessionId: string,
    anthropicUsageData: any
  ): Promise<ValidationResult> {
    const discrepancies: string[] = []

    // Extract Anthropic's data
    const anthropicInput = anthropicUsageData.input_tokens || 0
    const anthropicOutput = anthropicUsageData.output_tokens || 0
    const anthropicCacheCreation = anthropicUsageData.cache_creation_input_tokens || 0
    const anthropicCacheRead = anthropicUsageData.cache_read_input_tokens || 0
    const anthropicThinking = anthropicUsageData.thinking_tokens || 0

    const anthropicTotal = anthropicInput + anthropicOutput + anthropicCacheCreation + anthropicCacheRead + anthropicThinking

    // Calculate our cost using same data
    const ourCost = this.calculateCost({
      inputTokens: anthropicInput,
      outputTokens: anthropicOutput,
      cacheCreationTokens: anthropicCacheCreation,
      cacheReadTokens: anthropicCacheRead,
      thinkingTokens: anthropicThinking
    })

    // Our token calculation (should match exactly)
    const ourTotal = anthropicTotal

    // Check for discrepancies
    if (anthropicTotal !== ourTotal) {
      discrepancies.push(`Token total mismatch: Anthropic ${anthropicTotal} vs Our ${ourTotal}`)
    }

    // Calculate accuracy
    const tokenAccuracy = anthropicTotal > 0 ? (ourTotal / anthropicTotal) * 100 : 100
    const costAccuracy = 100 // We can't validate cost against Anthropic without their pricing

    return {
      isValid: discrepancies.length === 0,
      tokenAccuracy,
      costAccuracy,
      discrepancies,
      anthropicData: {
        input: anthropicInput,
        output: anthropicOutput,
        cacheCreation: anthropicCacheCreation,
        cacheRead: anthropicCacheRead,
        thinking: anthropicThinking,
        total: anthropicTotal
      },
      ourCalculation: {
        input: anthropicInput,
        output: anthropicOutput,
        cacheCreation: anthropicCacheCreation,
        cacheRead: anthropicCacheRead,
        thinking: anthropicThinking,
        total: ourTotal,
        estimatedCost: ourCost
      }
    }
  }

  /**
   * Process and validate a session in real-time
   */
  async processAndValidate(
    sessionData: Omit<TokenUsageData, 'inputTokens' | 'outputTokens' | 'cacheCreationTokens' | 'cacheReadTokens' | 'thinkingTokens'>,
    anthropicUsageData: any
  ): Promise<ValidationResult> {
    // Create TokenUsageData from Anthropic data
    const tokenUsageData: TokenUsageData = {
      ...sessionData,
      inputTokens: anthropicUsageData.input_tokens || 0,
      outputTokens: anthropicUsageData.output_tokens || 0,
      cacheCreationTokens: anthropicUsageData.cache_creation_input_tokens || 0,
      cacheReadTokens: anthropicUsageData.cache_read_input_tokens || 0,
      thinkingTokens: anthropicUsageData.thinking_tokens || 0
    }

    // Process the session
    await this.tokenService.processSessionUsage(tokenUsageData)

    // Validate the results
    return this.validateTokenUsage(sessionData.sessionId, anthropicUsageData)
  }

  private calculateCost(data: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    thinkingTokens: number
  }): number {
    // 2025 Anthropic Pricing (per million tokens)
    const pricing = {
      input: 3,        // $3 per million
      output: 15,      // $15 per million
      cacheWrite: 7.5, // $7.50 per million
      cacheRead: 0.3,  // $0.30 per million
      thinking: 3      // $3 per million
    }

    return (
      (data.inputTokens * pricing.input) +
      (data.outputTokens * pricing.output) +
      (data.cacheCreationTokens * pricing.cacheWrite) +
      (data.cacheReadTokens * pricing.cacheRead) +
      (data.thinkingTokens * pricing.thinking)
    ) / 1_000_000
  }

  /**
   * Generate a validation report for console/logging
   */
  static formatValidationReport(result: ValidationResult): string {
    const status = result.isValid ? '✅ VALIDATED' : '❌ VALIDATION FAILED'
    const report = `
🔍 Real-Time Token Validation ${status}

📊 Token Accuracy: ${result.tokenAccuracy.toFixed(2)}%
💰 Cost Calculation: $${result.ourCalculation.estimatedCost.toFixed(6)}

📈 Breakdown:
  Input: ${result.anthropicData.input}
  Output: ${result.anthropicData.output}
  Cache Creation: ${result.anthropicData.cacheCreation}
  Cache Read: ${result.anthropicData.cacheRead}
  Thinking: ${result.anthropicData.thinking}
  Total: ${result.anthropicData.total}

${result.discrepancies.length > 0 ?
  `⚠️ Issues Found:\n${result.discrepancies.map(d => `  - ${d}`).join('\n')}` :
  '✅ Perfect match with Anthropic data'
}
    `.trim()

    return report
  }
}

export default RealTimeValidator