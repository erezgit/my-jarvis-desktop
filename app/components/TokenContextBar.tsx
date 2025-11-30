import React, { useState } from 'react'

interface TokenContextBarProps {
  // No longer needs messages prop
}

export function TokenContextBar({}: TokenContextBarProps) {
  // Static display until proper implementation
  const tokenUsage = null; // Always show zero
  const [isExpanded, setIsExpanded] = useState(false)

  const context = {
    tokens_used: 0,
    max_tokens: 200000,
    percentage: 0
  }

  // Calculate gradient color based on percentage (shadcn color system)
  const getGradientStyle = (percentage: number) => {
    if (percentage < 25) {
      // Blue progression - low usage (good)
      return 'from-blue-100 to-blue-200'
    } else if (percentage < 50) {
      // Blue to violet transition - moderate usage
      return 'from-blue-200 to-violet-200'
    } else if (percentage < 75) {
      // Violet progression - higher usage (caution)
      return 'from-violet-200 to-violet-300'
    } else if (percentage < 90) {
      // Violet to amber transition - high usage (warning)
      return 'from-violet-300 to-amber-200'
    } else {
      // Amber to red - critical usage (alert)
      return 'from-amber-300 to-red-300'
    }
  }

  const percentage = context.percentage || 0
  const gradientClass = getGradientStyle(percentage)

  // Format numbers for display
  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${Math.round(num / 1000)}K`
    return num.toString()
  }

  return (
    <div className="w-full bg-background/95 backdrop-blur">
      {/* Clickable progress bar area */}
      <div
        className="py-4 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Progress bar - always visible */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          {/* Gradient fill */}
          <div
            className={`absolute left-0 top-0 h-full bg-gradient-to-r ${gradientClass} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.25,1)] rounded-full`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Expandable details section */}
      {isExpanded && (
        <div className="pb-2 animate-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">
              {percentage.toFixed(1)}% used
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTokens(context.tokens_used)} / {formatTokens(context.max_tokens)} tokens
            </span>
          </div>

          {/* Token breakdown when cache data is available */}
          {(context.cacheReadTokens || context.cacheCreationTokens) && (
            <div className="text-xs text-muted-foreground mt-1">
              Cache: {formatTokens((context.cacheReadTokens || 0) + (context.cacheCreationTokens || 0))} tokens
              {context.inputTokens && context.outputTokens && (
                <span className="ml-2">
                  | New: {formatTokens(context.inputTokens)} in + {formatTokens(context.outputTokens)} out
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
