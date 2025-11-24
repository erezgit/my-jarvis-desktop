import { MarkdownRenderer } from './mdx/MarkdownRenderer';
import { MDXRenderer } from './mdx/MDXRenderer';
import { PDFViewer } from './PDFViewer';
import { SandpackPreview } from './SandpackPreview';
import { ExcelViewer } from './ExcelViewer';
import { ImageViewer } from './ImageViewer';
import { FileDownloadButton } from './FileDownloadButton';

interface FileItem {
  name: string;
  path: string;
  content?: string;
  extension: string;
  isDirectory: boolean;
}

interface FilePreviewProps {
  file: FileItem | null;
  className?: string;
}

// Simple syntax highlighting for common file types
function getLanguageFromExtension(extension: string): string {
  const langMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.json': 'json',
    '.css': 'css',
    '.html': 'html',
    '.md': 'markdown',
    '.mdx': 'markdown',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sh': 'bash',
    '.bash': 'bash'
  };
  return langMap[extension] || 'text';
}

export function FilePreview({ file, className = "" }: FilePreviewProps) {
  if (!file) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the file tree to preview</p>
        </div>
      </div>
    );
  }

  if (file.isDirectory) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">📁 {file.name}</p>
          <p className="text-sm">This is a directory</p>
        </div>
      </div>
    );
  }

  // Handle different file types based on extension

  // React component files - use Sandpack for live preview
  const isReactFile = file.extension === '.tsx' || file.extension === '.jsx';
  if (isReactFile && file.content) {
    return (
      <SandpackPreview
        filePath={file.path}
        content={file.content}
        className={className}
      />
    );
  }

  // PDF files - use react-pdf viewer with streaming support
  if (file.extension === '.pdf') {
    const streamUrl = `/api/stream-file?path=${encodeURIComponent(file.path)}`;
    return (
      <PDFViewer
        fileUrl={streamUrl}
        fileName={file.name}
        className={className}
      />
    );
  }

  // Excel files - use Excel viewer with spreadsheet support
  if (file.extension === '.xlsx' || file.extension === '.xls') {
    return (
      <ExcelViewer
        filePath={file.path}
        fileName={file.name}
        className={className}
      />
    );
  }

  // Image files - use ImageViewer with zoom and pan support
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  if (imageExtensions.includes(file.extension)) {
    const streamUrl = `/api/stream-file?path=${encodeURIComponent(file.path)}`;
    return (
      <ImageViewer
        imageUrl={streamUrl}
        fileName={file.name}
        alt={file.name}
        className={className}
      />
    );
  }

  if (file.content) {
    // Rich markdown rendering
    if (file.extension === '.md') {
      return (
        <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
          {/* Fixed header matching file tree pattern */}
          <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</h3>
            </div>
            <FileDownloadButton fileName={file.name} content={file.content} />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-auto p-6">
            <MarkdownRenderer source={file.content} />
          </div>
        </div>
      );
    }

    // Interactive MDX rendering
    if (file.extension === '.mdx') {
      return (
        <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
          {/* Fixed header matching file tree pattern */}
          <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</h3>
            </div>
            <FileDownloadButton fileName={file.name} content={file.content} />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-auto p-6">
            <MDXRenderer source={file.content} />
          </div>
        </div>
      );
    }

    // Code files with basic syntax highlighting placeholder
    // Note: .tsx and .jsx are handled by Sandpack above
    if (['.js', '.ts', '.py', '.json', '.css', '.html', '.yml', '.yaml', '.sh', '.bash'].includes(file.extension)) {
      return (
        <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
          {/* Fixed header matching file tree pattern */}
          <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{getLanguageFromExtension(file.extension)}</span>
            </div>
            <FileDownloadButton fileName={file.name} content={file.content} />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-auto p-4">
            <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
              {file.content}
            </pre>
          </div>
        </div>
      );
    }

    // Plain text files
    return (
      <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
        {/* Fixed header matching file tree pattern */}
        <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</h3>
          </div>
          <FileDownloadButton fileName={file.name} content={file.content} />
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="font-mono text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {file.content}
          </pre>
        </div>
      </div>
    );
  }

  // Binary files or files without content
  return (
    <div className={`h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 ${className}`}>
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">📄 {file.name}</p>
        <p className="text-sm">Preview not available for this file type</p>
        <p className="text-xs mt-2 text-gray-400">{file.extension.toUpperCase().slice(1)} file</p>
      </div>
    </div>
  );
}