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
 * - Error overlays disabled via official Sandpack options
 * - Chrome extension errors suppressed via error boundaries
 */

import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout } from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Suppress unhandled errors from Chrome extensions and telemetry in iframes
    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      // Suppress telemetry and extension errors
      if (
        message.includes('Failed to fetch') ||
        message.includes('col.csbops.io') ||
        message.includes('chrome-extension')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason);
      // Suppress telemetry and extension promise rejections
      if (
        reason.includes('Failed to fetch') ||
        reason.includes('col.csbops.io') ||
        reason.includes('chrome-extension')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  return (
    <div ref={containerRef} className={`h-full w-full bg-white ${className}`} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <SandpackProvider
          template="react-ts"
          files={{
            "/App.tsx": content
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
            autoReload: true,
            showErrorScreen: false
          }}
          theme="light"
          style={{ height: '100%', width: '100%' }}
        >
          <SandpackLayout style={{ height: '100%', width: '100%' }}>
            <SandpackPreviewComponent
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
              showSandpackErrorOverlay={false}
              style={{ height: '100%', width: '100%' }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
