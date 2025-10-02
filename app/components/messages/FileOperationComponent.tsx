import { FileText } from 'lucide-react';
import type { FileOperationMessage } from '../../types';

interface FileOperationComponentProps {
  message: FileOperationMessage;
}

export function FileOperationComponent({ message }: FileOperationComponentProps) {
  const operationText = message.operation === 'created' ? 'Created file' : 'Modified file';

  return (
    <div className="mb-3 pr-0 pl-0 pt-3 pb-3">
      <div className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-0">
        <FileText className="w-4 h-4" />
        <span>{operationText} - {message.fileName}</span>
      </div>
    </div>
  );
}
