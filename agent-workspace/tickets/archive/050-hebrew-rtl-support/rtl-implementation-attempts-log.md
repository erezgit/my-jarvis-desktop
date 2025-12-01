# RTL Implementation Attempts Log - Ticket #050

**Date**: 2025-10-07
**Goal**: Display Hebrew text in markdown files with proper RTL (Right-to-Left) rendering
**Current Status**: ❌ FAILED - None of the attempts have successfully rendered RTL text

---

## Attempt #1: HTML `div` with `dir="rtl"`

**What we tried:**
Added `<div dir="rtl">` wrapper directly in the markdown file content.

**Why it failed:**
The markdown renderer (react-markdown) did not process the HTML tags - they appeared as literal text in the preview instead of being rendered as HTML elements.

**Key learning:**
Markdown renderers don't automatically process raw HTML unless explicitly configured, and even then, wrapping content in HTML doesn't affect the renderer's output structure.

---

## Attempt #2: YAML Frontmatter with `dir: rtl`

**What we tried:**
- Added YAML frontmatter `---\ndir: rtl\n---` to markdown files
- Installed `gray-matter` package to parse frontmatter
- Modified MarkdownRenderer to read frontmatter and apply `dir="rtl"` to wrapper div and all child components

**Why it failed:**
Even with `dir="rtl"` attribute correctly applied to HTML elements, the browser's bidirectional algorithm wasn't being triggered properly. The attribute was present but text alignment remained LTR.

**Key learning:**
Setting `dir="rtl"` on wrapper elements alone isn't sufficient - each block-level element needs its own direction attribute for proper inheritance and alignment.

---

## Attempt #3: Unicode RTL Mark (U+200F)

**What we tried:**
Added Unicode Right-to-Left Mark character (U+200F) at the beginning of markdown content.

**Why it failed:**
The invisible Unicode character alone doesn't force element-level RTL direction without proper HTML structure and attributes. It's meant for inline text direction hints, not block-level layout.

**Key learning:**
Unicode bidirectional control characters are insufficient for markdown rendering - they work for plain text but not structured HTML output.

---

## Attempt #4: CSS Inline Styles with `dir="rtl"`

**What we tried:**
Added inline CSS styles `style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }}` to all react-markdown component overrides while keeping `dir="rtl"`.

**Why it failed:**
React-markdown's component architecture doesn't properly propagate direction to all nested elements. The styling was applied but inconsistently inherited by child elements.

**Key learning:**
React-markdown has fundamental limitations with RTL support - the component-based override approach doesn't match how native HTML handles bidirectional text.

---

## Attempt #5: Migration to `markdown-it` with `dir="auto"`

**What we tried:**
- Completely replaced react-markdown with markdown-it library (same library VS Code uses)
- Added `dir="auto"` attribute via custom renderer rules to all block elements (headings, paragraphs, lists, blockquotes)
- Added `text-align: start` CSS property for proper alignment

**Why it failed:**
Despite using markdown-it and adding `dir="auto"` to individual renderer rules, the text still rendered LTR. The attribute was being set but not triggering browser's automatic direction detection.

**Key learning:**
Setting attributes in individual renderer rules may not cover all token types, and the order/method of attribute application matters for markdown-it.

---

## Attempt #6: VS Code Exact Implementation with `attrJoin`

**What we tried:**
- Studied VS Code source code (PR #139644, file `markdownEngine.ts`)
- Implemented **exact** VS Code approach:
  - Override main `render()` function
  - Use `token.attrJoin('dir', 'auto')` (not `attrSet`)
  - Apply to all tokens where `token.map` exists and `token.type !== 'inline'`
- Removed all custom styling attempts
- Performed clean build (deleted `dist`, `out`, cache)

**Why it STILL failed:**
Unknown. This is the exact implementation VS Code uses, yet Hebrew text continues to display LTR in our application while displaying RTL correctly in VS Code/Cursor viewing the same markdown file.

**Key learning:**
There must be an environmental or structural difference between our Electron app and VS Code's markdown preview that affects how `dir="auto"` is processed. Possible factors:
1. CSS conflicts/overrides in our app
2. Different DOM structure wrapping the markdown content
3. Electron rendering engine differences
4. Missing CSS properties that VS Code includes by default
5. Parent container interference with direction inheritance

---

## Current Implementation

**File**: `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/app/components/FilePreview/mdx/MarkdownRenderer.tsx`

**Code**:
```typescript
// Override render to add dir="auto" to all block tokens (VS Code approach)
const originalRender = markdownIt.renderer.render;
markdownIt.renderer.render = function(tokens, options, env) {
  tokens.forEach((token, idx) => {
    if (token.map && token.type !== 'inline') {
      token.attrJoin('dir', 'auto');
    }
  });
  return originalRender.call(this, tokens, options, env);
};
```

**Result**: Hebrew text still displays LTR despite `dir="auto"` being present on all block elements.

---

## Diagnostic Questions to Answer

1. **Is `dir="auto"` actually being rendered in the HTML?**
   - Need to inspect rendered HTML in browser DevTools
   - Check if attribute is present on `<p>`, `<h1>`, etc. elements

2. **Are there CSS overrides preventing direction from working?**
   - Check computed styles in DevTools
   - Look for `direction: ltr !important` or similar
   - Inspect `text-align` and `unicode-bidi` properties

3. **Is the wrapper div interfering?**
   - Current wrapper has `dir="auto"` AND `className="markdown-body"`
   - Try removing wrapper `dir="auto"` since children have it
   - Check if `markdown-body` class has direction-related CSS

4. **Is Hebrew text actually being detected by browser?**
   - Test with simple HTML file: `<p dir="auto">טקסט בעברית</p>`
   - Compare behavior in standalone HTML vs our app

5. **Is there a parent container forcing LTR?**
   - Check FilePreview component hierarchy
   - Look for `dir="ltr"` on ancestors
   - Inspect entire DOM path from `<body>` to markdown content

6. **Does markdown-it need additional plugins?**
   - VS Code might use plugins we're missing
   - Check for `markdown-it-attrs` or similar BiDi plugins

---

## Recommended Next Steps (Priority Order)

### Step 1: HTML Inspection & Debugging
1. Open DevTools in the Electron app
2. Inspect a Hebrew heading element
3. Verify `dir="auto"` attribute is present
4. Check computed CSS `direction` property
5. Look for any `direction` or `text-align` overrides

### Step 2: Isolate the Problem
Create a minimal test case:
```typescript
// Temporary test in MarkdownRenderer
const htmlContent = md.render('# טיקט בעברית\n\nטקסט בעברית');
console.log('Rendered HTML:', htmlContent);
```
Check if the HTML string itself contains `dir="auto"`.

### Step 3: CSS Investigation
1. Search entire codebase for CSS rules affecting `.markdown-body`
2. Check if Tailwind or global styles set `direction: ltr`
3. Try adding explicit CSS override:
```css
.markdown-body * {
  direction: inherit !important;
}
```

### Step 4: Compare with Working VS Code
1. Open VS Code DevTools (Help → Toggle Developer Tools)
2. Preview the same Hebrew markdown file
3. Inspect the rendered HTML structure
4. Compare HTML attributes and CSS properties side-by-side

### Step 5: Test Standalone HTML
Create a test HTML file to verify Electron's rendering:
```html
<!DOCTYPE html>
<html>
<body>
  <p dir="auto">This is English</p>
  <p dir="auto">זה טקסט בעברית</p>
</body>
</html>
```
Load in Electron to confirm browser engine handles `dir="auto"` correctly.

### Step 6: Alternative Approach - First-Character Detection
If `dir="auto"` continues failing, implement GitHub's approach manually:
- Check first strong character in each block
- Use Unicode ranges: Hebrew is U+0590 to U+05FF
- Explicitly set `dir="rtl"` for blocks starting with Hebrew
- Set `dir="ltr"` for blocks starting with Latin

### Step 7: Consider markdown-it Plugin
Research and try `markdown-it-bidi` or similar community plugins that explicitly handle RTL content.

---

## Critical Unknown

**Why does the exact same code work in VS Code but not in our Electron app?**

The most likely culprits:
1. **CSS Conflicts**: Our app has custom styles that override or interfere with direction
2. **Parent Context**: The FilePreview or Preview component structure affects inheritance
3. **Rendering Context**: Electron's Chrome version or renderer settings differ from VS Code's implementation
4. **Missing Reset**: VS Code might reset/normalize direction-related properties that we don't

**Action needed**: Direct comparison debugging between working VS Code preview and our non-working app.
