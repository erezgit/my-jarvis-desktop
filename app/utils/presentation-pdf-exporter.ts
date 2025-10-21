/**
 * Presentation PDF Exporter
 *
 * Captures presentations from Sandpack preview and exports to PDF
 * using html2canvas for pixel-perfect rendering.
 *
 * Strategy:
 * 1. Find Sandpack iframe containing the presentation
 * 2. Access slide container via data-pdf-slide attribute
 * 3. Programmatically navigate through slides
 * 4. Capture each slide with html2canvas at fixed dimensions
 * 5. Combine into multi-page PDF
 * 6. Download
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filePath: string; // Path to the .tsx file being previewed
  filename?: string; // Output PDF filename
}

interface PresentationState {
  totalSlides: number;
  goToSlide: (index: number) => void;
}

/**
 * Main export function - captures presentation and generates PDF
 */
export async function exportPresentationToPDF(
  options: ExportOptions
): Promise<string> {
  const { filePath, filename = 'presentation.pdf' } = options;

  try {
    console.log('[PDF Export] Starting export for:', filePath);

    // Find Sandpack iframe
    const sandpackIframe = findSandpackIframe();
    if (!sandpackIframe) {
      throw new Error('Could not find Sandpack preview. Make sure a presentation is open.');
    }

    // Access iframe document
    const iframeDoc = sandpackIframe.contentDocument || sandpackIframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Could not access iframe content. Security restrictions may apply.');
    }

    // Find slide container
    const slideContainer = iframeDoc.querySelector('[data-pdf-slide]') as HTMLElement;
    if (!slideContainer) {
      throw new Error(
        'Could not find presentation slide container. ' +
        'Make sure the presentation has data-pdf-slide attribute on the slide container.'
      );
    }

    // Get presentation state
    const presentationState = getPresentationState(iframeDoc);
    const { totalSlides, goToSlide } = presentationState;

    console.log(`[PDF Export] Found ${totalSlides} slides`);

    // Create PDF document (landscape, 1920x1080)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
      compress: true
    });

    // Capture each slide
    for (let i = 0; i < totalSlides; i++) {
      console.log(`[PDF Export] Capturing slide ${i + 1}/${totalSlides}`);

      // Navigate to slide
      goToSlide(i);

      // Wait for render and any animations to settle
      await sleep(800);

      // Temporarily set fixed dimensions for consistent capture
      const originalStyle = setFixedDimensions(slideContainer);

      try {
        // Capture slide with html2canvas
        const canvas = await html2canvas(slideContainer, {
          scale: 2, // 2x for high quality (3840x2160 effective resolution)
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          removeContainer: true
        });

        // Convert to image data
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Add page to PDF (except for first slide)
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF page
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');

      } finally {
        // Always restore responsive styling
        restoreStyle(slideContainer, originalStyle);
      }
    }

    console.log('[PDF Export] Saving PDF to workspace...');

    // Convert PDF to base64 data URL
    const pdfDataUrl = pdf.output('dataurlstring');

    // Send to backend to save in workspace
    const response = await fetch('/api/save-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfData: pdfDataUrl,
        filePath: filePath,
        filename: filename,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save PDF');
    }

    const result = await response.json();
    console.log('[PDF Export] PDF saved to:', result.path);

    return result.path; // Return the path for use in chat message
  } catch (error) {
    console.error('[PDF Export] Export failed:', error);
    throw error;
  }
}

/**
 * Find the Sandpack preview iframe in the document
 */
function findSandpackIframe(): HTMLIFrameElement | null {
  const iframes = Array.from(document.querySelectorAll('iframe'));

  // Look for Sandpack iframes by checking src or sandbox attributes
  for (const iframe of iframes) {
    const src = iframe.getAttribute('src') || '';
    const sandbox = iframe.getAttribute('sandbox') || '';

    // Sandpack iframes have specific patterns
    if (
      src.includes('sandpack') ||
      src.includes('codesandbox') ||
      sandbox.includes('allow-scripts')
    ) {
      // Additional check: make sure it's visible
      const rect = iframe.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return iframe;
      }
    }
  }

  return null;
}

/**
 * Get presentation state from the iframe document
 * Extracts slide count and navigation functions
 */
function getPresentationState(doc: Document): PresentationState {
  // Count slides by looking for slide indicator buttons
  // The presentation uses RTL, so buttons have aria-labels like "עבור לשקופית 1"
  const indicators = doc.querySelectorAll('[aria-label*="עבור לשקופית"]');
  const totalSlides = indicators.length;

  if (totalSlides === 0) {
    throw new Error(
      'Could not detect slides. Make sure the presentation has slide indicator buttons with aria-labels.'
    );
  }

  // Create navigation function
  const goToSlide = (index: number) => {
    // Find the button for this slide (1-indexed in aria-label)
    const slideNumber = index + 1;
    const button = doc.querySelector(
      `[aria-label="עבור לשקופית ${slideNumber}"]`
    ) as HTMLElement;

    if (button) {
      button.click();
    } else {
      console.warn(`[PDF Export] Could not find button for slide ${slideNumber}`);
    }
  };

  return { totalSlides, goToSlide };
}

/**
 * Temporarily set fixed dimensions on slide container for consistent capture
 * Returns original style to restore later
 */
function setFixedDimensions(element: HTMLElement) {
  const originalStyle = {
    width: element.style.width,
    height: element.style.height,
    maxWidth: element.style.maxWidth,
    minWidth: element.style.minWidth,
    aspectRatio: element.style.aspectRatio,
    flex: element.style.flex
  };

  // Set fixed dimensions (standard presentation size)
  element.style.width = '1920px';
  element.style.height = '1080px';
  element.style.maxWidth = '1920px';
  element.style.minWidth = '1920px';
  element.style.aspectRatio = 'unset';
  element.style.flex = 'none';

  return originalStyle;
}

/**
 * Restore original responsive styling
 */
function restoreStyle(element: HTMLElement, originalStyle: any) {
  element.style.width = originalStyle.width;
  element.style.height = originalStyle.height;
  element.style.maxWidth = originalStyle.maxWidth;
  element.style.minWidth = originalStyle.minWidth;
  element.style.aspectRatio = originalStyle.aspectRatio;
  element.style.flex = originalStyle.flex;
}

/**
 * Sleep utility for waiting between slide transitions
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
