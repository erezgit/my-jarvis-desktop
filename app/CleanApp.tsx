import ProperTerminal from './components/ProperTerminal'
import './styles/app.css'

export default function CleanApp() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex',
      backgroundColor: '#1e1e1e',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Left Panel - File Explorer (260px fixed width) */}
      <div style={{
        width: '260px',
        backgroundColor: '#252526',
        borderRight: '1px solid #3e3e42',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#cccccc', margin: '0 0 16px 0', fontSize: '14px' }}>
          EXPLORER
        </h3>
        <div style={{ color: '#969696', fontSize: '13px' }}>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>📁 src/</div>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>📁 components/</div>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>📄 package.json</div>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>📄 README.md</div>
        </div>
      </div>

      {/* Center Panel - Document Preview (flexible width) */}
      <div style={{
        flex: 1,
        backgroundColor: '#1e1e1e',
        borderRight: '1px solid #3e3e42',
        padding: '16px',
        overflowY: 'auto',
        minWidth: '300px'
      }}>
        <h3 style={{ color: '#cccccc', margin: '0 0 16px 0', fontSize: '14px' }}>
          DOCUMENT PREVIEW
        </h3>
        <div style={{ color: '#969696', fontSize: '13px' }}>
          <p>Select a file to preview its contents here.</p>
          <br />
          <p>The terminal on the right is connected to your shell.</p>
        </div>
      </div>

      {/* Right Panel - Terminal (600px fixed width) */}
      <div style={{
        width: '600px',
        backgroundColor: '#1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Terminal Header */}
        <div style={{
          height: '35px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3e3e42',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          flexShrink: 0
        }}>
          <span style={{ color: '#cccccc', fontSize: '13px', fontWeight: 500 }}>
            TERMINAL
          </span>
        </div>
        
        {/* Terminal Container - THIS IS THE KEY: fixed dimensions, no flex shenanigans */}
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '8px'
          }}>
            <ProperTerminal id="main-terminal" />
          </div>
        </div>
      </div>
    </div>
  )
}