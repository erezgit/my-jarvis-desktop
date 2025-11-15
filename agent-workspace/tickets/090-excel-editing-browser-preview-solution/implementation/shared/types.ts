/**
 * Shared TypeScript types for Excel Editor
 * Used by both frontend and backend (when compiled to Python)
 */

// Core data structures
export interface CellData {
  value: any;
  formula?: string;
  data_type: 'n' | 's' | 'f' | 'd' | 'b' | 'e'; // number, string, formula, date, boolean, error
  coordinate: string;
  font?: {
    name: string;
    size: number;
    bold: boolean;
    italic: boolean;
    color?: string;
  };
  fill_color?: string;
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    color?: string;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
}

export interface SheetData {
  sheet_name: string;
  data: CellData[][];
  max_row: number;
  max_column: number;
  sheet_names: string[];
  active_cell?: string;
  selected_range?: string;
}

export interface WorkbookInfo {
  filename: string;
  file_size: number;
  created_date: string;
  modified_date: string;
  sheet_count: number;
  has_macros: boolean;
}

// API request/response types
export interface UploadResponse {
  session_id: string;
  filename: string;
  file_path: string;
  sheets: string[];
  workbook_info: WorkbookInfo;
}

export interface UpdateCellRequest {
  sheet_name: string;
  row: number;
  col: number;
  value: string;
  formula?: string;
}

export interface UpdateCellResponse {
  success: boolean;
  updated_cell?: CellData;
  affected_cells?: string[]; // Cells that were recalculated
  error?: string;
}

export interface SheetAnalysis {
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, string>;
  null_counts: Record<string, number>;
  summary_stats: Record<string, any>;
  data_quality: {
    completeness: number;
    consistency: number;
    validity: number;
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'ping' | 'pong' | 'file_changed' | 'cell_update' | 'error' | 'connection_status';
  data?: any;
  timestamp?: number;
}

export interface FileChangeMessage extends WebSocketMessage {
  type: 'file_changed';
  data: {
    path: string;
    change_type: 'created' | 'modified' | 'deleted';
    session_id: string;
  };
}

export interface CellUpdateMessage extends WebSocketMessage {
  type: 'cell_update';
  data: {
    sheet_name: string;
    row: number;
    col: number;
    value: any;
    formula?: string;
    session_id: string;
  };
}

// Error types
export interface ApiError {
  detail: string;
  code?: string;
  timestamp?: string;
}

export interface ValidationError extends ApiError {
  field?: string;
  invalid_value?: any;
}

// Session management
export interface SessionData {
  sessionId: string;
  filename: string;
  sheets: string[];
  currentSheet: string;
  uploadTime: number;
  lastActivity: number;
  workbook_info: WorkbookInfo;
}

// UI state types
export interface SpreadsheetState {
  data: SheetData | null;
  loading: boolean;
  error: string | null;
  editingCell: { row: number; col: number } | null;
  selectedRange: { start: { row: number; col: number }; end: { row: number; col: number } } | null;
  scrollPosition: { top: number; left: number };
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  lastPing: number;
  latency: number;
}

// File processing types
export interface ProcessingOptions {
  preserve_formatting: boolean;
  calculate_formulas: boolean;
  include_charts: boolean;
  include_pivot_tables: boolean;
  max_rows?: number;
  max_columns?: number;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json' | 'html';
  sheets?: string[];
  range?: string;
  include_formatting: boolean;
}

// Security types
export interface FileValidationResult {
  is_valid: boolean;
  error_message?: string;
  warnings?: string[];
  file_info: {
    size: number;
    mime_type: string;
    extension: string;
    is_encrypted: boolean;
  };
}

// Performance monitoring
export interface PerformanceMetrics {
  upload_time: number;
  processing_time: number;
  render_time: number;
  memory_usage: number;
  cell_count: number;
}

// Configuration types
export interface BackendConfig {
  max_file_size: number;
  allowed_extensions: string[];
  upload_dir: string;
  session_timeout: number;
  enable_file_watching: boolean;
}

export interface FrontendConfig {
  api_url: string;
  ws_url: string;
  max_viewport_cells: number;
  auto_save_interval: number;
  enable_virtualization: boolean;
}