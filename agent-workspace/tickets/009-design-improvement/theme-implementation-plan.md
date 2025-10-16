# Theme System Implementation Plan

## Overview
Systematic migration from hardcoded colors to a proper light/dark theme system based on Flow's design aesthetic.

## Design Specifications

### Light Theme (Flow-inspired)
- **Side Panels (File Tree & Terminal)**: Light gray (#F5F5F5 or similar)
- **Center Panel (Document Preview)**: Pure white (#FFFFFF)
- **Borders/Separators**: Medium gray (#E5E5E5)
- **Text**: Dark gray/black (#1F1F1F)
- **Headers**: Same as panel backgrounds with subtle bottom border

### Dark Theme (Current)
- **All Panels**: Dark gray (#1e1e1e)
- **Borders/Separators**: rgba(255, 255, 255, 0.25)
- **Text**: White/light gray
- **Headers**: Same as panel backgrounds with subtle bottom border

## Implementation Steps

### Phase 1: Setup Theme Variables
**File: `/app/styles/globals.css`**

#### 1.1 Add Custom Panel Colors
```css
@layer base {
  :root {
    /* Existing variables... */
    
    /* Custom panel colors */
    --panel-sidebar: #F5F5F5;
    --panel-center: #FFFFFF;
    --panel-border: #E5E5E5;
    --header-border: rgba(0, 0, 0, 0.06);
  }

  .dark {
    /* Existing variables... */
    
    /* Custom panel colors */
    --panel-sidebar: #1e1e1e;
    --panel-center: #1e1e1e;
    --panel-border: rgba(255, 255, 255, 0.25);
    --header-border: rgba(255, 255, 255, 0.1);
  }
}
```

#### 1.2 Extend Tailwind Config
**Create: `/tailwind.config.js`**
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'panel-sidebar': 'var(--panel-sidebar)',
        'panel-center': 'var(--panel-center)',
        'panel-border': 'var(--panel-border)',
        'header-border': 'var(--header-border)',
      }
    }
  }
}
```

### Phase 2: Remove Hardcoded Colors

#### 2.1 Main App Component
**File: `/app/app.tsx`**

**Current (Line 41):**
```tsx
<div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
```
**Change to:**
```tsx
<div className="h-full flex flex-col overflow-hidden bg-panel-sidebar">
```

**Current (Line 55):**
```tsx
<div className="h-full flex flex-col" style={{ backgroundColor: '#1e1e1e' }}>
```
**Change to:**
```tsx
<div className="h-full flex flex-col bg-panel-center">
```

**Current (Line 79):**
```tsx
<div className="h-full pl-4 pr-0 py-4" style={{ backgroundColor: '#1e1e1e' }}>
```
**Change to:**
```tsx
<div className="h-full pl-4 pr-0 py-4 bg-panel-sidebar">
```

#### 2.2 Terminal Component
**File: `/app/components/ProperTerminal.tsx`**

**Current (Line 202):**
```tsx
backgroundColor: '#1e1e1e',
```
**Change to:**
```tsx
backgroundColor: 'transparent', // Will inherit from parent
```

#### 2.3 Resizable Component
**File: `/app/components/ui/resizable.tsx`**

**Current (Line 40):**
```tsx
"relative w-[1px] bg-border",
```
**Change to:**
```tsx
"relative w-[1px] bg-panel-border",
```

#### 2.4 Resizable CSS
**File: `/app/styles/resizable.css`**

Update all border colors to use CSS variables:
```css
[data-slot="resizable-handle"] {
  background-color: var(--panel-border) !important;
}

[data-slot="resizable-handle"]:hover {
  background-color: var(--panel-border) !important;
}
```

#### 2.5 Header Borders
**Files: `/app/app.tsx` and `/app/components/VirtualizedFileTree.tsx`**

**Current:**
```tsx
className="... border-b border-border/10"
```
**Change to:**
```tsx
className="... border-b border-header-border"
```

### Phase 3: Create Theme Toggle Component

#### 3.1 Theme Provider
**Create: `/app/components/theme-provider.tsx`**
```tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: 'system',
  setTheme: () => null,
})

export function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeProviderContext)
```

#### 3.2 Theme Toggle Button
**Create: `/app/components/theme-toggle.tsx`**
```tsx
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => {
        setTheme(theme === 'light' ? 'dark' : 'light')
      }}
      className="p-2 hover:bg-accent rounded-md"
    >
      {theme === 'light' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
```

### Phase 4: Integration

#### 4.1 Wrap App with Theme Provider
**File: `/app/renderer.tsx`**
```tsx
import { ThemeProvider } from './components/theme-provider'

ReactDOM.render(
  <ThemeProvider defaultTheme="light">
    <App />
  </ThemeProvider>,
  document.getElementById('app')
)
```

#### 4.2 Add Theme Toggle to UI
Add the theme toggle button to one of the panel headers (e.g., file tree header)

### Phase 5: Testing Checklist

#### Components to Verify:
- [ ] File tree panel background (should be gray in light, dark in dark)
- [ ] Document preview panel (should be white in light, dark in dark)
- [ ] Terminal panel background (should be gray in light, dark in dark)
- [ ] All headers (60px height, consistent colors)
- [ ] Border lines between panels (1px, proper color)
- [ ] Terminal text visibility in both themes
- [ ] File tree text visibility in both themes
- [ ] Document content readability in both themes
- [ ] Markdown rendering in both themes
- [ ] Code syntax highlighting in both themes

#### Functionality Tests:
- [ ] Theme toggle works instantly
- [ ] Theme persists on page reload
- [ ] System preference detection works
- [ ] No flash of wrong theme on load
- [ ] Terminal resizing works in both themes
- [ ] Panel dragging works in both themes

### Phase 6: localStorage Persistence

#### 6.1 Save Theme Preference
```typescript
useEffect(() => {
  localStorage.setItem('theme', theme)
}, [theme])
```

#### 6.2 Load Theme on Init
```typescript
const [theme, setTheme] = useState<Theme>(() => {
  return (localStorage.getItem('theme') as Theme) || 'system'
})
```

### Phase 7: Clean Up

#### Final Checks:
1. Remove all inline `style` attributes with hardcoded colors
2. Ensure all color values use CSS variables
3. Verify no TypeScript errors with theme types
4. Test on different screen sizes
5. Test with different system preferences

### Migration Order (Critical Path)

1. **Create theme variables in globals.css** ✅
2. **Create and setup Tailwind config** ✅
3. **Update app.tsx panel backgrounds** ✅
4. **Update terminal component** ✅
5. **Update file tree component** ✅
6. **Update resizable borders** ✅
7. **Create theme provider** ✅
8. **Create theme toggle** ✅
9. **Integrate and test** ✅
10. **Add persistence** ✅

## Notes

- **No hardcoded colors**: Every color must use a CSS variable
- **Consistent naming**: Use `panel-` prefix for panel-specific colors
- **Type safety**: Ensure all theme types are properly typed in TypeScript
- **Performance**: Theme switching should be instant with no flicker
- **Accessibility**: Ensure sufficient contrast in both themes

## Reference Colors from Flow

Based on the screenshot in ticket #9:
- Light sidebar: ~#F7F7F7
- White center: #FFFFFF
- Border lines: ~#E0E0E0
- Purple accent: #7C3AED (for active states)

## Rollback Plan

If issues arise:
1. Git revert to previous commit
2. Keep hardcoded colors as temporary fallback
3. Implement theme system incrementally per component

---

**Implementation Time Estimate**: 2-3 hours
**Risk Level**: Low (CSS changes only, no logic changes)
**Testing Required**: Manual testing in both themes