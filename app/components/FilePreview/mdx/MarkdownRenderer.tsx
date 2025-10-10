import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

export function MarkdownRenderer({ source, className = "" }: MarkdownRendererProps) {
  const { isDarkMode } = useSimpleTheme();

  // Initialize markdown-it with GFM-like features
  const md = useMemo(() => {
    const markdownIt = new MarkdownIt({
      html: true,        // Enable HTML tags in source
      linkify: true,     // Auto-convert URLs to links
      typographer: true, // Enable smart quotes and other typographic replacements
      breaks: true,      // Convert \n in paragraphs into <br>
    });

    // VS Code approach: Add dir="auto" to ALL tokens with line mapping (not inline)
    // This is exactly how VS Code does it in markdownEngine.ts
    const originalRender = markdownIt.renderer.render;
    markdownIt.renderer.render = function(tokens, options, env) {
      // Add dir="auto" to all block-level tokens
      tokens.forEach((token, idx) => {
        if (token.map && token.type !== 'inline') {
          token.attrJoin('dir', 'auto');
        }
      });
      return originalRender.call(this, tokens, options, env);
    };

    // Custom renderer rules for styling
    const defaultParagraphOpenRenderer = markdownIt.renderer.rules.paragraph_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `mb-4 leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-700'}`);
      return defaultParagraphOpenRenderer(tokens, idx, options, env, self);
    };

    // Headings
    const defaultHeadingOpenRenderer = markdownIt.renderer.rules.heading_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const level = tokens[idx].tag;

      // Apply appropriate styling based on heading level
      const headingClasses = {
        h1: `text-3xl font-bold mb-6 ${isDarkMode ? 'text-sky-400' : 'text-gray-900'}`,
        h2: `text-2xl font-semibold mb-4 mt-6 ${isDarkMode ? 'text-sky-300' : 'text-gray-800'}`,
        h3: `text-xl font-medium mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`,
        h4: `text-lg font-medium mb-2 mt-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`,
        h5: `text-base font-medium mb-2 mt-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`,
        h6: `text-sm font-medium mb-2 mt-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`,
      };

      tokens[idx].attrSet('class', headingClasses[level as keyof typeof headingClasses] || '');
      return defaultHeadingOpenRenderer(tokens, idx, options, env, self);
    };

    // Lists (ul, ol)
    const defaultBulletListOpenRenderer = markdownIt.renderer.rules.bullet_list_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.bullet_list_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `list-disc list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`);
      return defaultBulletListOpenRenderer(tokens, idx, options, env, self);
    };

    const defaultOrderedListOpenRenderer = markdownIt.renderer.rules.ordered_list_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `list-decimal list-inside mb-4 space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`);
      return defaultOrderedListOpenRenderer(tokens, idx, options, env, self);
    };

    // List items
    const defaultListItemOpenRenderer = markdownIt.renderer.rules.list_item_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', 'mb-1');
      return defaultListItemOpenRenderer(tokens, idx, options, env, self);
    };

    // Blockquotes
    const defaultBlockquoteOpenRenderer = markdownIt.renderer.rules.blockquote_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `border-l-4 pl-4 italic my-4 ${isDarkMode ? 'border-sky-500 text-gray-300' : 'border-blue-500 text-gray-600'}`);
      return defaultBlockquoteOpenRenderer(tokens, idx, options, env, self);
    };

    // Code blocks
    const defaultFenceRenderer = markdownIt.renderer.rules.fence ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const langName = token.info.trim();
      const content = token.content;

      return `<pre class="p-4 rounded-lg overflow-x-auto mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-100'}"><code class="block text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}">${md.utils.escapeHtml(content)}</code></pre>`;
    };

    // Inline code
    const defaultCodeInlineRenderer = markdownIt.renderer.rules.code_inline ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
      const content = tokens[idx].content;
      return `<code class="px-1.5 py-0.5 rounded text-sm font-mono ${isDarkMode ? 'bg-zinc-800 text-sky-200' : 'bg-gray-100 text-blue-600'}">${md.utils.escapeHtml(content)}</code>`;
    };

    // Horizontal rules
    const defaultHrRenderer = markdownIt.renderer.rules.hr ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.hr = (tokens, idx, options, env, self) => {
      return `<hr class="my-6 ${isDarkMode ? 'border-zinc-600' : 'border-gray-300'}" />`;
    };

    // Tables
    const defaultTableOpenRenderer = markdownIt.renderer.rules.table_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.table_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `min-w-full divide-y mb-4 ${isDarkMode ? 'divide-zinc-600' : 'divide-gray-300'}`);
      return defaultTableOpenRenderer(tokens, idx, options, env, self);
    };

    const defaultTheadOpenRenderer = markdownIt.renderer.rules.thead_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.thead_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', isDarkMode ? 'bg-zinc-800' : 'bg-gray-100');
      return defaultTheadOpenRenderer(tokens, idx, options, env, self);
    };

    const defaultTbodyOpenRenderer = markdownIt.renderer.rules.tbody_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.tbody_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `divide-y ${isDarkMode ? 'bg-zinc-900 divide-zinc-700' : 'bg-white divide-gray-200'}`);
      return defaultTbodyOpenRenderer(tokens, idx, options, env, self);
    };

    const defaultThOpenRenderer = markdownIt.renderer.rules.th_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.th_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `px-4 py-2 text-left font-medium ${isDarkMode ? 'text-sky-300' : 'text-gray-900'}`);
      return defaultThOpenRenderer(tokens, idx, options, env, self);
    };

    const defaultTdOpenRenderer = markdownIt.renderer.rules.td_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.td_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `px-4 py-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`);
      return defaultTdOpenRenderer(tokens, idx, options, env, self);
    };

    // Links
    const defaultLinkOpenRenderer = markdownIt.renderer.rules.link_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', `hover:underline ${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-800'}`);
      return defaultLinkOpenRenderer(tokens, idx, options, env, self);
    };

    // Images
    const defaultImageRenderer = markdownIt.renderer.rules.image ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet('class', 'max-w-full h-auto rounded-lg my-4');
      return defaultImageRenderer(tokens, idx, options, env, self);
    };

    // Strong and emphasis
    const defaultStrongOpenRenderer = markdownIt.renderer.rules.strong_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.strong_open = (tokens, idx, options, env, self) => {
      return `<strong class="font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}">`;
    };

    const defaultEmOpenRenderer = markdownIt.renderer.rules.em_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdownIt.renderer.rules.em_open = (tokens, idx, options, env, self) => {
      return `<em class="italic ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}">`;
    };

    return markdownIt;
  }, [isDarkMode]);

  // Handle empty content
  if (!source || source.trim() === '') {
    return (
      <div className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${className}`}>
        This file is empty
      </div>
    );
  }

  // Render markdown to HTML
  const htmlContent = md.render(source);

  return (
    <div
      className={`markdown-body max-w-none ${className}`}
      dir="auto"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
