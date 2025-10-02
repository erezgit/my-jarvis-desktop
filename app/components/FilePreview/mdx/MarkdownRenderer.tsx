import { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

// Pre-registered components for styling markdown elements
const createComponents = (isDarkMode: boolean) => ({
  // Headings
  h1: ({ children, ...props }: ComponentProps<'h1'>) => (
    <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-sky-400' : 'text-gray-900'}`} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentProps<'h2'>) => (
    <h2 className={`text-2xl font-semibold mb-4 mt-6 ${isDarkMode ? 'text-sky-300' : 'text-gray-800'}`} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentProps<'h3'>) => (
    <h3 className={`text-xl font-medium mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentProps<'h4'>) => (
    <h4 className={`text-lg font-medium mb-2 mt-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} {...props}>
      {children}
    </h4>
  ),

  // Paragraphs and text
  p: ({ children, ...props }: ComponentProps<'p'>) => (
    <p className={`mb-4 leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props}>
      {children}
    </p>
  ),

  // Lists
  ul: ({ children, ...props }: ComponentProps<'ul'>) => (
    <ul className={`list-disc list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentProps<'ol'>) => (
    <ol className={`list-decimal list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props}>
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
        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${isDarkMode ? 'bg-zinc-800 text-sky-200' : 'bg-gray-100 text-blue-600'}`} {...props}>
          {children}
        </code>
      );
    }

    // For code blocks
    return (
      <code className={`block p-4 rounded-lg overflow-x-auto text-sm font-mono ${isDarkMode ? 'bg-zinc-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: ComponentProps<'pre'>) => (
    <pre className={`p-4 rounded-lg overflow-x-auto mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-100'}`} {...props}>
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? 'border-sky-500 text-gray-300' : 'border-blue-500 text-gray-600'}`} {...props}>
      {children}
    </blockquote>
  ),

  // Links
  a: ({ children, ...props }: ComponentProps<'a'>) => (
    <a className={`hover:underline ${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-800'}`} {...props}>
      {children}
    </a>
  ),

  // Horizontal rules
  hr: ({ ...props }: ComponentProps<'hr'>) => (
    <hr className={`my-6 ${isDarkMode ? 'border-zinc-600' : 'border-gray-300'}`} {...props} />
  ),

  // Tables
  table: ({ children, ...props }: ComponentProps<'table'>) => (
    <table className={`min-w-full divide-y mb-4 ${isDarkMode ? 'divide-zinc-600' : 'divide-gray-300'}`} {...props}>
      {children}
    </table>
  ),
  thead: ({ children, ...props }: ComponentProps<'thead'>) => (
    <thead className={isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: ComponentProps<'tbody'>) => (
    <tbody className={`divide-y ${isDarkMode ? 'bg-zinc-900 divide-zinc-700' : 'bg-white divide-gray-200'}`} {...props}>
      {children}
    </tbody>
  ),
  th: ({ children, ...props }: ComponentProps<'th'>) => (
    <th className={`px-4 py-2 text-left font-medium ${isDarkMode ? 'text-sky-300' : 'text-gray-900'}`} {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps<'td'>) => (
    <td className={`px-4 py-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props}>
      {children}
    </td>
  ),

  // Images
  img: ({ ...props }: ComponentProps<'img'>) => (
    <img className="max-w-full h-auto rounded-lg my-4" {...props} />
  ),

  // Strong and emphasis
  strong: ({ children, ...props }: ComponentProps<'strong'>) => (
    <strong className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: ComponentProps<'em'>) => (
    <em className={`italic ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`} {...props}>
      {children}
    </em>
  ),
});

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

export function MarkdownRenderer({ source, className = "" }: MarkdownRendererProps) {
  const { isDarkMode } = useSimpleTheme();
  const components = createComponents(isDarkMode);

  // Handle empty content
  if (!source || source.trim() === '') {
    return (
      <div className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${className}`}>
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