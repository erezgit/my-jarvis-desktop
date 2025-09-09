import { useMemo, useEffect, useState, ComponentProps } from 'react';
import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Pre-registered components available to all MDX files
const components = {
  // Override default markdown elements with Tailwind styles
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className="text-3xl font-bold mb-6 text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="text-2xl font-semibold mb-4 mt-6 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="text-xl font-medium mb-3 mt-4 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className="mb-4 text-zinc-600 dark:text-zinc-400 leading-relaxed" {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="list-disc list-inside mb-4 text-zinc-600 dark:text-zinc-400 space-y-1" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 text-zinc-600 dark:text-zinc-400 space-y-1" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="mb-1" {...props} />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: ComponentProps<'pre'>) => (
    <pre className="bg-zinc-900 dark:bg-zinc-950 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic my-4 text-zinc-600 dark:text-zinc-400" {...props} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />
  ),
  hr: (props: ComponentProps<'hr'>) => (
    <hr className="my-6 border-zinc-200 dark:border-zinc-700" {...props} />
  ),
  table: (props: ComponentProps<'table'>) => (
    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 mb-4" {...props} />
  ),
  thead: (props: ComponentProps<'thead'>) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800" {...props} />
  ),
  tbody: (props: ComponentProps<'tbody'>) => (
    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700" {...props} />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th className="px-4 py-2 text-left font-medium text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400" {...props} />
  ),
  // Task list support
  input: (props: ComponentProps<'input'>) => {
    if (props.type === 'checkbox') {
      return <input className="mr-2" {...props} disabled />
    }
    return <input {...props} />
  },
};

interface MDXRendererProps {
  source: string;
  className?: string;
}

export function MDXRenderer({ source, className = "" }: MDXRendererProps) {
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
      <div className={`text-zinc-500 dark:text-zinc-400 italic ${className}`}>
        This file is empty
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`text-zinc-500 dark:text-zinc-400 ${className}`}>
        Processing MDX content...
      </div>
    );
  }

  // Handle errors - fallback to plain text
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="mb-2 text-sm text-red-500 dark:text-red-400">
          MDX Error: {error}
        </div>
        <pre className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 font-mono text-sm bg-zinc-50 dark:bg-zinc-900 p-4 rounded">
          {source}
        </pre>
      </div>
    );
  }

  // Render MDX
  if (mdxSource) {
    return (
      <div className={`prose prose-sm lg:prose-base max-w-none dark:prose-invert ${className}`}>
        <MDXRemote 
          {...mdxSource}
          components={components}
        />
      </div>
    );
  }

  return null;
}