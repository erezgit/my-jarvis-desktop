import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ errorInfo })

    // Report to main process if in Electron
    if (window.previewAPI?.reportError) {
      window.previewAPI.reportError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Something went wrong
          </h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">Error:</h3>
            <pre className="text-sm overflow-auto">
              {this.state.error?.message}
            </pre>
          </div>

          {this.state.error?.stack && (
            <details className="mb-4">
              <summary className="cursor-pointer font-semibold">
                Stack Trace
              </summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}

          {this.state.errorInfo?.componentStack && (
            <details className="mb-4">
              <summary className="cursor-pointer font-semibold">
                Component Stack
              </summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reload Preview
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary