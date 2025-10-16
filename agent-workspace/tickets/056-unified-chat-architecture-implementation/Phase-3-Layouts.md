# Phase 3: Layout Integration

**Status:** ✅ Complete
**Dependencies:** Phase 1 (ChatHeader), Phase 2 (ChatPage refactoring)
**Estimated Time:** 60-90 minutes

---

## 📋 Phase Checklist

### ResponsiveLayout.tsx
- [x] ✅ Add `useMemo` to React imports
- [x] ✅ Add `import { ChatPage } from '../ChatPage'`
- [x] ✅ Add `currentView` state with useState
- [x] ✅ Create handleChatClick callback
- [x] ✅ Create handleHistoryClick callback
- [x] ✅ Create handleSettingsClick callback
- [x] ✅ Create chatElement with useMemo
- [x] ✅ Pass chatInterface to DesktopLayout
- [x] ✅ Pass chatInterface to MobileLayout
- [x] ✅ Pass currentView and callbacks to both layouts

### DesktopLayout.tsx
- [x] ✅ Remove `import { ChatPage } from '../ChatPage'`
- [x] ✅ Add `import { ChatHeader } from '../chat/ChatHeader'`
- [x] ✅ Add chatInterface to interface
- [x] ✅ Add ChatHeader props to interface
- [x] ✅ Update props destructuring
- [x] ✅ Wrap chat panel in flex column container
- [x] ✅ Add ChatHeader component
- [x] ✅ Wrap chatInterface in flex-1 container

### MobileLayout.tsx
- [x] ✅ Remove `import { ChatPage } from '../ChatPage'`
- [x] ✅ Add `Settings` icon import from lucide-react
- [x] ✅ Add chatInterface to interface
- [x] ✅ Add ChatHeader props to interface
- [x] ✅ Update props destructuring
- [x] ✅ Integrate ChatHeader buttons into toolbar
- [x] ✅ Add conditional rendering for ChatHeader buttons
- [x] ✅ Replace ChatPage with chatInterface

---

## 🎯 Objective

Integrate the refactored ChatPage and new ChatHeader component into all three layout files. Establish the single-instance pattern where ResponsiveLayout creates one ChatPage component and passes it to both desktop and mobile layouts as a prop.

---

## 📝 File 1: ResponsiveLayout.tsx

### Current Code (Lines 1-72)

```tsx
// app/components/Layout/ResponsiveLayout.tsx
import { useState, useEffect } from 'react'  // ← ADD useMemo here
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

// ... FileItem interface (lines 5-17) ...

export function ResponsiveLayout() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const isDesktop = useIsDesktop()

  // Conditional rendering - only ONE layout exists in DOM at a time
  return (
    <div className="h-screen">
      {isDesktop ? (
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      ) : (
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      )}
    </div>
  )
}
```

### New Code

```tsx
// app/components/Layout/ResponsiveLayout.tsx
import { useState, useEffect, useMemo } from 'react'  // ← ADD useMemo
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { ChatPage } from '../ChatPage'  // ← ADD ChatPage import

// ... FileItem interface remains ...

export function ResponsiveLayout() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat')  // ← ADD ChatHeader state
  const isDesktop = useIsDesktop()

  // Create chat element ONCE (like frontend line 240-250)
  const chatElement = useMemo(() => (
    <ChatPage />
  ), []);  // ← Empty array: no dependencies, ChatPage is self-contained

  // ChatHeader callbacks - manage view state
  const handleChatClick = () => setCurrentView('chat');
  const handleHistoryClick = () => setCurrentView('history');
  const handleSettingsClick = () => {
    // TODO: Implement settings modal or navigation
    console.log('Settings clicked');
  };

  return (
    <div className="h-screen">
      {isDesktop ? (
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          chatInterface={chatElement}  // ← Pass as prop!
          currentView={currentView}  // ← Pass ChatHeader state
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />
      ) : (
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          chatInterface={chatElement}  // ← Same instance!
          currentView={currentView}  // ← Pass ChatHeader state
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />
      )}
    </div>
  )
}
```

### Key Changes (ResponsiveLayout)

1. **Import useMemo** - Add to React imports (line 1)
2. **Import ChatPage** - New import statement
3. **Add currentView state** - Track chat vs history view
4. **Create callbacks** - handleChatClick, handleHistoryClick, handleSettingsClick
5. **Create chatElement** - Use useMemo with empty dependency array `[]`
6. **Pass to layouts** - chatInterface prop AND ChatHeader state/callbacks

---

## 📝 File 2: DesktopLayout.tsx

### Current Code (Lines 1-154 - abbreviated)

```tsx
// app/components/Layout/DesktopLayout.tsx
import { useRef, useEffect, useState } from 'react'
// ... other imports ...
import { ChatPage } from '../ChatPage'  // ← REMOVE THIS IMPORT
// ... more imports ...

interface DesktopLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  // chatInterface missing
}

export function DesktopLayout({ selectedFile, onFileSelect }: DesktopLayoutProps) {
  // ... file operation logic (lines 34-111) - STAYS UNCHANGED ...

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* File Tree Panel */}
      <Panel>
        <VirtualizedFileTree ref={fileTreeRef} workingDirectory={workingDirectory} onFileSelect={onFileSelect} />
      </Panel>

      <PanelResizeHandle />

      {/* File Preview Panel */}
      <Panel>
        <FilePreview file={selectedFile} />
      </Panel>

      <PanelResizeHandle />

      {/* Chat Panel */}
      <Panel className="bg-white dark:bg-gray-900">
        <ChatPage />  {/* ← Direct render, needs to be prop */}
      </Panel>
    </PanelGroup>
  );
}
```

### New Code

```tsx
// app/components/Layout/DesktopLayout.tsx
import { useRef, useEffect, useState } from 'react'
// ... other imports ...
// REMOVE: import { ChatPage } from '../ChatPage'
import { ChatHeader } from '../chat/ChatHeader'  // ← ADD ChatHeader import
// ... more imports ...

interface DesktopLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  chatInterface: React.ReactNode  // ← ADD THIS
  currentView: 'chat' | 'history'  // ← ADD ChatHeader state
  onChatClick: () => void
  onHistoryClick: () => void
  onSettingsClick: () => void
}

export function DesktopLayout({
  selectedFile,
  onFileSelect,
  chatInterface,
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick
}: DesktopLayoutProps) {
  // ... file operation logic (lines 34-111) - COMPLETELY UNCHANGED ...

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* File Tree Panel - UNCHANGED */}
      <Panel defaultSize={20} minSize={15} maxSize={30}>
        <VirtualizedFileTree ref={fileTreeRef} workingDirectory={workingDirectory} onFileSelect={onFileSelect} />
      </Panel>

      <PanelResizeHandle />

      {/* File Preview Panel - UNCHANGED */}
      <Panel defaultSize={50} minSize={25} maxSize={60}>
        <FilePreview file={selectedFile} />
      </Panel>

      <PanelResizeHandle />

      {/* Chat Panel - WITH HEADER AND CONTENT */}
      <Panel defaultSize={30} minSize={20} maxSize={60} className="bg-white dark:bg-gray-900">
        <div className="h-full flex flex-col">
          {/* ChatHeader toolbar - NEW */}
          <ChatHeader
            currentView={currentView}
            onChatClick={onChatClick}
            onHistoryClick={onHistoryClick}
            onSettingsClick={onSettingsClick}
          />

          {/* Chat content - fills remaining space */}
          <div className="flex-1 min-h-0">
            {chatInterface}
          </div>
        </div>
      </Panel>
    </PanelGroup>
  );
}
```

### Key Changes (DesktopLayout)

1. **Remove ChatPage import** - Delete import statement
2. **Add ChatHeader import** - from '../chat/ChatHeader'
3. **Add chatInterface prop** - React.ReactNode type
4. **Add ChatHeader props** - currentView and callbacks
5. **Wrap chat panel** - flex column container (h-full)
6. **Add ChatHeader** - Toolbar at top
7. **Wrap chatInterface** - flex-1 min-h-0 for proper scrolling

### Desktop Layout Structure

```
Chat Panel (h-full)
├── Outer div (h-full flex flex-col)
│   ├── ChatHeader (fixed height toolbar)
│   └── Inner div (flex-1 min-h-0)
│       └── chatInterface (ChatPage component)
```

---

## 📝 File 3: MobileLayout.tsx

### Current Code (Lines 1-191 - abbreviated)

```tsx
// app/components/Layout/MobileLayout.tsx
import { useState, useRef, useEffect } from 'react'
// ... other imports ...
import { ChatPage } from '../ChatPage'  // ← REMOVE THIS IMPORT
// ... more imports ...

interface MobileLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  // chatInterface missing
}

export function MobileLayout({ selectedFile, onFileSelect }: MobileLayoutProps) {
  // ... file operation logic (lines 38-106) - STAYS UNCHANGED ...

  return (
    <MobileScrollLock>
      <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* Navigation Bar - UNCHANGED */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
          {/* Panel toggle buttons */}
        </div>

        {/* Panel Container */}
        <div className="flex-1 relative overflow-hidden">
          {currentPanel === 'chat' && (
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">
              <ChatPage isMobile={true} />  {/* ← Direct render with prop */}
            </div>
          )}
        </div>
      </div>
    </MobileScrollLock>
  );
}
```

### New Code

```tsx
// app/components/Layout/MobileLayout.tsx
import { useState, useRef, useEffect } from 'react'
// ... other imports ...
// REMOVE: import { ChatPage } from '../ChatPage'
import { ChatHeader } from '../chat/ChatHeader'  // ← ADD ChatHeader import
// ... more imports ...

interface MobileLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  chatInterface: React.ReactNode  // ← ADD THIS
  currentView: 'chat' | 'history'  // ← ADD ChatHeader state
  onChatClick: () => void
  onHistoryClick: () => void
  onSettingsClick: () => void
}

export function MobileLayout({
  selectedFile,
  onFileSelect,
  chatInterface,
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick
}: MobileLayoutProps) {
  // ... file operation logic (lines 38-106) - COMPLETELY UNCHANGED ...

  return (
    <MobileScrollLock>
      <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* Navigation Bar with integrated ChatHeader buttons */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left: Panel switchers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPanel('files')}
                className={`px-3 py-1.5 rounded-lg ${
                  currentPanel === 'files' ? 'bg-blue-100 dark:bg-blue-900' : ''
                }`}
              >
                Files
              </button>
              <button
                onClick={() => setCurrentPanel('preview')}
                className={`px-3 py-1.5 rounded-lg ${
                  currentPanel === 'preview' ? 'bg-blue-100 dark:bg-blue-900' : ''
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setCurrentPanel('chat')}
                className={`px-3 py-1.5 rounded-lg ${
                  currentPanel === 'chat' ? 'bg-blue-100 dark:bg-blue-900' : ''
                }`}
              >
                Chat Panel
              </button>
            </div>

            {/* Right: ChatHeader buttons (only visible when chat panel active) */}
            {currentPanel === 'chat' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onChatClick}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    currentView === 'chat'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={onHistoryClick}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    currentView === 'history'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  History
                </button>
                <button onClick={onSettingsClick} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  ⚙️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel Container */}
        <div className="flex-1 relative overflow-hidden">
          {currentPanel === 'files' && (
            <div className="h-full flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900">
              <VirtualizedFileTree ref={fileTreeRef} workingDirectory={workingDirectory} onFileSelect={onFileSelect} />
            </div>
          )}

          {currentPanel === 'preview' && (
            <div className="h-full flex flex-col overflow-auto bg-white dark:bg-gray-900">
              <FilePreview file={selectedFile} />
            </div>
          )}

          {currentPanel === 'chat' && (
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">
              {chatInterface}  {/* ← Just render prop, no ChatPage import! */}
            </div>
          )}
        </div>
      </div>
    </MobileScrollLock>
  );
}
```

### Key Changes (MobileLayout)

1. **Remove ChatPage import** - Delete import statement
2. **Add ChatHeader import** - from '../chat/ChatHeader' (for reference)
3. **Add chatInterface prop** - React.ReactNode type
4. **Add ChatHeader props** - currentView and callbacks
5. **Integrate buttons into toolbar** - Right side of navigation bar
6. **Conditional rendering** - ChatHeader buttons only when chat panel active
7. **Replace ChatPage** - Use chatInterface prop instead

### Mobile Toolbar Structure

```
Mobile Toolbar
├── Left side: Panel switchers
│   ├── [Files]
│   ├── [Preview]
│   └── [Chat Panel]
└── Right side: ChatHeader buttons (when chat panel active)
    ├── [Chat]
    ├── [History]
    └── [Settings]
```

---

## ✅ Validation Checklist

### Code Validation
- [ ] ResponsiveLayout imports useMemo and ChatPage
- [ ] ResponsiveLayout creates currentView state
- [ ] ResponsiveLayout creates three callbacks
- [ ] ResponsiveLayout creates chatElement with useMemo
- [ ] ResponsiveLayout passes chatInterface to both layouts
- [ ] ResponsiveLayout passes currentView and callbacks to both layouts
- [ ] DesktopLayout removes ChatPage import
- [ ] DesktopLayout adds ChatHeader import
- [ ] DesktopLayout interface includes all new props
- [ ] DesktopLayout wraps chat panel correctly
- [ ] DesktopLayout renders ChatHeader and chatInterface
- [ ] MobileLayout removes ChatPage import
- [ ] MobileLayout interface includes all new props
- [ ] MobileLayout integrates ChatHeader buttons into toolbar
- [ ] MobileLayout conditionally shows ChatHeader buttons
- [ ] MobileLayout renders chatInterface instead of ChatPage

### Functional Validation
- [ ] No TypeScript errors in any layout file
- [ ] No console warnings
- [ ] Desktop layout renders without errors
- [ ] Mobile layout renders without errors
- [ ] ChatHeader appears in desktop chat panel
- [ ] ChatHeader buttons appear in mobile toolbar when chat active
- [ ] Clicking Chat button updates view
- [ ] Clicking History button updates view
- [ ] Clicking Settings button triggers callback

---

## 📊 Phase Completion Criteria

✅ **Phase 3 is complete when:**
1. All three layout files updated correctly
2. Single ChatPage instance created in ResponsiveLayout
3. ChatHeader integrated in both desktop and mobile
4. All validation checklist items pass
5. No TypeScript or linting errors
6. Desktop and mobile layouts render correctly
7. ChatHeader buttons functional (even if views not implemented)

---

## 🎯 Next Phase

Once Phase 3 is complete, proceed to:
- **[Phase 4: Testing & Validation](./Phase-4-Testing.md)**

---

**Estimated Completion Time:** 60-90 minutes
