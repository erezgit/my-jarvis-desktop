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

import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout } from "@codesandbox/sandpack-react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  return (
    <div className={`h-full w-full bg-white ${className}`}>
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
        <SandpackLayout style={{ height: '100%', width: '100%' }}>
          <SandpackPreviewComponent
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: '100%', width: '100%' }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
