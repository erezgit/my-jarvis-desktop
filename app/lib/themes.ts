// Theme definitions for My Jarvis Desktop
export const themes = {
  light: {
    // Panel backgrounds
    sidePanel: '#F5F5F5',      // Light gray for file tree and terminal
    centerPanel: '#FFFFFF',     // White for preview
    
    // App structure
    background: '#FFFFFF',
    topBar: '#FFFFFF',
    border: '#E5E7EB',
    
    // Text colors
    textPrimary: '#2D2D2D',
    textSecondary: '#6B7280',
    
    // UI elements
    accent: '#7C3AED',          // Purple accent
    hover: 'rgba(124, 58, 237, 0.1)',
    selected: 'rgba(124, 58, 237, 0.2)',
    
    // Component colors
    buttonBg: '#F3F4F6',
    buttonHover: '#E5E7EB',
    modalBg: '#FFFFFF',
    
    // Terminal theme
    terminal: {
      background: '#F5F5F5',
      foreground: '#2D2D2D',
      cursor: '#7C3AED',
      cursorAccent: '#FFFFFF',
      selection: 'rgba(124, 58, 237, 0.2)',
      
      // ANSI colors (adjusted for light background)
      black: '#2D2D2D',
      red: '#DC2626',
      green: '#059669',
      yellow: '#D97706',
      blue: '#2563EB',
      magenta: '#9333EA',
      cyan: '#0891B2',
      white: '#6B7280',
      
      // Bright ANSI colors
      brightBlack: '#4B5563',
      brightRed: '#EF4444',
      brightGreen: '#10B981',
      brightYellow: '#F59E0B',
      brightBlue: '#3B82F6',
      brightMagenta: '#A855F7',
      brightCyan: '#06B6D4',
      brightWhite: '#9CA3AF'
    }
  },
  
  dark: {
    // Panel backgrounds - True neutral grays, no blue tint
    sidePanel: '#1A1A1A',       // Very dark gray for file tree and terminal
    centerPanel: '#242424',     // Slightly lighter gray for preview (better contrast)
    
    // App structure
    background: '#0D0D0D',      // Almost black background
    topBar: '#1A1A1A',          // Match side panels
    border: '#333333',          // Neutral gray border
    
    // Text colors
    textPrimary: '#E5E5E5',     // Slightly off-white for softer look
    textSecondary: '#999999',   // True neutral gray
    
    // UI elements
    accent: '#6B6B6B',          // Neutral gray accent
    hover: 'rgba(255, 255, 255, 0.08)',     // Subtle white overlay for hover
    selected: 'rgba(255, 255, 255, 0.12)',  // Slightly stronger for selected
    
    // Component colors
    buttonBg: '#27272A',        // zinc-800 (shadcn standard)
    buttonHover: '#1D1D20',     // Darker than button bg for subtle hover
    modalBg: '#1A1A1A',         // Match side panels
    
    // Terminal theme
    terminal: {
      background: '#1A1A1A',    // Match side panel
      foreground: '#E5E5E5',    // Slightly off-white
      cursor: '#E5E5E5',        // White cursor, no purple
      cursorAccent: '#1A1A1A',
      selection: 'rgba(255, 255, 255, 0.15)',  // White selection, no purple
      
      // ANSI colors (adjusted for true dark theme)
      black: '#333333',
      red: '#FF6B6B',
      green: '#4ECB71',
      yellow: '#FFD93D',
      blue: '#6BCBFF',
      magenta: '#FF6BCB',
      cyan: '#4ECBCB',
      white: '#E5E5E5',
      
      // Bright ANSI colors
      brightBlack: '#666666',
      brightRed: '#FF9999',
      brightGreen: '#6EE7B7',
      brightYellow: '#FFE66D',
      brightBlue: '#99DDFF',
      brightMagenta: '#FF99DD',
      brightCyan: '#7EE7E7',
      brightWhite: '#FFFFFF'
    }
  }
}

export type Theme = typeof themes.light
export type ThemeMode = 'light' | 'dark'