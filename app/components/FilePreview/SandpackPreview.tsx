/**
 * SandpackPreview - Live React component preview using Sandpack
 *
 * Renders .tsx and .jsx files as interactive React components.
 * Primarily used for Spectacle presentations but supports any React code.
 *
 * Features:
 * - Hot reload on file changes
 * - npm package support via CDN
 * - TypeScript support
 * - Light theme matching app design
 * - Uses h-full to match panel architecture (not 100vh)
 */

import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout, useSandpack } from "@codesandbox/sandpack-react";
import { useEffect, useState } from "react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

function SandpackPreviewInner() {
  const { listen, sandpack } = useSandpack();
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Override the internal error handler to filter telemetry errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Suppress telemetry fetch errors
      const message = args.join(' ');
      if (message.includes('col.csbops.io') || message.includes('Failed to fetch')) {
        return; // Silently ignore
      }
      originalConsoleError.apply(console, args);
    };

    const stopListening = listen((message) => {
      // Log all messages for debugging
      console.log('[Sandpack Message]', message);

      // Completely ignore telemetry-related errors
      if (message.type === 'error' && message.message?.includes('Failed to fetch')) {
        console.log('[Sandpack] Telemetry error suppressed');
        return; // Don't let Sandpack process this error
      }

      // If we detect other errors, log them
      if (message.type === 'error') {
        console.log('[Sandpack] Error detected:', message);
      }
    });

    return () => {
      stopListening();
      console.error = originalConsoleError;
    };
  }, [listen]);

  return (
    <SandpackLayout style={{ height: '100%', width: '100%' }}>
      <SandpackPreviewComponent
        key={key}
        showOpenInCodeSandbox={false}
        showRefreshButton={true}
        showSandpackErrorOverlay={false}
        style={{ height: '100%', width: '100%' }}
      />
    </SandpackLayout>
  );
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  return (
    <div className={`h-full w-full bg-white ${className}`} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <SandpackProvider
          template="react-ts"
          files={{
            "/App.tsx": content,
            "/public/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script>
    // Block telemetry requests before Sandpack loads
    (function() {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0]?.toString() || '';
        if (url.includes('col.csbops.io') || url.includes('csbops')) {
          return Promise.resolve(new Response('{}', { status: 200 }));
        }
        return originalFetch.apply(this, args);
      };
    })();
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`
          }}
          customSetup={{
            dependencies: {
              "spectacle": "^10.0.0",
              "react": "^18.2.0",
              "react-dom": "^18.2.0"
            }
          }}
          options={{
            autorun: true,
            autoReload: true
          }}
          theme="light"
          style={{ height: '100%', width: '100%' }}
        >
          <SandpackPreviewInner />
        </SandpackProvider>
      </div>
    </div>
  );
}
