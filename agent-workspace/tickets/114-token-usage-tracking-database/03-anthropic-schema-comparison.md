# Anthropic Console Data Analysis & Schema Comparison

## 🎯 Executive Summary

Analysis of real Anthropic console billing data reveals significant insights for improving our token tracking system. **83.4% of tokens are cache reads**, showing massive cache optimization. Total usage: **610,334 tokens** costing **$0.80** in just one hour.

## 📊 Key Findings

### Current Hour Usage (2025-11-28 15:00-16:00 UTC)
- **Total Tokens**: 610,334
- **Estimated Cost**: $0.80
- **Cache Read Percentage**: 83.4%
- **Models Used**: Claude Haiku 4.5 & Claude Sonnet 4.5
- **Records**: 21 minute-level entries

### Token Breakdown
```
Input (No Cache):     35,844 tokens  (5.9%)
Input (Cache Write):  58,196 tokens  (9.5%)
Input (Cache Read):  508,912 tokens (83.4%)
Output:                7,382 tokens  (1.2%)
─────────────────────────────────────────
TOTAL:               610,334 tokens (100%)
```

## 🏗️ Schema Comparison: Our System vs Anthropic

### ✅ What We Track Correctly
| Field | Our Name | Anthropic Name | Match |
|-------|----------|---------------|-------|
| Input tokens | `input_tokens` | `usage_input_tokens_no_cache` | ✅ |
| Output tokens | `output_tokens` | `usage_output_tokens` | ✅ |
| Cache read | `cache_read_tokens` | `usage_input_tokens_cache_read` | ✅ |
| User ID | `user_id` | - | ✅ |
| Session ID | `session_id` | - | ✅ |
| Timestamps | `session_started_at`, `last_updated_at` | `usage_date_utc` | ✅ |

### ⚠️ What We're Missing

#### Critical Missing Fields
1. **API Key Tracking** (`api_key`)
   - Impact: Can't track usage by different API keys
   - Use Case: Multi-application environments

2. **Cache Window Separation**
   - Anthropic: `usage_input_tokens_cache_write_5m` vs `usage_input_tokens_cache_write_1h`
   - Our System: Combined `cache_creation_tokens`
   - Impact: Can't optimize for different cache windows

3. **Web Search Count** (`web_search_count`)
   - Impact: Missing web search usage analytics
   - Cost Impact: Web searches may have different pricing

4. **Context Window Tracking** (`context_window`)
   - Impact: Can't analyze context window usage patterns
   - Optimization: Can't optimize for different context sizes

5. **Workspace Organization** (`workspace`)
   - Impact: No organizational grouping
   - Use Case: Team/project segregation

#### Aggregation Differences
- **Anthropic**: Minute-level aggregation
- **Our System**: Session-level aggregation
- **Impact**: Different granularity for analytics

### 📈 Performance Insights

#### Cache Efficiency
- **83.4% cache reads** = Massive performance optimization
- **Cache write ratio**: 5m cache vs 1h cache usage patterns
- **Cost savings**: Cache reads are 50x cheaper than regular input

#### Model Usage Patterns
```
Claude Haiku 4.5: 25,459 input + 2,888 output = 28,347 tokens (46% of non-cache)
Claude Sonnet 4.5: 68,581 input + 4,494 output = 73,075 tokens (54% of non-cache)
```

## 🚀 Recommended Schema Improvements

### Phase 1: Enhanced Token Tracking

Add to `token_usage_sessions` table:
```sql
ALTER TABLE token_usage_sessions
ADD COLUMN api_key TEXT,
ADD COLUMN workspace TEXT DEFAULT 'default',
ADD COLUMN context_window TEXT,
ADD COLUMN cache_creation_5m_tokens INTEGER DEFAULT 0,
ADD COLUMN cache_creation_1h_tokens INTEGER DEFAULT 0,
ADD COLUMN web_search_count INTEGER DEFAULT 0;

-- Update existing cache_creation_tokens to be backward compatible
-- Split between 5m and 1h based on patterns or default to 5m
```

### Phase 2: Minute-Level Aggregation Table

```sql
CREATE TABLE token_usage_minutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  api_key TEXT NOT NULL,
  workspace TEXT NOT NULL DEFAULT 'default',
  usage_minute TIMESTAMPTZ NOT NULL,

  -- Detailed token breakdown matching Anthropic
  input_tokens_no_cache INTEGER DEFAULT 0,
  input_tokens_cache_write_5m INTEGER DEFAULT 0,
  input_tokens_cache_write_1h INTEGER DEFAULT 0,
  input_tokens_cache_read INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  web_search_count INTEGER DEFAULT 0,

  -- Model and context info
  model_used TEXT,
  context_window TEXT,
  usage_type TEXT DEFAULT 'standard',

  -- Computed total
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens_no_cache + input_tokens_cache_write_5m +
    input_tokens_cache_write_1h + input_tokens_cache_read + output_tokens
  ) STORED,

  -- Cost calculation
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0.00,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, api_key, usage_minute)
);
```

### Phase 3: Enhanced Analytics Views

```sql
-- Cache efficiency view
CREATE VIEW cache_efficiency_stats AS
SELECT
  date_trunc('day', usage_minute) as usage_date,
  user_id,
  api_key,
  SUM(input_tokens_cache_read) as total_cache_reads,
  SUM(input_tokens_no_cache + input_tokens_cache_write_5m + input_tokens_cache_write_1h) as total_new_tokens,
  (SUM(input_tokens_cache_read)::float / NULLIF(SUM(total_tokens), 0) * 100) as cache_hit_percentage
FROM token_usage_minutes
GROUP BY date_trunc('day', usage_minute), user_id, api_key;

-- Model usage comparison
CREATE VIEW model_usage_stats AS
SELECT
  model_used,
  COUNT(*) as requests,
  SUM(total_tokens) as total_tokens,
  AVG(total_tokens) as avg_tokens_per_request,
  SUM(estimated_cost_usd) as total_cost
FROM token_usage_minutes
WHERE model_used IS NOT NULL
GROUP BY model_used;
```

## 🎯 Validation Strategy

### Cross-Reference Approach
1. **Export console CSV data** (like this file)
2. **Compare minute-level aggregations** with our session-level data
3. **Validate cache read percentages** match expected patterns
4. **Check model usage distributions**

### Implementation Plan
1. ✅ **Current system works** - keep as foundation
2. 📋 **Phase 1**: Add missing fields to existing tables
3. 📊 **Phase 2**: Implement minute-level tracking
4. 🔄 **Phase 3**: Build validation reports against console exports
5. 📈 **Phase 4**: Advanced analytics and optimization insights

## 💡 Business Impact

### Cost Optimization
- **Cache tracking** reveals 50x cost savings opportunities
- **Model selection** data shows cost vs performance tradeoffs
- **Context window** optimization potential

### Usage Analytics
- **API key tracking** enables multi-application billing
- **Workspace segregation** supports team analytics
- **Minute-level data** enables peak usage analysis

### Validation Confidence
- **Console exports** provide authoritative validation source
- **Multiple aggregation levels** ensure data integrity
- **Real-time validation** against Anthropic's own billing system

---

**Recommendation**: Implement Phase 1 improvements immediately, then build toward full minute-level tracking to match Anthropic's billing granularity.