import { useState, useEffect } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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
  const [MDXContent, setMDXContent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadMDX() {
      if (!file || !file.content) {
        setMDXContent(null);
        return;
      }

      // Handle MDX files
      if (file.extension === '.mdx' || file.extension === '.md') {
        setIsLoading(true);
        setError(null);
        
        try {
          const { default: MDXComponent } = await evaluate(file.content, {
            ...runtime as any,
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight],
            development: false
          });
          
          setMDXContent(() => MDXComponent);
        } catch (err) {
          console.error('Error compiling MDX:', err);
          setError(err instanceof Error ? err.message : 'Failed to compile MDX');
          setMDXContent(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        // For non-MDX files, just display the content as text
        setMDXContent(null);
        setError(null);
      }
    }

    loadMDX();
  }, [file]);

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

  if (isLoading) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full w-full p-4 ${className}`}>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Preview Error</h3>
          <pre className="text-red-600 dark:text-red-300 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  }

  // Render MDX content
  if (MDXContent) {
    return (
      <div className={`h-full w-full overflow-auto p-6 ${className}`}>
        <article className="prose dark:prose-invert max-w-none">
          <MDXContent />
        </article>
      </div>
    );
  }

  // Render plain text content for non-MDX files
  if (file.content) {
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