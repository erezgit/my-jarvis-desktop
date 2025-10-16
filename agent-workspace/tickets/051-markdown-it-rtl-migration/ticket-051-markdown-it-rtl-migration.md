# Ticket #051: Migrate from react-markdown to markdown-it for RTL Support

## Status
🎯 **Planning** - Research Complete, Ready for Implementation

## Problem Statement

### Current Situation
- **Library**: Using `react-markdown` with `remark-gfm` for markdown rendering
- **RTL Issue**: Hebrew and Arabic text not rendering correctly (stays LTR)
- **Root Cause**: react-markdown and CommonMark spec don't have native RTL support
- **Failed Attempts**:
  - ✗ `dir="rtl"` with manual detection
  - ✗ `dir="auto"` on all components
  - ✗ Frontmatter parsing
  - ✗ Unicode RTL marks
  - ✗ Inline styles with `textAlign: 'right'`

### VS Code/Cursor Success
- Hebrew markdown files display correctly in VS Code and Cursor
- Both use **markdown-it** library, not react-markdown
- Automatic RTL detection works out of the box

## Research Findings

### Library Comparison

#### react-markdown (Current)
- **Engine**: remark (unified/rehype ecosystem)
- **Spec**: CommonMark
- **RTL Support**: ❌ None - requires custom plugins
- **Issue**: GitHub issue #197 - RTL/bidirectional text rendering
- **Workaround**: Custom components with `dir="auto"` (not working for us)

#### markdown-it (VS Code/Cursor)
- **Engine**: Pure JavaScript CommonMark parser
- **Spec**: CommonMark with 100% support
- **RTL Support**: ✅ Via plugins and HTML attributes
- **Community**: Large plugin ecosystem
- **Performance**: High speed, optimized
- **React Integration**: Available via `markdown-it-react` or direct rendering

### How VS Code Handles RTL

1. **Base Library**: markdown-it for parsing
2. **RTL Extension**: VS Code has "RTL Markdown" extension available
3. **GitHub's Approach** (announced Nov 2021):
   - Detect first strong character in paragraph
   - Apply `dir="auto"` automatically
   - Follows HTML5 spec for bidirectional text
4. **Browser**: Unicode Bidirectional Algorithm handles the rest

### Key Insight from Research

> **GitLab's Solution**: Add `dir="auto"` to rendered HTML elements
>
> **HTML5 Spec**: Using first character to indicate direction is consistent with `dir="auto"`
>
> **Browser Behavior**: Looks at first strongly typed character to determine base direction

The issue isn't the markdown parser itself - it's **how the HTML is rendered** after parsing!

## Solution: markdown-it Migration

### Why markdown-it?

1. **Proven**: Used by VS Code, Cursor, and many production tools
2. **Extensible**: 150+ community plugins
3. **RTL Ready**: HTML output can include `dir="auto"` attributes
4. **Performance**: Faster than remark pipeline
5. **Simpler**: Direct HTML output, no AST transformation needed

### Implementation Strategy

#### Phase 1: Research & Planning (Current)
- [x] Document current react-markdown implementation
- [x] Research VS Code/Cursor markdown rendering
- [x] Identify markdown-it plugins needed
- [x] Create migration plan

#### Phase 2: Core Migration
- [ ] Install markdown-it and required plugins
- [ ] Create MarkdownItRenderer component
- [ ] Add `dir="auto"` to all block elements (p, h1-h6, ul, ol)
- [ ] Test with Hebrew content
- [ ] Test with mixed Hebrew/English content
- [ ] Test with pure English content

#### Phase 3: Feature Parity
- [ ] Ensure GFM support (tables, strikethrough, task lists)
- [ ] Maintain syntax highlighting
- [ ] Preserve dark/light theme support
- [ ] Keep all custom styling

#### Phase 4: Testing & Validation
- [ ] Test all existing markdown files
- [ ] Verify ticket #050 renders correctly
- [ ] Test performance with large files
- [ ] Cross-browser testing

## Technical Implementation

### Required Packages

```bash
npm install markdown-it
npm install @types/markdown-it --save-dev

# Plugins for feature parity
npm install markdown-it-github-alerts  # GFM features
npm install markdown-it-anchor         # Heading anchors
npm install markdown-it-attrs          # Custom attributes
```

### New Component Architecture

```typescript
// MarkdownItRenderer.tsx
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,          // Enable HTML tags
  linkify: true,       // Auto-convert URLs
  typographer: true,   // Smart quotes
});

// Custom renderer to add dir="auto"
md.renderer.rules.paragraph_open = (tokens, idx) => {
  return '<p dir="auto">';
};

md.renderer.rules.heading_open = (tokens, idx) => {
  const level = tokens[idx].tag;
  return `<${level} dir="auto">`;
};

// Similar for ul, ol, blockquote, etc.
```

### RTL Auto-Detection Strategy

**Option A: Renderer Rules (Recommended)**
```typescript
// Add dir="auto" to all block elements during render
md.renderer.rules.paragraph_open = () => '<p dir="auto">';
md.renderer.rules.heading_open = (tokens, idx) => {
  return `<${tokens[idx].tag} dir="auto">`;
};
```

**Option B: Post-Processing Plugin**
```typescript
// Custom plugin to inject dir="auto" into HTML
function rtlPlugin(md) {
  md.core.ruler.after('block', 'rtl_auto', (state) => {
    // Inject dir="auto" into tokens
  });
}
```

**Option C: HTML Wrapper**
```typescript
// Wrap entire output in dir="auto" container
<div dir="auto" dangerouslySetInnerHTML={{ __html: md.render(source) }} />
```

**Decision**: Use **Option A** (Renderer Rules) for fine-grained control

## Migration Checklist

### Pre-Migration
- [ ] Backup current MarkdownRenderer.tsx
- [ ] Document all custom components
- [ ] List all markdown features currently used
- [ ] Create test suite with Hebrew/English samples

### Migration Steps
1. [ ] Install markdown-it packages
2. [ ] Create new MarkdownItRenderer component
3. [ ] Implement basic rendering
4. [ ] Add dir="auto" to all block elements
5. [ ] Add GFM support
6. [ ] Add syntax highlighting (highlight.js or prism)
7. [ ] Apply theme-aware styling
8. [ ] Test Hebrew rendering
9. [ ] Replace old component
10. [ ] Remove react-markdown dependencies

### Post-Migration
- [ ] Test all existing tickets
- [ ] Verify Hebrew ticket #050
- [ ] Performance benchmarks
- [ ] Update documentation
- [ ] Clean up unused code

## Files to Modify

### Primary Changes
- `app/components/FilePreview/mdx/MarkdownRenderer.tsx` - Complete rewrite
- `package.json` - Update dependencies

### Testing Files
- All `.md` files in `tickets/` directory
- Specifically: `tickets/050-hebrew-rtl-support/טיקט-050-תמיכה-בעברית-RTL.md`

### Documentation
- Architecture document to note markdown-it migration
- Add notes about RTL support

## Expected Benefits

### Immediate
- ✅ Hebrew text renders RTL automatically
- ✅ Mixed Hebrew/English text handles correctly
- ✅ Matches VS Code/Cursor behavior

### Long-term
- 🚀 Better performance (markdown-it is faster)
- 🔌 Access to 150+ plugins
- 📦 Simpler architecture (no AST transformation)
- 🌍 Support for all RTL languages (Arabic, Hebrew, Persian, etc.)

## Risks & Mitigation

### Risk 1: Breaking Changes
**Impact**: Existing markdown might render differently
**Mitigation**:
- Keep old component as backup
- Test all existing files
- Side-by-side comparison during development

### Risk 2: Missing Features
**Impact**: Custom components or styling might not work
**Mitigation**:
- Document all current features first
- Implement feature parity before switching
- Use plugins for missing functionality

### Risk 3: Learning Curve
**Impact**: markdown-it API different from react-markdown
**Mitigation**:
- Review markdown-it documentation thoroughly
- Start with simple implementation
- Iterate to add features

## Success Criteria

### Must Have
1. ✅ Hebrew text renders RTL (right-aligned, correct order)
2. ✅ English text renders LTR (left-aligned)
3. ✅ Mixed content handles correctly
4. ✅ All GFM features work (tables, strikethrough, etc.)
5. ✅ Syntax highlighting preserved
6. ✅ Dark/light theme support maintained

### Nice to Have
1. 🎯 Improved performance over react-markdown
2. 🎯 Plugin ecosystem for future enhancements
3. 🎯 Better error handling
4. 🎯 More markdown features available

## Timeline Estimate

- **Phase 2 (Core Migration)**: 2-3 hours
- **Phase 3 (Feature Parity)**: 2-3 hours
- **Phase 4 (Testing)**: 1-2 hours
- **Total**: 5-8 hours

## References

### Documentation
- markdown-it: https://github.com/markdown-it/markdown-it
- VS Code Markdown: https://code.visualstudio.com/docs/languages/markdown
- HTML5 dir attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir

### Related Issues
- react-markdown #197: RTL/LTR bidirectional text rendering
- markdown-it #635: Support for Right-to-Left languages
- VS Code #139643: RTL support for markdown preview

### Research Sessions
- Date: 2025-10-07
- Research: 10 web searches on RTL markdown rendering
- Finding: VS Code uses markdown-it, not react-markdown
- Key insight: `dir="auto"` on block elements is the standard solution

---

**Created**: 2025-10-07
**Status**: Ready for Implementation
**Owner**: Erez Fern + Claude (Jarvis)
**Target**: Ticket #050 RTL rendering fix
