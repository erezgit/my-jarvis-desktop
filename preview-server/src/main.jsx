import React from 'react'
import ReactDOM from 'react-dom/client'
import { MDXProvider } from '@mdx-js/react'
import PreviewApp from './PreviewApp'
import './index.css'

// Global component registry for MDX
const components = {
  // Pre-built components (to be added)
  h1: (props) => <h1 className="text-3xl font-bold mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold mb-2" {...props} />,
  p: (props) => <p className="mb-4" {...props} />,
  code: (props) => <code className="bg-gray-100 px-1 py-0.5 rounded" {...props} />,
  pre: (props) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
  ul: (props) => <ul className="list-disc list-inside mb-4" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside mb-4" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4" {...props} />
  ),
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MDXProvider components={components}>
      <PreviewApp />
    </MDXProvider>
  </React.StrictMode>
)