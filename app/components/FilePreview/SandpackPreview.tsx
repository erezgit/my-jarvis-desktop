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
 */

import { Sandpack } from "@codesandbox/sandpack-react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
  className?: string;
}

export function SandpackPreview({ filePath, content, className = "" }: SandpackPreviewProps) {
  return (
    <div className={`h-full w-full bg-white ${className}`}>
      <Sandpack
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
          showNavigator: false,
          showTabs: false,
          showLineNumbers: false,
          showInlineErrors: true,
          showRefreshButton: true,
          editorHeight: "100%",
          autorun: true,
          autoReload: true
        }}
        theme="light"
      />
    </div>
  );
}
