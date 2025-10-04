import { useEffect, useState, ComponentProps } from 'react';
import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Import custom MDX components
import { AgentStatus, MetricCard, TaskProgress, ArchitectureDiagram, TicketStack, OnboardingTicketV1, OnboardingTicketV2, OnboardingTicketV3 } from './mdx-components';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

// Create theme-aware components for MDX files - matching MarkdownRenderer pattern
const createComponents = (isDarkMode: boolean) => ({
  // Custom MDX Components
  AgentStatus,
  MetricCard,
  TaskProgress,
  ArchitectureDiagram,
  TicketStack,
  OnboardingTicketV1,
  OnboardingTicketV2,
  OnboardingTicketV3,

  // Headings - theme-aware colors matching MarkdownRenderer
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-sky-400' : 'text-gray-900'}`} {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className={`text-2xl font-semibold mb-4 mt-6 ${isDarkMode ? 'text-sky-300' : 'text-gray-800'}`} {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className={`text-xl font-medium mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} {...props} />
  ),
  h4: (props: ComponentProps<'h4'>) => (
    <h4 className={`text-lg font-medium mb-2 mt-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className={`mb-4 leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className={`list-disc list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className={`list-decimal list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="mb-1" {...props} />
  ),
  code: (props: ComponentProps<'code'>) => {
    // Check if it's inline code or a code block
    const isInline = !props.className;

    if (isInline) {
      return (
        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${isDarkMode ? 'bg-zinc-800 text-sky-200' : 'bg-gray-100 text-blue-600'}`} {...props} />
      );
    }

    // For code blocks
    return (
      <code className={`block p-4 rounded-lg overflow-x-auto text-sm font-mono ${isDarkMode ? 'bg-zinc-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`} {...props} />
    );
  },
  pre: (props: ComponentProps<'pre'>) => (
    <pre className={`p-4 rounded-lg overflow-x-auto mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-100'}`} {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? 'border-sky-500 text-gray-300' : 'border-blue-500 text-gray-600'}`} {...props} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a className={`hover:underline ${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-800'}`} {...props} />
  ),
  hr: (props: ComponentProps<'hr'>) => (
    <hr className={`my-6 ${isDarkMode ? 'border-zinc-600' : 'border-gray-300'}`} {...props} />
  ),
  table: (props: ComponentProps<'table'>) => (
    <table className={`min-w-full divide-y mb-4 ${isDarkMode ? 'divide-zinc-600' : 'divide-gray-300'}`} {...props} />
  ),
  thead: (props: ComponentProps<'thead'>) => (
    <thead className={isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} {...props} />
  ),
  tbody: (props: ComponentProps<'tbody'>) => (
    <tbody className={`divide-y ${isDarkMode ? 'bg-zinc-900 divide-zinc-700' : 'bg-white divide-gray-200'}`} {...props} />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th className={`px-4 py-2 text-left font-medium ${isDarkMode ? 'text-sky-300' : 'text-gray-900'}`} {...props} />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td className={`px-4 py-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} {...props} />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`} {...props} />
  ),
  em: (props: ComponentProps<'em'>) => (
    <em className={`italic ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`} {...props} />
  ),
  // Task list support
  input: (props: ComponentProps<'input'>) => {
    if (props.type === 'checkbox') {
      return <input className="mr-2" {...props} disabled />
    }
    return <input {...props} />
  },
  // Images
  img: (props: ComponentProps<'img'>) => (
    <img className="max-w-full h-auto rounded-lg my-4" {...props} />
  ),
});

interface MDXRendererProps {
  source: string;
  className?: string;
}

export function MDXRenderer({ source, className = "" }: MDXRendererProps) {
  const { isDarkMode } = useSimpleTheme();
  const [mdxSource, setMdxSource] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const processContent = async () => {
      if (!source || source.trim() === '') {
        setMdxSource(null);
        return;
      }

      setIsLoading(true);
      try {
        const result = await serialize(source, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight],
            development: false,
          },
          parseFrontmatter: true,
        });
        setMdxSource(result);
        setError(null);
      } catch (err) {
        console.error('MDX processing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to process content');
        setMdxSource(null);
      } finally {
        setIsLoading(false);
      }
    };

    processContent();
  }, [source]);

  // Handle empty content
  if (!source || source.trim() === '') {
    return (
      <div className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${className}`}>
        This file is empty
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${className}`}>
        Processing MDX content...
      </div>
    );
  }

  // Handle errors - fallback to plain text
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="mb-2 text-sm text-red-400">
          MDX Error: {error}
        </div>
        <pre className={`whitespace-pre-wrap font-mono text-sm p-4 rounded ${isDarkMode ? 'text-gray-400 bg-zinc-900' : 'text-gray-600 bg-gray-100'}`}>
          {source}
        </pre>
      </div>
    );
  }

  // Get theme-aware components
  const components = createComponents(isDarkMode);

  // Render MDX
  if (mdxSource) {
    return (
      <div className={`max-w-none ${className}`}>
        <MDXRemote
          {...mdxSource}
          components={components}
        />
      </div>
    );
  }

  return null;
}