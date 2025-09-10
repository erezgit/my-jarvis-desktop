import { MarkdownRenderer } from './mdx/MarkdownRenderer';
import { MDXRenderer } from './mdx/MDXRenderer';

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

export function FilePreview({ file, className = "" }: FilePreviewProps) {
  if (!file) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the file tree to preview</p>
        </div>
      </div>
    );
  }

  // Handle different file types based on extension
  if (file.content) {
    // Route .md files to MarkdownRenderer (safe, no eval)
    if (file.extension === '.md') {
      return (
        <div className={`h-full w-full overflow-auto p-6 ${className}`}>
          <MarkdownRenderer source={file.content} />
        </div>
      );
    }

    // Route .mdx files to MDXRenderer (handles components)
    if (file.extension === '.mdx') {
      return (
        <div className={`h-full w-full overflow-auto p-6 ${className}`}>
          <MDXRenderer source={file.content} />
        </div>
      );
    }

    // Plain text files
    return (
      <div className={`h-full w-full overflow-auto p-4 ${className}`}>
        <pre className="font-mono text-sm whitespace-pre-wrap">{file.content}</pre>
      </div>
    );
  }

  // Binary files or files without content
  return (
    <div className={`h-full w-full flex items-center justify-center ${className}`}>
      <div className="text-center text-muted-foreground">
        <p className="text-lg mb-2">{file.name}</p>
        <p className="text-sm">Preview not available for this file type</p>
      </div>
    </div>
  );
}