import React from 'react';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  onFileSelect?: (file: any) => void;
  className?: string;
}

export function FileExplorer({ onFileSelect, className }: FileExplorerProps) {
  return (
    <div className={cn("h-full", className)}>
      {/* Empty component - start fresh */}
    </div>
  );
}