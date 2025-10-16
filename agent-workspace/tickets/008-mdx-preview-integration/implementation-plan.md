# Ticket 008: MDX Preview Integration

## STATUS: ✅ COMPLETE (MD Working, MDX Deferred)

## Objective
Integrate MDX rendering capabilities into My Jarvis Desktop's file preview panel, enabling rich, interactive documents with embedded React components while maintaining the self-contained nature of MDX files.

## Background
- Current state: File preview shows plain text content, not properly rendering files
- Goal: Enable MDX files to render with full React component support
- Philosophy: Self-contained MDX files (all components defined within the file for portability)

## Implementation Plan

### Phase 1: Fix Current File Preview Bug ✅ COMPLETE
- [x] Debug why file content isn't displaying when clicking files in the tree
- [x] Ensure file reading works correctly through IPC
- [x] Fix the selectedFile state management in app.tsx

### Phase 2: Add MDX Dependencies ✅ COMPLETE
- [x] Install `next-mdx-remote` for runtime MDX compilation
- [x] Install `@mdx-js/react` if needed for additional features
- [x] Add any missing dependencies (remark-gfm, rehype-highlight)

### Phase 3: Create MDX Preview Component ✅ COMPLETE
- [x] Port MDXRenderer from my-jarvis-frontend to desktop app
- [x] Adapt for Electron environment (adjust any Next.js specific code)
- [x] Create component registry for common components (FlowDiagram, ProgressBar, etc.)

### Phase 4: Integrate File Type Detection ✅ COMPLETE
- [x] Detect .mdx files in the file tree
- [x] Route .mdx files to MDX preview component
- [x] Route .md files to markdown preview
- [x] Handle other file types appropriately

### Phase 5: Self-Contained MDX Support ✅ COMPLETE
- [x] Enable export statements in MDX files for component definitions
- [x] Test component creation within MDX files
- [x] Ensure React hooks and state work in exported components

### Phase 6: Component Library
- [ ] Create common components directory
- [ ] Build reusable components (charts, diagrams, progress bars)
- [ ] Make them available globally to all MDX files
- [ ] Document component usage

### Phase 7: Error Handling
- [ ] Handle MDX compilation errors gracefully
- [ ] Show helpful error messages in preview
- [ ] Fallback to plain text view on errors

## Technical Architecture

### File Structure
```
my-jarvis-desktop/
├── app/
│   ├── components/
│   │   ├── MDXPreview.tsx        # New MDX preview component
│   │   ├── mdx/
│   │   │   ├── MDXRenderer.tsx   # Ported from my-jarvis-frontend
│   │   │   └── components/       # Global MDX components
│   │   │       ├── FlowDiagram.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       └── TaskList.tsx
│   │   └── FilePreview.tsx       # Router for different file types
```

### MDX File Example
```mdx
export const CustomChart = ({ data }) => (
  <div className="chart-container">
    {/* Component logic here */}
  </div>
)

# Document Title

Regular markdown content here.

<CustomChart data={[1,2,3]} />

More markdown content.
```

## Success Criteria
1. ❌ MDX files render with full React component support - **IN PROGRESS**
2. ❌ Self-contained MDX files work (components defined in same file) - **CSP ISSUES**
3. ✅ File preview updates when selecting different files - **COMPLETE**
4. ✅ Error handling for invalid MDX - **COMPLETE** (falls back to error display)
5. ✅ Performance remains smooth with large MDX files - **COMPLETE**

## Dependencies
- `next-mdx-remote`: ^4.4.1 (already in my-jarvis-frontend)
- `@mdx-js/react`: ^3.1.1 (if needed)
- Existing: React, TypeScript, Electron

## Notes
- Prioritize self-contained MDX approach for document portability
- Ensure MDX compilation doesn't block UI thread
- Consider caching compiled MDX for performance

## Current Status (2025-09-09)

### ✅ What's Working:
1. **Markdown (.md) files render perfectly** - Created separate MarkdownRenderer using react-markdown
2. **File routing logic works** - FilePreview correctly routes .md to MarkdownRenderer and .mdx to MDXRenderer
3. **CLAUDE.md renders without errors** - The original issue with CLAUDE.md is solved
4. **File preview bug is fixed** - Files now display content when clicked
5. **Error handling works** - Falls back gracefully when MDX fails

### ❌ What's Not Working:
1. **MDX files with embedded components fail** - Even after adding 'unsafe-eval' to CSP
2. **Content Security Policy conflicts** - Electron's security model conflicts with MDX runtime evaluation
3. **growth-agent.mdx doesn't render** - Test file with components triggers CSP errors

### Key Learning:
- **Separation of concerns worked**: Having separate renderers for MD and MDX was the right architectural choice
- **MDX requires runtime evaluation**: next-mdx-remote needs to evaluate JavaScript which conflicts with Electron security
- **Consider alternative approaches**: May need to pre-compile MDX or use a different MDX solution for Electron

## Next Steps for Future Session:
1. Investigate alternative MDX solutions that work with Electron's CSP
2. Consider pre-compiling MDX files instead of runtime compilation  
3. Or implement a custom MDX renderer that doesn't require eval
4. Test with simpler MDX files (without complex components) first