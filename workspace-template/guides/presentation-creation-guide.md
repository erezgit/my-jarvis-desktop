# Presentation Creation Guide

**For Dev Agent: How to Create Presentations in My Jarvis Desktop**

This guide explains how to create presentations that work perfectly with the Sandpack preview and PDF export system.

---

## Overview

My Jarvis Desktop supports creating interactive presentations as React components that:
- Render live in Sandpack preview (no pre-registration needed)
- Export to pixel-perfect PDFs saved directly to the workspace
- Support RTL languages (Hebrew, Arabic, etc.)
- Are fully self-contained (no external dependencies except npm packages)

---

## Critical Requirements

### 1. Single File Structure

**IMPORTANT**: Sandpack only supports SINGLE FILE React components.

❌ **DON'T DO THIS:**
```typescript
// app.tsx
import { Button } from './components/ui/button';  // ❌ External import won't work
import { Card } from './components/ui/card';       // ❌ Won't work in Sandpack
```

✅ **DO THIS:**
```typescript
// app.tsx - Everything in one file
const Button = ({ children, onClick }: any) => {
  return <button onClick={onClick}>{children}</button>;
};

const Card = ({ children }: any) => {
  return <div className="card">{children}</div>;
};

export default function App() {
  // Your presentation code
}
```

### 2. Slide Container Requirements

**CRITICAL**: The slide container MUST have the `data-pdf-slide` attribute for PDF export to work.

```typescript
export default function App() {
  return (
    <div style={{ /* outer container */ }}>
      {/* Presentation Container - 16:9 aspect ratio */}
      <div
        data-pdf-slide  // ← REQUIRED for PDF export
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '1100px',
          aspectRatio: '16 / 9',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          overflow: 'hidden',
          padding: '3rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Slide content here */}
      </div>

      {/* Navigation buttons - OUTSIDE the slide container */}
      <div style={{ /* navigation */ }}>
        <button onClick={prevSlide}>Previous</button>
        <button onClick={nextSlide}>Next</button>
      </div>
    </div>
  );
}
```

### 3. Navigation Structure

Navigation elements (buttons, indicators) MUST be OUTSIDE the `data-pdf-slide` container so they don't appear in the exported PDF.

```typescript
{/* ✅ CORRECT: Navigation outside slide container */}
<div style={{ /* page wrapper */ }}>
  <div data-pdf-slide style={{ /* slide */ }}>
    {/* Only slide content here */}
  </div>

  {/* Navigation outside */}
  <div style={{ /* navigation wrapper */ }}>
    <button>Previous</button>
    <button>Next</button>
  </div>
</div>
```

```typescript
{/* ❌ WRONG: Navigation inside slide container */}
<div data-pdf-slide style={{ /* slide */ }}>
  {/* Slide content */}
  <button>Previous</button>  {/* ❌ Will appear in PDF */}
</div>
```

### 4. Slide Indicators for PDF Export

**CRITICAL**: Use `aria-label` attributes on slide indicator buttons so the PDF exporter can detect slide count.

For RTL presentations (Hebrew/Arabic):
```typescript
<button
  onClick={() => goToSlide(index)}
  aria-label={`עבור לשקופית ${index + 1}`}  // ← REQUIRED
  style={{ /* styles */ }}
/>
```

For LTR presentations (English):
```typescript
<button
  onClick={() => goToSlide(index)}
  aria-label={`Go to slide ${index + 1}`}  // ← REQUIRED
  style={{ /* styles */ }}
/>
```

---

## Complete Template

Here's a complete working template following all requirements:

```typescript
import React, { useState } from 'react';

// Define all components inline
const Button = ({ children, onClick, disabled, style = {} }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      borderRadius: '0.375rem',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      ...style
    }}
  >
    {children}
  </button>
);

const Card = ({ children, style = {} }: any) => (
  <div
    style={{
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      padding: '1rem',
      ...style
    }}
  >
    {children}
  </div>
);

// Slides data
const slides = [
  {
    id: 1,
    title: 'Welcome',
    content: <div>Welcome to the presentation</div>
  },
  {
    id: 2,
    title: 'Slide 2',
    content: <Card>This is slide 2</Card>
  },
  {
    id: 3,
    title: 'Slide 3',
    content: <div>This is slide 3</div>
  }
];

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#e5e7eb',
        padding: '2rem',
        gap: '1.5rem',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Presentation Container - 16:9 aspect ratio */}
      <div
        data-pdf-slide  // REQUIRED for PDF export
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '1100px',
          aspectRatio: '16 / 9',
          backgroundColor: '#ffffff',
          color: '#111827',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          overflow: 'hidden',
          padding: '3rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Slide Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {slide.title}
          </h1>
          <div>{slide.content}</div>
        </div>
      </div>

      {/* Navigation - Outside the slide container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', gap: '2rem' }}>
        <Button onClick={prevSlide} disabled={currentSlide === 0}>
          Previous
        </Button>

        {/* Slide Indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}  // REQUIRED for PDF export
              style={{
                height: '0.5rem',
                width: currentSlide === index ? '2rem' : '0.5rem',
                borderRadius: '9999px',
                backgroundColor: currentSlide === index ? '#3b82f6' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>

        <Button onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

---

## Styling Guidelines

### Use Inline Styles

Sandpack works best with inline styles. Avoid CSS files or CSS-in-JS libraries unless they're in the dependencies.

```typescript
// ✅ Good
<div style={{ color: 'red', fontSize: '2rem' }}>Hello</div>

// ❌ Avoid
<div className="text-red-500">Hello</div>  // No Tailwind in Sandpack
```

### Color Schemes

Define colors at the top for consistency:

```typescript
const colors = {
  primary: '#3b82f6',
  background: '#ffffff',
  text: '#111827',
  border: '#e5e7eb'
};
```

### Responsive Design

Use `maxWidth` and percentage-based widths:

```typescript
style={{
  width: '100%',
  maxWidth: '1100px',  // Constrains on large screens
}}
```

---

## RTL Support

For Hebrew, Arabic, or other RTL languages:

```typescript
<div style={{ direction: 'rtl' }}>
  {/* RTL content */}
</div>
```

**Note**: Use RTL-appropriate aria-labels for slide indicators:
```typescript
aria-label={`עבור לשקופית ${index + 1}`}  // Hebrew
aria-label={`انتقل إلى الشريحة ${index + 1}`}  // Arabic
```

---

## PDF Export Process

### How PDF Export Works

1. User says: "Export this presentation to PDF" or "Make me a PDF"
2. Agent calls bash script: `./tools/src/jarvis_pdf_export.sh "path/to/presentation.tsx"`
3. Script output triggers `PDFExportMessage` in frontend
4. Frontend PDF exporter:
   - Finds the Sandpack iframe
   - Locates element with `data-pdf-slide` attribute
   - Counts slides using `aria-label` attributes
   - Programmatically navigates through each slide
   - Captures each slide at 1920x1080 resolution
   - Combines into multi-page PDF
   - Sends to backend
5. Backend saves PDF to same directory as presentation
6. User receives voice confirmation: "PDF exported successfully to: my-jarvis/tickets/002/presentation.pdf"

### File Locations

If presentation is at: `my-jarvis/tickets/002/app.tsx`
PDF will be saved to: `my-jarvis/tickets/002/presentation.pdf`

### Custom Filenames

User can specify custom filename:
```
User: "Export this to quarterly-results.pdf"
```

### How Jarvis Triggers Export

When user asks to export a presentation, Jarvis should:

1. Identify the presentation file path (e.g., `my-jarvis/tickets/002/app.tsx`)
2. Call the PDF export script:

```bash
/workspace/tools/src/jarvis_pdf_export.sh "/workspace/my-jarvis/tickets/002/app.tsx"
```

With custom filename:
```bash
/workspace/tools/src/jarvis_pdf_export.sh --filename "quarterly-results.pdf" "/workspace/my-jarvis/tickets/002/app.tsx"
```

The script will output a trigger pattern that the frontend detects and automatically starts the PDF capture process.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: External Imports
```typescript
import { Button } from './components/ui/button';  // Won't work
```

### ❌ Mistake 2: Missing data-pdf-slide
```typescript
<div style={{ /* slide styles */ }}>  // Missing data-pdf-slide
  {/* content */}
</div>
```

### ❌ Mistake 3: Navigation Inside Slide
```typescript
<div data-pdf-slide>
  <button>Next</button>  // Will appear in PDF!
</div>
```

### ❌ Mistake 4: Missing aria-labels
```typescript
<button onClick={() => goToSlide(0)}>  // No aria-label
  •
</button>
```

### ❌ Mistake 5: Using CSS Classes
```typescript
<div className="bg-blue-500">  // Tailwind won't work
```

---

## Testing Checklist

Before considering a presentation complete, verify:

- [ ] All components defined inline in single file
- [ ] `data-pdf-slide` attribute on slide container
- [ ] Navigation elements outside slide container
- [ ] `aria-label` on all slide indicator buttons
- [ ] Inline styles (no external CSS)
- [ ] Presentation renders in Sandpack preview
- [ ] Can navigate between slides
- [ ] PDF export works (test by saying "export to PDF")
- [ ] PDF contains only slides, no navigation
- [ ] PDF saves to correct ticket directory

---

## Example Use Case

**User Request**: "Create a 5-slide presentation about quarterly results in Hebrew"

**Dev Agent Response**:

1. Create `app.tsx` in ticket directory
2. Define all components inline (Button, Card, etc.)
3. Create slides array with 5 slides in Hebrew
4. Add main App component with:
   - Outer wrapper with gray background
   - Slide container with `data-pdf-slide` attribute
   - Slide content with Hebrew text and RTL direction
   - Navigation outside container with Hebrew aria-labels
5. Save file
6. Sandpack automatically renders it
7. User can navigate slides
8. User says "export to PDF"
9. PDF saves to ticket directory

---

## Quick Reference

### Required Attributes
```typescript
data-pdf-slide          // On slide container
aria-label="..."        // On slide indicator buttons
```

### Required Structure
```typescript
<div>                           // Page wrapper
  <div data-pdf-slide>          // Slide container
    {/* Slide content only */}
  </div>
  <div>                         // Navigation wrapper
    {/* Buttons and indicators */}
  </div>
</div>
```

### File Locations
```
presentation file:  my-jarvis/tickets/XXX/app.tsx
exported PDF:       my-jarvis/tickets/XXX/presentation.pdf
```

---

## Summary

**Key Points for Dev Agent:**

1. **Single file**: All components inline, no external imports
2. **data-pdf-slide**: Required on slide container
3. **Navigation outside**: Keep buttons/indicators outside slide container
4. **aria-labels**: Required on slide indicator buttons
5. **Inline styles**: No external CSS or Tailwind
6. **Test before delivery**: Ensure preview and PDF export work

Following this guide ensures presentations work perfectly with Sandpack preview and export flawlessly to PDF files saved directly in the workspace.

---

**Last Updated**: 2025-10-21
**Version**: 1.0
**Related Ticket**: #066
