# PDF Export Implementation Plan - Updated

**Date**: 2025-10-21
**Status**: Ready for implementation
**Approach**: Frontend hidden capture with html2canvas + jsPDF

---

## Executive Summary

After reviewing the actual presentation structure (custom React components, not Spectacle), we've refined the PDF export approach:

**Key Decisions**:
- ✅ **100% pixel-perfect**: Frontend capture with html2canvas
- ✅ **Hidden capture**: No visual disruption for user
- ✅ **Conversational trigger**: Message-type pattern (like voice messages)
- ✅ **Desktop-first**: Start with desktop, add mobile later if needed

---

## Presentation Structure Analysis

**Current Implementation** (tickets/002/app.tsx):
```typescript
// Custom React presentation - NOT using Spectacle
// Structure:
- Outer container: Full viewport with gray background
- Slide container: 16:9 aspect ratio, white background, max-width 1100px
  - Contains slide content (title, subtitle, cards, etc.)
- Navigation section: Outside slide container
  - Previous button
  - Slide indicators (dots)
  - Next button
```

**Key Insights**:
1. No external presentation library = simpler capture
2. Slide container already visually isolated
3. Navigation is outside the slide container
4. Uses inline styles = consistent rendering
5. RTL support via direction prop

**Improvements Needed for PDF**:
1. Add `data-pdf-slide` attribute to slide container
2. Temporarily use fixed dimensions (1920x1080) during capture
3. Ensure no transitions/animations during capture

---

## Implementation Plan

### Phase 1: Install Dependencies
```bash
cd /workspace/my-jarvis/projects/my-jarvis-desktop
npm install html2canvas jspdf
```

### Phase 2: Create PDF Capture Utility

**File**: `app/utils/presentation-pdf-exporter.ts`

```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CaptureOptions {
  filePath: string; // Path to the .tsx file
  filename?: string; // Output filename
}

/**
 * Captures a presentation from Sandpack and exports to PDF
 *
 * Strategy:
 * 1. Find the Sandpack iframe containing the presentation
 * 2. Access the slide container via data-pdf-slide attribute
 * 3. Get total slide count and current slide state
 * 4. For each slide:
 *    - Navigate to slide
 *    - Temporarily set fixed dimensions (1920x1080)
 *    - Capture with html2canvas
 *    - Restore responsive styling
 *    - Add to PDF
 * 5. Download PDF
 */
export async function exportPresentationToPDF(
  options: CaptureOptions
): Promise<void> {
  const { filePath, filename = 'presentation.pdf' } = options;

  try {
    // Find Sandpack iframe
    const sandpackIframe = findSandpackIframe();
    if (!sandpackIframe) {
      throw new Error('Could not find Sandpack preview');
    }

    // Access iframe content
    const iframeDoc = sandpackIframe.contentDocument || sandpackIframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Could not access iframe content');
    }

    // Find slide container
    const slideContainer = iframeDoc.querySelector('[data-pdf-slide]') as HTMLElement;
    if (!slideContainer) {
      throw new Error('Could not find presentation slide container. Make sure the presentation has data-pdf-slide attribute.');
    }

    // Get presentation state (slides count, navigation functions)
    const presentationState = getPresentationState(iframeDoc);
    const { totalSlides, goToSlide } = presentationState;

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080]
    });

    // Capture each slide
    for (let i = 0; i < totalSlides; i++) {
      // Navigate to slide
      goToSlide(i);

      // Wait for render
      await sleep(500);

      // Temporarily set fixed dimensions
      const originalStyle = setFixedDimensions(slideContainer);

      // Capture slide
      const canvas = await html2canvas(slideContainer, {
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore responsive styling
      restoreStyle(slideContainer, originalStyle);

      // Add to PDF
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
    }

    // Download
    pdf.save(filename);

    return;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

function findSandpackIframe(): HTMLIFrameElement | null {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    // Sandpack iframes have specific src pattern
    if (iframe.src.includes('sandpack')) {
      return iframe;
    }
  }
  return null;
}

function getPresentationState(doc: Document) {
  // Access window object from iframe
  const win = doc.defaultView;
  if (!win) {
    throw new Error('Could not access iframe window');
  }

  // Count slides (look for slide indicator buttons)
  const indicators = doc.querySelectorAll('[aria-label*="עבור לשקופית"]');
  const totalSlides = indicators.length;

  // Create navigation function
  const goToSlide = (index: number) => {
    const button = doc.querySelector(`[aria-label="עבור לשקופית ${index + 1}"]`) as HTMLElement;
    if (button) {
      button.click();
    }
  };

  return { totalSlides, goToSlide };
}

function setFixedDimensions(element: HTMLElement) {
  const originalStyle = {
    width: element.style.width,
    height: element.style.height,
    maxWidth: element.style.maxWidth,
    aspectRatio: element.style.aspectRatio
  };

  element.style.width = '1920px';
  element.style.height = '1080px';
  element.style.maxWidth = '1920px';
  element.style.aspectRatio = 'unset';

  return originalStyle;
}

function restoreStyle(element: HTMLElement, originalStyle: any) {
  element.style.width = originalStyle.width;
  element.style.height = originalStyle.height;
  element.style.maxWidth = originalStyle.maxWidth;
  element.style.aspectRatio = originalStyle.aspectRatio;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Phase 3: Add Message Type Handler

**File**: `app/hooks/useMessageProcessor.ts` (or similar)

Add PDF export message type:

```typescript
// Add to message type definitions
interface PDFExportMessage {
  type: 'pdf_export';
  filePath: string;
  filename?: string;
}

// In message processor
if (message.type === 'pdf_export') {
  const { filePath, filename } = message;

  try {
    await exportPresentationToPDF({ filePath, filename });
    // Optionally show success notification
  } catch (error) {
    console.error('PDF export failed:', error);
    // Show error notification
  }
}
```

### Phase 4: Update Presentation Template

**Guidance for Dev Agent**:

When creating presentations, ensure the slide container has the `data-pdf-slide` attribute:

```typescript
<div
  data-pdf-slide  // <- Add this
  style={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '1100px',
    aspectRatio: '16 / 9',
    backgroundColor: colors.background,
    // ... rest of styles
  }}
>
  {/* Slide content */}
</div>
```

### Phase 5: Conversational Trigger

**How it works**:

1. User says: "Export this presentation to PDF" or "Make me a PDF"
2. Agent detects intent
3. Agent responds with:
   ```
   {
     "type": "text",
     "content": "Creating your PDF now..."
   },
   {
     "type": "pdf_export",
     "filePath": "/workspace/my-jarvis/tickets/002/app.tsx",
     "filename": "presentation.pdf"
   }
   ```
4. Frontend sees `pdf_export` message type
5. Calls `exportPresentationToPDF()`
6. PDF downloads to user's computer
7. Agent confirms: "PDF downloaded successfully"

---

## Implementation Checklist

### Today:
- [ ] Install html2canvas and jspdf
- [ ] Create `app/utils/presentation-pdf-exporter.ts`
- [ ] Add PDF export message type to types
- [ ] Add message handler in useMessageProcessor
- [ ] Test with existing presentation in tickets/002

### Testing:
- [ ] Verify slide container has data-pdf-slide attribute
- [ ] Test single-slide presentation
- [ ] Test multi-slide presentation (5+ slides)
- [ ] Verify PDF dimensions (1920x1080)
- [ ] Verify no visual disruption during capture
- [ ] Test with RTL content
- [ ] Test with images and complex layouts

### Later (Mobile Support):
- [ ] Add device detection
- [ ] Implement backend fallback for mobile
- [ ] Test on mobile devices

---

## Success Criteria

✅ **Pixel-Perfect**: PDF looks identical to browser preview
✅ **No Disruption**: User sees only "Generating PDF..." message
✅ **Fast**: <5 seconds for 10-slide presentation
✅ **Conversational**: Triggered purely by chat message
✅ **Reliable**: Works for all presentation styles (RTL, images, cards, etc.)

---

## Notes

- Start with desktop-only implementation
- Mobile support can be added later if needed
- Focus on 100% visual accuracy via frontend capture
- Use message-type pattern (proven with voice messages)
- Keep it simple - no over-engineering

