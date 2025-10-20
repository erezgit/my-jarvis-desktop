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
 * - Measures container height and provides fixed pixel height to Sandpack
 */

import { useEffect, useRef, useState } from "react";
import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout } from "@codesandbox/sandpack-react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(600); // Default height

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const newHeight = containerRef.current.offsetHeight;
        if (newHeight > 0) {
          setHeight(newHeight);
        }
      }
    };

    // Initial measurement
    updateHeight();

    // Update on window resize
    window.addEventListener('resize', updateHeight);

    // Also update after a short delay to catch layout changes
    const timer = setTimeout(updateHeight, 100);

    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={containerRef} className={`h-full w-full bg-white ${className}`}>
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
          autoReload: true
        }}
        theme="light"
      >
        <SandpackLayout style={{ height: `${height}px` }}>
          <SandpackPreviewComponent
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
