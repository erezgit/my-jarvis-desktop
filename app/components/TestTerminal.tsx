import { useEffect, useRef, useState } from 'react'

export function TestTerminal() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadXterm = async () => {
      try {
        console.log('Loading xterm...')
        
        // Dynamic import to ensure proper loading
        const { Terminal } = await import('@xterm/xterm')
        const { FitAddon } = await import('@xterm/addon-fit')
        
        // Import CSS
        await import('@xterm/xterm/css/xterm.css')
        
        if (!containerRef.current) {
          setError('Container not ready')
          return
        }

        console.log('Creating terminal...')
        const term = new Terminal({
          rows: 24,
          cols: 80,
          cursorBlink: true
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        
        term.open(containerRef.current)
        
        term.writeln('✅ Terminal loaded successfully!')
        term.writeln('Type something to test input:')
        term.write('> ')
        
        term.onData((data) => {
          console.log('User typed:', data)
          term.write(data)
          if (data === '\r') {
            term.write('\n> ')
          }
        })
        
        fitAddon.fit()
        setLoaded(true)
        
      } catch (err) {
        console.error('Failed to load terminal:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    loadXterm()
  }, [])

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-2">Terminal Test</h3>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
          Error: {error}
        </div>
      )}
      {!loaded && !error && (
        <div className="text-gray-500 mb-2">Loading terminal...</div>
      )}
      <div 
        ref={containerRef} 
        className="bg-black rounded p-2"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}

export default TestTerminal