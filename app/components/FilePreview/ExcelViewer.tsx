import React, { useState, useMemo, useEffect } from 'react';
import { Virtualizer } from '@tanstack/react-virtual';

interface CellData {
  value: any;
  formula?: string;
  data_type: string;
  coordinate: string;
  font?: {
    name: string;
    size: number;
    bold: boolean;
    italic: boolean;
  };
  fill_color?: string;
}

interface SheetData {
  sheet_name: string;
  data: CellData[][];
  max_row: number;
  max_column: number;
  sheet_names?: string[];
}

interface ExcelViewerProps {
  filePath: string;
  fileName: string;
  className?: string;
}

interface CellProps {
  rowIndex: number;
  columnIndex: number;
  cellData?: CellData;
  isEditing: boolean;
  onDoubleClick: () => void;
  onCellUpdate: (value: string, formula?: string) => void;
  onEditingChange: (editing: boolean) => void;
}

const Cell: React.FC<CellProps> = ({
  rowIndex,
  columnIndex,
  cellData,
  isEditing,
  onDoubleClick,
  onCellUpdate,
  onEditingChange
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onEditingChange(false);
    }
  };

  const handleSave = () => {
    const formula = inputValue.startsWith('=') ? inputValue : undefined;
    const value = formula ? inputValue : inputValue;
    onCellUpdate(value, formula);
    onEditingChange(false);
  };

  const handleBlur = () => {
    handleSave();
  };

  // Format cell value for display
  const displayValue = useMemo(() => {
    if (!cellData) return '';

    const value = cellData.value;
    if (value === null || value === undefined) return '';

    // Handle different data types
    switch (cellData.data_type) {
      case 'n': // Number
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'd': // Date
        return value instanceof Date ? value.toLocaleDateString() : value;
      case 'f': // Formula
        return cellData.formula || value;
      default:
        return String(value);
    }
  }, [cellData]);

  // Cell styling based on Excel formatting
  const cellStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    backgroundColor: cellData?.fill_color ? `#${cellData.fill_color}` : 'white',
    fontSize: cellData?.font?.size ? `${cellData.font.size}px` : '14px',
    fontWeight: cellData?.font?.bold ? 'bold' : 'normal',
    fontStyle: cellData?.font?.italic ? 'italic' : 'normal',
    fontFamily: cellData?.font?.name || 'system-ui',
    cursor: 'cell',
    overflow: 'hidden',
    minHeight: '32px',
    width: '120px'
  };

  // Header cells (row 0 or column 0)
  if (rowIndex === 0 || columnIndex === 0) {
    const isCorner = rowIndex === 0 && columnIndex === 0;
    const headerLabel = isCorner
      ? ''
      : rowIndex === 0
        ? String.fromCharCode(65 + columnIndex - 1) // A, B, C...
        : String(rowIndex);

    return (
      <div
        style={{
          ...cellStyle,
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #d1d5db',
          fontWeight: 'bold',
          fontSize: '12px',
          color: '#6b7280'
        }}
      >
        {headerLabel}
      </div>
    );
  }

  return (
    <div style={cellStyle} onDoubleClick={onDoubleClick}>
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'inherit',
            fontFamily: 'inherit'
          }}
        />
      ) : (
        <span title={cellData?.formula ? `Formula: ${cellData.formula}` : undefined}>
          {displayValue}
        </span>
      )}
    </div>
  );
};

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ filePath, fileName, className = "" }) => {
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    loadExcelFile();
  }, [filePath]);

  const loadExcelFile = async () => {
    setLoading(true);
    setError(null);

    try {
      // For now, we'll create a mock data structure
      // In production, this would make an API call to process the Excel file
      const mockData: SheetData = {
        sheet_name: "Sheet1",
        max_row: 20,
        max_column: 10,
        data: Array(20).fill(null).map((_, rowIndex) =>
          Array(10).fill(null).map((_, colIndex) => ({
            value: `Cell ${rowIndex + 1}-${colIndex + 1}`,
            data_type: 's',
            coordinate: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
          }))
        )
      };

      setSheetData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleCellUpdate = (row: number, col: number, value: string, formula?: string) => {
    if (!sheetData) return;

    const newData = { ...sheetData };
    if (!newData.data[row]) newData.data[row] = [];

    newData.data[row][col] = {
      ...newData.data[row][col],
      value: formula ? '=' + value.substring(1) : value,
      formula: formula,
      data_type: formula ? 'f' : 's'
    };

    setSheetData(newData);
  };

  if (loading) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading Excel file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
        <div className="text-center text-red-500">
          <p className="text-lg mb-2">❌ Error loading Excel file</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!sheetData) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">📊 No data available</p>
          <p className="text-sm">Unable to read Excel file content</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{fileName}</span>
            <span className="mx-2">•</span>
            <span>{sheetData.sheet_name}</span>
            <span className="mx-2">•</span>
            <span>{sheetData.max_row} rows × {sheetData.max_column} columns</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            📊 Excel Preview • Double-click to edit cells
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border rounded-lg shadow-sm">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${sheetData.max_column + 1}, 120px)`,
              gap: '0'
            }}
          >
            {/* Render grid cells */}
            {Array.from({ length: sheetData.max_row + 1 }).map((_, rowIndex) =>
              Array.from({ length: sheetData.max_column + 1 }).map((_, columnIndex) => {
                const cellData = rowIndex === 0 || columnIndex === 0
                  ? undefined
                  : sheetData.data[rowIndex - 1]?.[columnIndex - 1];

                const isEditing = editingCell?.row === rowIndex && editingCell?.col === columnIndex;

                return (
                  <Cell
                    key={`${rowIndex}-${columnIndex}`}
                    rowIndex={rowIndex}
                    columnIndex={columnIndex}
                    cellData={cellData}
                    isEditing={isEditing}
                    onDoubleClick={() => setEditingCell({ row: rowIndex, col: columnIndex })}
                    onCellUpdate={(value, formula) => handleCellUpdate(rowIndex - 1, columnIndex - 1, value, formula)}
                    onEditingChange={(editing) => setEditingCell(editing ? { row: rowIndex, col: columnIndex } : null)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Formula bar */}
      {editingCell && editingCell.row > 0 && editingCell.col > 0 && (
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Cell {String.fromCharCode(65 + editingCell.col - 1)}{editingCell.row}
          </div>
          <div className="font-mono text-sm text-gray-800 dark:text-gray-200">
            {sheetData.data[editingCell.row - 1]?.[editingCell.col - 1]?.formula ||
             String(sheetData.data[editingCell.row - 1]?.[editingCell.col - 1]?.value || '')}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
          <span>💡 <strong>Tips:</strong></span>
          <span>Double-click to edit</span>
          <span>•</span>
          <span>Enter to save</span>
          <span>•</span>
          <span>Esc to cancel</span>
          <span>•</span>
          <span>Start with = for formulas</span>
        </div>
      </div>
    </div>
  );
};