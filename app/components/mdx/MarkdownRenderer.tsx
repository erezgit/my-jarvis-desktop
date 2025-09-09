import { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Pre-registered components for styling markdown elements
const components = {
  // Headings
  h1: ({ children, ...props }: ComponentProps<'h1'>) => (
    <h1 className="text-3xl font-bold mb-6 text-zinc-900 dark:text-zinc-100" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentProps<'h2'>) => (
    <h2 className="text-2xl font-semibold mb-4 mt-6 text-zinc-800 dark:text-zinc-200" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentProps<'h3'>) => (
    <h3 className="text-xl font-medium mb-3 mt-4 text-zinc-700 dark:text-zinc-300" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentProps<'h4'>) => (
    <h4 className="text-lg font-medium mb-2 mt-3 text-zinc-700 dark:text-zinc-300" {...props}>
      {children}
    </h4>
  ),
  
  // Paragraphs and text
  p: ({ children, ...props }: ComponentProps<'p'>) => (
    <p className="mb-4 text-zinc-600 dark:text-zinc-400 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  
  // Lists
  ul: ({ children, ...props }: ComponentProps<'ul'>) => (
    <ul className="list-disc list-inside mb-4 text-zinc-600 dark:text-zinc-400 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentProps<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 text-zinc-600 dark:text-zinc-400 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentProps<'li'>) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),
  
  // Code blocks
  code: ({ children, ...props }: ComponentProps<'code'>) => {
    // Check if it's inline code or a code block
    const isInline = !props.className;
    
    if (isInline) {
      return (
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    
    // For code blocks
    return (
      <code className="block bg-zinc-900 dark:bg-zinc-950 p-4 rounded-lg overflow-x-auto text-sm font-mono text-zinc-300" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: ComponentProps<'pre'>) => (
    <pre className="bg-zinc-900 dark:bg-zinc-950 p-4 rounded-lg overflow-x-auto mb-4" {...props}>
      {children}
    </pre>
  ),
  
  // Blockquotes
  blockquote: ({ children, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic my-4 text-zinc-600 dark:text-zinc-400" {...props}>
      {children}
    </blockquote>
  ),
  
  // Links
  a: ({ children, ...props }: ComponentProps<'a'>) => (
    <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>
      {children}
    </a>
  ),
  
  // Horizontal rules
  hr: ({ ...props }: ComponentProps<'hr'>) => (
    <hr className="my-6 border-zinc-200 dark:border-zinc-700" {...props} />
  ),
  
  // Tables
  table: ({ children, ...props }: ComponentProps<'table'>) => (
    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 mb-4" {...props}>
      {children}
    </table>
  ),
  thead: ({ children, ...props }: ComponentProps<'thead'>) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: ComponentProps<'tbody'>) => (
    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700" {...props}>
      {children}
    </tbody>
  ),
  th: ({ children, ...props }: ComponentProps<'th'>) => (
    <th className="px-4 py-2 text-left font-medium text-zinc-900 dark:text-zinc-100" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps<'td'>) => (
    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400" {...props}>
      {children}
    </td>
  ),
  
  // Images
  img: ({ ...props }: ComponentProps<'img'>) => (
    <img className="max-w-full h-auto rounded-lg my-4" {...props} />
  ),
  
  // Strong and emphasis
  strong: ({ children, ...props }: ComponentProps<'strong'>) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentProps<'em'>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
};

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

export function MarkdownRenderer({ source, className = "" }: MarkdownRendererProps) {
  // Handle empty content
  if (!source || source.trim() === '') {
    return (
      <div className={`text-zinc-500 dark:text-zinc-400 italic ${className}`}>
        This file is empty
      </div>
    );
  }

  return (
    <div className={`prose prose-sm lg:prose-base max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}