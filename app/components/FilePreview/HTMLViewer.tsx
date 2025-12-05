import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, RefreshCw } from 'lucide-react';
import { FileDownloadButton } from './FileDownloadButton';

interface HTMLViewerProps {
  content: string;
  fileName: string;
  className?: string;
}

export function HTMLViewer({ content, fileName, className = '' }: HTMLViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5)); // Max 5x zoom
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25)); // Min 0.25x zoom
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleRefresh = () => {
    // Force iframe reload by changing key
    setIframeKey(prev => prev + 1);
  };

  // Inject base styles and dark mode support into HTML content
  const enhancedContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Base reset and dark mode support */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${isDarkMode ? '#e5e7eb' : '#111827'};
            background: ${isDarkMode ? '#111827' : '#ffffff'};
          }

          body {
            padding: 20px;
            transform-origin: top left;
            transform: scale(${zoom});
            width: ${100 / zoom}%;
            transition: transform 0.2s ease;
          }

          /* Enhance default styles if not provided */
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1em;
            margin-bottom: 0.5em;
            color: ${isDarkMode ? '#f3f4f6' : '#111827'};
          }

          p {
            margin-bottom: 1em;
          }

          a {
            color: ${isDarkMode ? '#60a5fa' : '#2563eb'};
            text-decoration: underline;
          }

          a:hover {
            color: ${isDarkMode ? '#93c5fd' : '#1d4ed8'};
          }

          pre, code {
            background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }

          pre {
            padding: 1em;
            overflow-x: auto;
          }

          img {
            max-width: 100%;
            height: auto;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }

          th, td {
            border: 1px solid ${isDarkMode ? '#374151' : '#d1d5db'};
            padding: 0.5em;
            text-align: left;
          }

          th {
            background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
            font-weight: 600;
          }

          blockquote {
            border-left: 4px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
            padding-left: 1em;
            margin: 1em 0;
            font-style: italic;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;

  return (
    <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Fixed header matching file tree pattern */}
      <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {fileName}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            HTML Preview • {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Reset zoom"
          >
            <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="ml-2">
            <FileDownloadButton fileName={fileName} content={content} />
          </div>
        </div>
      </div>

      {/* HTML Preview in sandboxed iframe */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          srcDoc={enhancedContent}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          title={`HTML Preview: ${fileName}`}
          style={{
            background: isDarkMode ? '#111827' : '#ffffff',
            colorScheme: isDarkMode ? 'dark' : 'light'
          }}
        />
      </div>
    </div>
  );
}