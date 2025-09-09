import React, { useState, useEffect, Suspense } from 'react'
import MDXRenderer from './MDXRenderer'
import ErrorBoundary from './ErrorBoundary'

function PreviewApp() {
  const [currentFile, setCurrentFile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Listen for file selection from main app via postMessage
    const handleMessage = (event) => {
      // Accept messages from the parent window
      if (event.data && event.data.type === 'file-selected') {
        console.log('File selected:', event.data.filePath)
        setCurrentFile({
          path: event.data.filePath,
          content: event.data.content,
          extension: event.data.extension
        })
        setError(null)
      }
    }

    window.addEventListener('message', handleMessage)

    // Listen for file selection from Electron (if using previewAPI)
    if (window.previewAPI) {
      window.previewAPI.onFileSelected((filePath) => {
        console.log('File selected via Electron:', filePath)
        setCurrentFile(filePath)
        setError(null)
      })
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  if (error) {
    return (
      <div className="error-container p-8">
        <h2 className="text-xl font-bold text-red-600 mb-4">Preview Error</h2>
        <pre className="bg-red-50 p-4 rounded">{error.message}</pre>
      </div>
    )
  }

  if (!currentFile) {
    return (
      <div className="welcome-container p-8">
        <h1 className="text-3xl font-bold mb-4">MDX Preview</h1>
        <p className="text-gray-600">
          Select an MDX file from the file explorer to preview it here.
        </p>
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Live MDX rendering with hot reload</li>
            <li>React component support</li>
            <li>Syntax highlighting</li>
            <li>GitHub Flavored Markdown</li>
            <li>Dynamic component loading</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="preview-container">
          <MDXRenderer file={currentFile} />
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default PreviewApp