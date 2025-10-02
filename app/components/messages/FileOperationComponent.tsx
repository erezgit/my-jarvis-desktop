import { FileText } from 'lucide-react';
import type { FileOperationMessage } from '../../types';

interface FileOperationComponentProps {
  message: FileOperationMessage;
}

export function FileOperationComponent({ message }: FileOperationComponentProps) {
  const operationText = message.operation === 'created' ? 'Created file' : 'Modified file';

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md">
      <FileText className="h-4 w-4 shrink-0" />
      <span>{operationText} - {message.fileName}</span>
    </div>
  );
}
