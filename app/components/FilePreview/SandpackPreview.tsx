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

import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout, SandpackLogLevel } from "@codesandbox/sandpack-react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  return (
    <div className={`h-full w-full bg-white ${className}`} style={{ position: 'relative', height: '100%', width: '100%' }}>
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
            logLevel: SandpackLogLevel.None
          }}
          theme="light"
          style={{ height: '100%', width: '100%' }}
        >
          <SandpackLayout style={{ height: '100%', width: '100%' }}>
            <SandpackPreviewComponent
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              style={{ height: '100%', width: '100%' }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
