# Ticket 002: File Directory and File Preview Implementation

## Architecture Decisions
Based on research and discussion, we've made the following key architectural decisions:

### Layout Structure
- **Left Panel**: File Directory Tree (local machine files)
- **Middle Panel**: File Preview (selected file content)
- **Right Panel**: Terminal (existing, unchanged)

### File System Integration
- **File System Watching**: Using Tauri's built-in file system watcher (notify-rs)
- **Automatic Updates**: Directory tree and preview refresh on file system changes
- **No User Configuration**: Works out-of-the-box without MCP setup
- **Tool Agnostic**: Works with any editor (Claude Code, VS Code, manual edits)

### Update Behavior
- **Directory Tree**: Always refreshes when files are added/removed/modified
- **File Preview**: Only updates if currently viewing the changed file
- **New Files**: Appear in tree immediately but don't auto-switch preview
- **UX Philosophy**: Maintain user focus, don't interrupt reading/editing

### Technical Approach
- **Single Container**: All three panels managed by main App component
- **Shared State**: React Context for communication between panels
- **Event-Driven**: File system events trigger UI updates
- **Performance**: On-demand file loading, virtualized lists for large directories

## Requirements

### Core Functionality
- [ ] **Local File System Directory Browser** - Display actual machine files and directories in hierarchical tree view
- [ ] **Parent Directory Selection** - Clickable parent folder header that opens system file finder dialog for directory selection
- [ ] **File Preview Panel** - Display selected file content with markdown rendering and syntax highlighting  
- [ ] **File Type Support** - Handle common file types (.md, .txt, .js, .ts, .py, .json, .yaml, etc.)
- [ ] **Responsive Design** - Seamless experience across desktop screen sizes
- [ ] **Search Functionality** - Filter files and directories by name/path
- [ ] **File Operations** - Basic create, edit, save capabilities

### User Experience
- [ ] **Intuitive Navigation** - Click to select files, expand/collapse folders
- [ ] **Visual Hierarchy** - Clear iconography for files vs directories, open vs closed folders
- [ ] **Active State** - Highlight currently selected file across both panels
- [ ] **Empty States** - Graceful handling when no directory selected or files present
- [ ] **Loading States** - Smooth transitions during file system operations
- [ ] **Error Handling** - User-friendly messages for permission errors, file not found, etc.

### Technical Requirements
- [ ] **Tauri Integration** - Use Tauri's file system APIs for secure local access
- [ ] **Performance** - Efficient rendering of large directory structures (1000+ files)
- [ ] **Memory Management** - Load file content on-demand, not all at once
- [ ] **Cross-Platform** - Work consistently on macOS, Windows, Linux
- [ ] **Type Safety** - Full TypeScript implementation with proper interfaces

## Architecture

### Component Structure
```
FileExplorer/
├── FileDirectoryPanel/          # Left panel - directory tree
│   ├── DirectoryHeader          # Clickable parent folder selector
│   ├── DirectoryTree            # Hierarchical file/folder view  
│   ├── SearchBar               # File/folder name filtering
│   └── FileNode                # Individual file/folder items
├── FilePreviewPanel/           # Right panel - file content display
│   ├── FileHeader              # Selected file name and metadata
│   ├── ContentViewer           # Main content display area
│   └── EditMode               # Optional editing capabilities
└── FileExplorerContext/        # State management for both panels
```

### Data Flow Architecture
```
1. Directory Selection Flow:
   User clicks parent header → Tauri file dialog → Directory selected → 
   File system scan → Tree structure built → UI updated

2. File Selection Flow:  
   User clicks file in tree → File ID captured → Content loaded on-demand →
   Preview panel updated → Active state synchronized

3. File Operations Flow:
   User actions (create/edit) → Validation → Tauri file operations → 
   File system updated → UI state refreshed
```

### State Management
- **Directory State**: Current selected directory path, scan results, tree structure
- **Selection State**: Currently active file, selected files for operations  
- **UI State**: Expanded folders, search filters, view preferences
- **Content State**: Loaded file contents, edit mode, unsaved changes

### Integration Points
- **Tauri Commands**: Custom commands for file operations, directory dialogs
- **Terminal Integration**: Selected files can be opened in terminal context
- **Theme System**: Consistent with existing dark/light theme implementation

## Implementation Plan

### Phase 1: Foundation & Directory Selection (Week 1)
- [x] **1.1: Create base component structure**
  - Set up FileExplorer parent component with two-panel layout
  - Create FileDirectoryPanel and FilePreviewPanel placeholders
  - Implement responsive CSS Grid layout following existing patterns

- [x] **1.2: Implement directory selection**
  - Add DirectoryHeader component with folder icon and path display
  - Integrate Tauri's dialog API for folder selection
  - Handle user permissions and error cases gracefully

- [x] **1.3: Basic file system scanning**
  - Create Tauri command for recursive directory scanning
  - Implement file/folder detection with proper typing
  - Add basic error handling and loading states

- [x] **1.4: Initial tree structure building**
  - Build hierarchical data structure from flat file list
  - Implement tree rendering with expand/collapse functionality
  - Add file/folder icons using Lucide React icons

### Phase 2: Core Functionality Polish ✅
- [x] **2.1: Tree view functionality**
  - Implement click-to-select file behavior
  - Create active file highlighting system with proper hover states
  - Expand/collapse folders on click

- [x] **2.2: Performance optimization**
  - Add React.memo optimization for tree nodes
  - Optimize re-renders with proper memoization
  - Ensure smooth performance with large directories

### Phase 3: File Preview - Core Display Only ✅
- [x] **3.1: Basic file preview**
  - Display plain text content for selected files
  - Show file metadata (size, modified date)
  - Handle common file types (.txt, .md, .js, .ts, .json, etc.)
  - Error states for binary/unsupported files

### Future Enhancements (Not in current scope)
- Advanced file operations (create, edit, delete, rename)
- Search and filtering functionality
- Keyboard navigation and shortcuts
- Syntax highlighting and markdown rendering
- Image preview support
- Edit mode capabilities

### Technical Implementation Notes

#### Key Technologies
- **React 18** with hooks for component logic
- **TypeScript** for type safety and better DX
- **Tailwind CSS** for consistent styling
- **Tauri APIs** for secure file system access
- **React Virtualized** for performance with large lists
- **Monaco Editor** for advanced code editing (optional)

#### File Structure Pattern (following My Jarvis standards)
```
src/components/
├── file-explorer/
│   ├── FileExplorer.tsx           # Main container component
│   ├── FileDirectoryPanel.tsx     # Left panel directory tree
│   ├── FilePreviewPanel.tsx       # Right panel file preview
│   ├── DirectoryHeader.tsx        # Parent folder selector
│   ├── DirectoryTree.tsx          # Tree view implementation
│   ├── FileNode.tsx              # Individual file/folder component
│   ├── ContentViewer.tsx         # File content display
│   └── SearchBar.tsx             # File search functionality
├── hooks/
│   ├── useFileSystem.ts          # File operations hook
│   ├── useDirectoryTree.ts       # Tree state management
│   └── useFileContent.ts         # Content loading hook
└── types/
    └── file-explorer.ts          # TypeScript interfaces
```

#### Best Practices Learned from Analysis
1. **Component Optimization**: Use React.memo with proper comparison functions
2. **Error Boundaries**: Wrap file operations in error boundaries  
3. **Performance**: Implement virtualization for large file lists
4. **Accessibility**: Proper ARIA labels and keyboard navigation
5. **Mobile Ready**: Responsive design patterns from My Jarvis frontend
6. **State Management**: Local state with Context API for complex interactions
7. **Type Safety**: Comprehensive TypeScript interfaces for all file operations

#### Success Criteria
- [x] Can browse local file system with intuitive navigation
- [x] Parent directory selection works via system file dialog
- [x] File preview updates instantly when selecting different files
- [x] Supports common file types with appropriate preview
- [x] Shows file metadata (size, modified date)
- [x] Handles binary files gracefully with appropriate message
- [x] File system watching automatically updates UI when files change
- [x] Performance optimized with React.memo for tree nodes
- [x] Clean, focused UI without unnecessary features

---

*This ticket implements the core file management foundation for My Jarvis Desktop, following patterns from the My Jarvis frontend while adapting for local file system access through Tauri.*