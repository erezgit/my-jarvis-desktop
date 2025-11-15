import React, { useState, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

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
  sheet_names: string[];
}

interface SpreadsheetViewerProps {
  data: SheetData;
  onCellUpdate: (row: number, col: number, value: string, formula?: string) => void;
}

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    sheetData: CellData[][];
    onCellUpdate: (row: number, col: number, value: string, formula?: string) => void;
    editingCell: { row: number; col: number } | null;
    setEditingCell: (cell: { row: number; col: number } | null) => void;
  };
}

const Cell: React.FC<CellProps> = ({ columnIndex, rowIndex, style, data }) => {
  const { sheetData, onCellUpdate, editingCell, setEditingCell } = data;
  const [inputValue, setInputValue] = useState('');

  const cellData = sheetData[rowIndex]?.[columnIndex];
  const isEditing = editingCell?.row === rowIndex && editingCell?.col === columnIndex;

  const handleDoubleClick = () => {
    setEditingCell({ row: rowIndex, col: columnIndex });
    setInputValue(cellData?.formula || String(cellData?.value || ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleSave = () => {
    const formula = inputValue.startsWith('=') ? inputValue : undefined;
    const value = formula ? inputValue : inputValue;

    onCellUpdate(rowIndex, columnIndex, value, formula);
    setEditingCell(null);
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
    ...style,
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
    overflow: 'hidden'
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
          ...style,
          display: 'flex',
          alignItems: 'center',
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
    <div style={cellStyle} onDoubleClick={handleDoubleClick}>
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

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({ data, onCellUpdate }) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Add header row and column to the data
  const gridData = useMemo(() => {
    const headerRow = Array(data.max_column + 1).fill(null);
    const dataWithHeaders = [headerRow, ...data.data];

    return dataWithHeaders.map((row, rowIndex) => {
      if (rowIndex === 0) return row; // Header row
      return [null, ...row]; // Add header column
    });
  }, [data]);

  const itemData = {
    sheetData: gridData,
    onCellUpdate,
    editingCell,
    setEditingCell
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Spreadsheet info */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{data.sheet_name}</span>
            <span className="mx-2">•</span>
            <span>{data.max_row} rows × {data.max_column} columns</span>
          </div>
          <div className="text-xs text-gray-500">
            Double-click cells to edit • Formulas preserved
          </div>
        </div>
      </div>

      {/* Virtualized grid */}
      <div className="overflow-hidden">
        <Grid
          columnCount={data.max_column + 1}
          columnWidth={120}
          height={600}
          rowCount={data.max_row + 1}
          rowHeight={32}
          itemData={itemData}
          style={{
            border: '1px solid #e5e7eb'
          }}
        >
          {Cell}
        </Grid>
      </div>

      {/* Formula bar */}
      {editingCell && (
        <div className="p-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">
            Cell {String.fromCharCode(65 + editingCell.col - 1)}{editingCell.row}
          </div>
          <div className="font-mono text-sm">
            {gridData[editingCell.row]?.[editingCell.col]?.formula ||
             String(gridData[editingCell.row]?.[editingCell.col]?.value || '')}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 border-t bg-gray-50 text-center">
        <div className="text-sm text-gray-600 space-x-4">
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