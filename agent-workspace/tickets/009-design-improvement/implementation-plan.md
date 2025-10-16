# Ticket 009: Color Scheme Implementation

## STATUS: IN PROGRESS

## Objective
Extract and implement the color scheme from Flow design (as shown in screenshot) with light and dark mode support for My Jarvis Desktop application.

## Design Reference
Screenshot shows Flow's interface with:
- Light gray sidebar background (~#F5F5F5)
- White main content area
- Purple accent color (#7C3AED)
- Professional neutral color palette

## Scope (FOCUSED)
This ticket focuses ONLY on implementing the color scheme:
- Extract colors from Flow design
- Implement light/dark mode toggle
- Apply colors to all three panels
- Update terminal theme colors

## Color Specifications

### Light Mode
**Panel Backgrounds:**
- Left Panel (File Tree): `#F5F5F5` (light gray)
- Center Panel (Preview): `#FFFFFF` (white)
- Right Panel (Terminal): `#F5F5F5` (light gray - matches file tree)

**Text & UI:**
- Primary Text: `#2D2D2D`
- Secondary Text: `#6B7280`
- Borders: `#E5E7EB`
- Accent: `#7C3AED` (purple)

### Dark Mode (Current)
**Panel Backgrounds:**
- Left Panel (File Tree): `#1F2937`
- Center Panel (Preview): `#111827`
- Right Panel (Terminal): `#1F2937` (matches file tree)

**Text & UI:**
- Primary Text: `#F3F4F6`
- Secondary Text: `#9CA3AF`
- Borders: `#374151`
- Accent: `#A78BFA` (lighter purple)

## Terminal Theme Implementation

### Technical Requirements
- Terminal uses xterm.js v5.5.0
- Must create NEW theme object for updates (reference comparison)
- Update via `terminal.options.theme = newThemeObject`
- Do NOT modify existing theme object properties

### Light Mode Terminal Theme
```javascript
const lightTerminalTheme = {
  background: '#F5F5F5',     // Match file tree gray
  foreground: '#2D2D2D',     // Dark text
  cursor: '#7C3AED',         // Purple accent
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
};
```

### Dark Mode Terminal Theme
```javascript
const darkTerminalTheme = {
  background: '#1F2937',     // Match file tree dark gray
  foreground: '#F3F4F6',     // Light text
  cursor: '#A78BFA',         // Light purple accent
  cursorAccent: '#1F2937',
  selection: 'rgba(167, 139, 250, 0.3)',
  
  // ANSI colors (standard dark theme)
  black: '#374151',
  red: '#F87171',
  green: '#34D399',
  yellow: '#FBBF24',
  blue: '#60A5FA',
  magenta: '#C084FC',
  cyan: '#22D3EE',
  white: '#F3F4F6',
  
  // Bright ANSI colors
  brightBlack: '#6B7280',
  brightRed: '#FCA5A5',
  brightGreen: '#6EE7B7',
  brightYellow: '#FCD34D',
  brightBlue: '#93C5FD',
  brightMagenta: '#DDD6FE',
  brightCyan: '#67E8F9',
  brightWhite: '#FFFFFF'
};
```

## Implementation Details

### 1. Terminal Theme Update Method
```javascript
// In ProperTerminal.tsx
updateTheme(isDarkMode: boolean) {
  if (!this.terminal) return;
  
  // IMPORTANT: Create new object, don't modify existing
  this.terminal.options.theme = isDarkMode 
    ? { ...darkTerminalTheme } 
    : { ...lightTerminalTheme };
}
```

### 2. React Theme Context
- Create ThemeProvider component
- Store theme preference in localStorage
- Provide theme state to all components
- Synchronize terminal theme with app theme

### 3. Tailwind Configuration
- Define color variables in CSS
- Use CSS custom properties for dynamic theming
- Update tailwind.config.js with color tokens

## UI Toggle Implementation
- Add user button to top bar (right side)
- Button opens shadcn dropdown/popover modal
- Modal contains theme toggle switch (light/dark)
- Theme preference saved to localStorage
- All components react to theme change via Context

## Elements Requiring Color Updates (Systematic Checklist)

### Main Application Structure
- [ ] App root background (`bg-background`)
- [ ] Top bar background and border
- [ ] Top bar text and icons
- [ ] Resizable panel handles
- [ ] Panel divider borders

### Left Panel - File Tree
- [ ] Panel background (currently hardcoded `#1e1e1e`)
- [ ] File/folder text colors
- [ ] File/folder icon colors
- [ ] Hover state backgrounds
- [ ] Selected item background and text
- [ ] Tree indent guides
- [ ] Scrollbar colors

### Center Panel - Document Preview
- [ ] Panel background (currently hardcoded `#1e1e1e`)
- [ ] Header section background
- [ ] Header text and icon
- [ ] Header border
- [ ] Content area background
- [ ] Primary text color
- [ ] Secondary text color
- [ ] Code block backgrounds
- [ ] Syntax highlighting colors
- [ ] Link colors
- [ ] Scrollbar colors

### Right Panel - Terminal
- [ ] Panel container background (currently hardcoded `#1e1e1e`)
- [ ] Terminal theme object (via xterm.js):
  - [ ] Background
  - [ ] Foreground
  - [ ] Cursor
  - [ ] Selection
  - [ ] All 16 ANSI colors

### UI Components
- [ ] User button background and hover
- [ ] Dropdown/modal background
- [ ] Dropdown border and shadow
- [ ] Toggle switch colors
- [ ] Button text colors
- [ ] Focus ring colors
- [ ] Tooltip backgrounds

## Implementation Steps
1. [ ] Create theme constants file with all color definitions
2. [ ] Create ThemeContext and ThemeProvider
3. [ ] Add user button to top bar
4. [ ] Implement dropdown modal with theme toggle
5. [ ] Remove all hardcoded colors from app.tsx
6. [ ] Update panel backgrounds to use theme
7. [ ] Update file tree component colors
8. [ ] Update preview panel colors
9. [ ] Implement terminal theme switching
10. [ ] Update all UI component colors
11. [ ] Add CSS variables for dynamic theming
12. [ ] Test all elements in both modes
13. [ ] Verify color contrast accessibility
14. [ ] Ensure smooth transitions between themes

## Success Criteria
- [ ] Light/dark mode toggle works globally
- [ ] Terminal background matches file tree in both modes
- [ ] Center panel is white (light) or dark (dark mode)
- [ ] All terminal colors are readable on their backgrounds
- [ ] Theme preference persists between sessions
- [ ] No visual artifacts during theme switching

## Technical Notes
- xterm.js uses reference comparison for theme updates
- Must create new theme object, not modify existing
- Terminal theme is separate from CSS but should be synchronized
- Consider WCAG contrast ratios for accessibility

## Next Steps
1. Implement theme system foundation
2. Update all components with theme-aware colors
3. Test with various terminal outputs (git diff, npm, etc.)
4. Fine-tune colors based on readability