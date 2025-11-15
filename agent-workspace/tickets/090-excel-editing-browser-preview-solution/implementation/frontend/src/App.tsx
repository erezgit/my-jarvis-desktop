import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { SpreadsheetViewer } from './components/SpreadsheetViewer';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ExcelService } from './services/ExcelService';
import { WebSocketService } from './services/WebSocketService';
import './App.css';

interface SessionData {
  sessionId: string;
  filename: string;
  sheets: string[];
  currentSheet: string;
}

function App() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsService = useRef<WebSocketService | null>(null);

  // Initialize WebSocket connection when session is created
  useEffect(() => {
    if (session?.sessionId && !wsService.current) {
      wsService.current = new WebSocketService(session.sessionId);

      wsService.current.onConnect = () => setWsConnected(true);
      wsService.current.onDisconnect = () => setWsConnected(false);
      wsService.current.onFileChange = handleFileChange;

      wsService.current.connect();
    }

    return () => {
      if (wsService.current) {
        wsService.current.disconnect();
        wsService.current = null;
      }
    };
  }, [session?.sessionId]);

  // Load initial sheet data when session changes
  useEffect(() => {
    if (session) {
      loadSheetData(session.currentSheet);
    }
  }, [session]);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const uploadResult = await ExcelService.uploadFile(file);

      const newSession: SessionData = {
        sessionId: uploadResult.session_id,
        filename: uploadResult.filename,
        sheets: uploadResult.sheets,
        currentSheet: uploadResult.sheets[0]
      };

      setSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSheetData = async (sheetName: string) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const data = await ExcelService.getSheetData(session.sessionId, sheetName);
      setSheetData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellUpdate = async (row: number, col: number, value: string, formula?: string) => {
    if (!session || !sheetData) return;

    try {
      await ExcelService.updateCell(session.sessionId, {
        sheet_name: session.currentSheet,
        row: row + 1, // Convert to 1-based indexing
        col: col + 1,
        value,
        formula
      });

      // Refresh sheet data to show changes
      await loadSheetData(session.currentSheet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cell');
    }
  };

  const handleFileChange = () => {
    // Reload sheet data when file changes externally
    if (session) {
      loadSheetData(session.currentSheet);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (session) {
      setSession({ ...session, currentSheet: sheetName });
    }
  };

  const handleDownload = async () => {
    if (!session) return;

    try {
      const url = await ExcelService.getDownloadUrl(session.sessionId);
      const link = document.createElement('a');
      link.href = url;
      link.download = session.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleNewFile = () => {
    setSession(null);
    setSheetData(null);
    setError(null);
    if (wsService.current) {
      wsService.current.disconnect();
      wsService.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Excel Editor
              </h1>
              {session && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{session.filename}</span>
                  <span className="mx-2">•</span>
                  <span>{session.currentSheet}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <ConnectionStatus connected={wsConnected} />

              {session && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={handleNewFile}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    🗂️ New File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sheet tabs */}
          {session && session.sheets.length > 1 && (
            <div className="mt-4 flex space-x-2">
              {session.sheets.map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => handleSheetChange(sheet)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    sheet === session.currentSheet
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {loading && (
          <div className="mb-6 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        )}

        {!session ? (
          <div className="max-w-md mx-auto">
            <FileUpload onUpload={handleFileUpload} disabled={loading} />
          </div>
        ) : (
          sheetData && (
            <SpreadsheetViewer
              data={sheetData}
              onCellUpdate={handleCellUpdate}
            />
          )
        )}
      </main>
    </div>
  );
}

export default App;