import React from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

// Declare the window.electronAPI interface
declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: any) => void;
      on: (channel: string, func: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface ProperTerminalProps {
  id?: string;
  theme?: any;
  themeMode?: 'light' | 'dark';
}

interface ProperTerminalState {
  isReady: boolean;
}

class ProperTerminalComponent extends React.PureComponent<ProperTerminalProps, ProperTerminalState> {
  private containerRef = React.createRef<HTMLDivElement>();
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private webglAddon: WebglAddon | null = null;
  private termId: string;
  private resizeTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  
  state = {
    isReady: false
  };
  
  constructor(props: ProperTerminalProps) {
    super(props);
    this.termId = props.id || 'term-' + Date.now();
  }
  
  componentDidMount() {
    this.initTerminal();
  }
  
  componentDidUpdate(prevProps: ProperTerminalProps) {
    // Update theme when props change
    if (this.props.theme && prevProps.theme !== this.props.theme) {
      this.updateTheme(this.props.theme);
    }
  }

  componentWillUnmount() {
    this.cleanup();
  }

  updateTheme = (theme: any) => {
    if (!this.terminal) return;
    
    // Create new theme object to trigger xterm.js update
    this.terminal.options.theme = { ...theme };
  };
  
  initTerminal = () => {
    if (!this.containerRef.current || this.isInitialized) return;
    
    console.log('Initializing terminal:', this.termId);
    this.isInitialized = true;
    
    // Use provided theme or default
    const terminalTheme = this.props.theme || {
      background: '#1e1e1e',
      foreground: '#d4d4d4'
    };

    // Create terminal with better ANSI handling
    this.terminal = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: terminalTheme,
      allowTransparency: false,
      scrollback: 1000,
      convertEol: true  // Convert line endings
    });
    
    // Open terminal
    this.terminal.open(this.containerRef.current);
    
    // Try to use WebGL renderer for better performance
    try {
      this.webglAddon = new WebglAddon();
      this.terminal.loadAddon(this.webglAddon);
    } catch (e) {
      console.warn('WebGL renderer not supported, using default');
    }
    
    // Load FitAddon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    
    // Register data handler
    this.terminal.onData(this.handleData);
    
    // Fit after all addons are loaded
    this.fitAddon.fit();
    
    // Connect PTY
    this.connectPty();
    this.setState({ isReady: true });
    
    // Handle window resize
    window.addEventListener('resize', this.handleResizeDebounced);
  };
  
  handleData = (data: string) => {
    console.log('[Terminal] Sending to PTY:', data, 'Length:', data.length);
    if (window.electronAPI) {
      window.electronAPI.send('terminal-data', { 
        id: this.termId, 
        data 
      });
    }
  };
  
  connectPty = () => {
    if (!window.electronAPI || !this.terminal) {
      console.warn('electronAPI not available');
      this.terminal?.writeln('Terminal ready (demo mode - no shell connection)');
      this.terminal?.write('$ ');
      return;
    }
    
    console.log('Connecting to PTY');
    window.electronAPI.send('terminal-create', this.termId);
    
    // Receive data from PTY
    window.electronAPI.on('terminal-data-' + this.termId, (data: string) => {
      console.log('[Terminal] Received from PTY:', data, 'Length:', data.length);
      this.terminal?.write(data);
    });
    
    // Handle terminal exit
    window.electronAPI.on('terminal-exit-' + this.termId, () => {
      this.terminal?.write('\r\n[Process completed]\r\n');
    });
    
    // Force initial resize to sync dimensions with PTY
    // This fixes the issue where PTY starts with hardcoded 80x30
    // but xterm.js might have different dimensions
    setTimeout(() => {
      console.log('Forcing initial resize to sync PTY dimensions');
      this.handleResize();
    }, 50);
  };
  
  handleResize = () => {
    // Only fit if terminal is ready
    if (this.fitAddon && this.terminal && this.state.isReady) {
      console.log('Resizing terminal');
      this.fitAddon.fit();
      
      if (window.electronAPI) {
        window.electronAPI.send('terminal-resize', {
          id: this.termId,
          cols: this.terminal.cols,
          rows: this.terminal.rows
        });
      }
    }
  };
  
  // Debounce resize to prevent too many calls
  handleResizeDebounced = () => {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(this.handleResize, 100);
  };
  
  cleanup = () => {
    console.log('Cleaning up terminal:', this.termId);
    
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    
    window.removeEventListener('resize', this.handleResizeDebounced);
    
    if (window.electronAPI && this.termId) {
      window.electronAPI.removeAllListeners('terminal-data-' + this.termId);
      window.electronAPI.removeAllListeners('terminal-exit-' + this.termId);
    }
    
    if (this.webglAddon) {
      this.webglAddon.dispose();
      this.webglAddon = null;
    }
    
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    
    this.fitAddon = null;
    this.isInitialized = false;
  };
  
  render() {
    return (
      <div 
        ref={this.containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e1e1e',
          padding: 0,
          margin: 0,
          overflow: 'hidden'
        }}
      />
    );
  }
}

// Create a forwardRef wrapper to expose the handleResize method
export const ProperTerminal = React.forwardRef<ProperTerminalComponent, ProperTerminalProps>((props, ref) => {
  const componentRef = React.useRef<ProperTerminalComponent>(null);
  
  React.useImperativeHandle(ref, () => ({
    handleResize: () => {
      if (componentRef.current) {
        componentRef.current.handleResize();
      }
    }
  }));
  
  return <ProperTerminalComponent ref={componentRef} {...props} />;
});

ProperTerminal.displayName = 'ProperTerminal';

export default ProperTerminal;