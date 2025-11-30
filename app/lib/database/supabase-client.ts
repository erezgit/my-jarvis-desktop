import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

class SupabaseService {
  private static instance: SupabaseService

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService()
    }
    return SupabaseService.instance
  }

  // 2025 Best Practice: Create new client per operation
  createClient() {
    return createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: { persistSession: false }, // Backend doesn't need session persistence
        db: { schema: 'public' },
        global: {
          headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY! }
        }
      }
    )
  }

  // Centralized error handling with retry logic
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Exponential backoff
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Operation failed after ${maxRetries} retries: ${lastError!.message}`)
  }

  get db() {
    return this.createClient()
  }
}

export const supabaseService = SupabaseService.getInstance()