import { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Pre-registered components for styling markdown elements
const components = {
  // Headings - white with light blue accent for h1/h2
  h1: ({ children, ...props }: ComponentProps<'h1'>) => (
    <h1 className="text-3xl font-bold mb-6 text-sky-400" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentProps<'h2'>) => (
    <h2 className="text-2xl font-semibold mb-4 mt-6 text-sky-300" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentProps<'h3'>) => (
    <h3 className="text-xl font-medium mb-3 mt-4 text-white" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentProps<'h4'>) => (
    <h4 className="text-lg font-medium mb-2 mt-3 text-white" {...props}>
      {children}
    </h4>
  ),
  
  // Paragraphs and text - white
  p: ({ children, ...props }: ComponentProps<'p'>) => (
    <p className="mb-4 text-white leading-relaxed" {...props}>
      {children}
    </p>
  ),
  
  // Lists - white
  ul: ({ children, ...props }: ComponentProps<'ul'>) => (
    <ul className="list-disc list-inside mb-4 text-white space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentProps<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 text-white space-y-1" {...props}>
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
        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-sky-200" {...props}>
          {children}
        </code>
      );
    }
    
    // For code blocks
    return (
      <code className="block bg-zinc-900 p-4 rounded-lg overflow-x-auto text-sm font-mono text-gray-300" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: ComponentProps<'pre'>) => (
    <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto mb-4" {...props}>
      {children}
    </pre>
  ),
  
  // Blockquotes
  blockquote: ({ children, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote className="border-l-4 border-sky-500 pl-4 italic my-4 text-gray-300" {...props}>
      {children}
    </blockquote>
  ),
  
  // Links - light blue
  a: ({ children, ...props }: ComponentProps<'a'>) => (
    <a className="text-sky-400 hover:text-sky-300 hover:underline" {...props}>
      {children}
    </a>
  ),
  
  // Horizontal rules
  hr: ({ ...props }: ComponentProps<'hr'>) => (
    <hr className="my-6 border-zinc-600" {...props} />
  ),
  
  // Tables
  table: ({ children, ...props }: ComponentProps<'table'>) => (
    <table className="min-w-full divide-y divide-zinc-600 mb-4" {...props}>
      {children}
    </table>
  ),
  thead: ({ children, ...props }: ComponentProps<'thead'>) => (
    <thead className="bg-zinc-800" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: ComponentProps<'tbody'>) => (
    <tbody className="bg-zinc-900 divide-y divide-zinc-700" {...props}>
      {children}
    </tbody>
  ),
  th: ({ children, ...props }: ComponentProps<'th'>) => (
    <th className="px-4 py-2 text-left font-medium text-sky-300" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps<'td'>) => (
    <td className="px-4 py-2 text-white" {...props}>
      {children}
    </td>
  ),
  
  // Images
  img: ({ ...props }: ComponentProps<'img'>) => (
    <img className="max-w-full h-auto rounded-lg my-4" {...props} />
  ),
  
  // Strong and emphasis - white/bright
  strong: ({ children, ...props }: ComponentProps<'strong'>) => (
    <strong className="font-semibold text-white" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentProps<'em'>) => (
    <em className="italic text-gray-200" {...props}>
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
      <div className={`text-gray-400 italic ${className}`}>
        This file is empty
      </div>
    );
  }

  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}