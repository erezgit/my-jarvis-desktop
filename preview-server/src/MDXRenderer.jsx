import React, { useState, useEffect } from 'react'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

function MDXRenderer({ file }) {
  const [Content, setContent] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMDX() {
      if (!file) {
        setContent(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      
      try {
        let mdxSource = ''
        
        // If we have direct content, use it
        if (file.content) {
          mdxSource = file.content
        } 
        // Otherwise try to fetch it
        else if (file.path) {
          if (window.previewAPI) {
            // In Electron, request file content through IPC
            mdxSource = await window.previewAPI.requestFileContent(file.path)
          } else {
            // In development, try to fetch from local file
            // For now, we'll use the provided content
            mdxSource = file.content || '# No content available'
          }
        }

        // Handle different file types
        if (file.extension === '.md' || file.extension === '.markdown') {
          // For regular markdown, just wrap it
          mdxSource = mdxSource
        } else if (file.extension !== '.mdx') {
          // For non-markdown files, wrap in a code block
          mdxSource = `\`\`\`${file.extension.slice(1)}\n${mdxSource}\n\`\`\``
        }

        // Compile and evaluate MDX
        const { default: MDXContent } = await evaluate(mdxSource, {
          ...runtime,
          development: true,
          baseUrl: import.meta.url
        })

        setContent(() => MDXContent)
        setError(null)
      } catch (err) {
        console.error('MDX rendering error:', err)
        
        // If MDX compilation fails, try to show as plain markdown
        try {
          const plainContent = () => (
            <div className="prose prose-lg max-w-none">
              <pre className="whitespace-pre-wrap">{file.content}</pre>
            </div>
          )
          setContent(() => plainContent)
          setError({ message: 'Showing as plain text due to MDX compilation error', original: err })
        } catch (fallbackErr) {
          setError(err)
          setContent(null)
        }
      } finally {
        setLoading(false)
      }
    }

    loadMDX()
  }, [file])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !Content) {
    return (
      <div className="error-display p-8">
        <h2 className="text-xl font-bold text-red-600 mb-4">Preview Error</h2>
        <pre className="bg-red-50 p-4 rounded overflow-auto text-sm">
          {error.message}
        </pre>
      </div>
    )
  }

  if (!Content) {
    return (
      <div className="p-8 text-gray-500">
        No content to display
      </div>
    )
  }

  return (
    <div className="mdx-content p-8 max-w-4xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Note: {error.message}
        </div>
      )}
      <Content />
    </div>
  )
}

export default MDXRenderer