import { useMemo, useEffect, useState, ComponentProps } from 'react';
import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Import custom MDX components
import { AgentStatus, MetricCard, TaskProgress } from '../mdx-components';

// Create semantic CSS components for MDX files
const components = {
  // Custom MDX Components
  AgentStatus,
  MetricCard,
  TaskProgress,
  
  // Headings - semantic CSS classes
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className="text-3xl font-bold mb-6 text-primary" {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="text-2xl font-semibold mb-4 mt-6 text-foreground" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="text-xl font-medium mb-3 mt-4 text-foreground" {...props} />
  ),
  h4: (props: ComponentProps<'h4'>) => (
    <h4 className="text-lg font-medium mb-2 mt-3 text-foreground" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className="mb-4 leading-relaxed text-foreground" {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="list-disc list-inside mb-4 space-y-1 text-foreground" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 space-y-1 text-foreground" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="mb-1" {...props} />
  ),
  code: (props: ComponentProps<'code'>) => {
    // Check if it's inline code or a code block
    const isInline = !props.className;
    
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-muted text-primary" {...props} />
      );
    }
    
    // For code blocks
    return (
      <code className="block p-4 rounded-lg overflow-x-auto text-sm font-mono bg-muted text-muted-foreground" {...props} />
    );
  },
  pre: (props: ComponentProps<'pre'>) => (
    <pre className="p-4 rounded-lg overflow-x-auto mb-4 bg-muted" {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a className="text-primary hover:text-primary/80 hover:underline" {...props} />
  ),
  hr: (props: ComponentProps<'hr'>) => (
    <hr className="my-6 border-border" {...props} />
  ),
  table: (props: ComponentProps<'table'>) => (
    <table className="min-w-full divide-y divide-border mb-4" {...props} />
  ),
  thead: (props: ComponentProps<'thead'>) => (
    <thead className="bg-muted" {...props} />
  ),
  tbody: (props: ComponentProps<'tbody'>) => (
    <tbody className="bg-card divide-y divide-border" {...props} />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th className="px-4 py-2 text-left font-medium text-foreground" {...props} />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td className="px-4 py-2 text-foreground" {...props} />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: ComponentProps<'em'>) => (
    <em className="italic text-muted-foreground" {...props} />
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
  )
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
      <div className={`italic text-muted-foreground ${className}`}>
        This file is empty
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`text-muted-foreground ${className}`}>
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
        <pre className="whitespace-pre-wrap font-mono text-sm p-4 rounded bg-muted text-muted-foreground">
          {source}
        </pre>
      </div>
    );
  }

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