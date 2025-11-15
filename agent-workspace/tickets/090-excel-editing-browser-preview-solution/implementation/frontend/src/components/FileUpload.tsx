import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, disabled }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="text-6xl">📊</div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {isDragActive ? 'Drop Excel file here' : 'Upload Excel File'}
            </h3>

            <p className="text-gray-500 text-sm">
              {isDragActive
                ? 'Release to upload your spreadsheet'
                : 'Drag & drop an Excel file here, or click to select'
              }
            </p>
          </div>

          <div className="text-xs text-gray-400">
            Supports .xlsx, .xlsm, and .xls files (max 50MB)
          </div>
        </div>
      </div>

      {/* Error messages for rejected files */}
      {fileRejections.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800 text-sm">
            <strong>Upload failed:</strong>
            <ul className="mt-1 ml-4 list-disc">
              {fileRejections.map(({ file, errors }) => (
                <li key={file.name}>
                  {file.name}: {errors.map(e => e.message).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Features info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">🔧</div>
          <h4 className="font-medium text-gray-700">Formula Preservation</h4>
          <p className="text-sm text-gray-500">All Excel formulas and references maintained</p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">⚡</div>
          <h4 className="font-medium text-gray-700">Real-time Preview</h4>
          <p className="text-sm text-gray-500">See changes instantly in your browser</p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl mb-2">🔒</div>
          <h4 className="font-medium text-gray-700">Local Processing</h4>
          <p className="text-sm text-gray-500">Your data stays on your machine</p>
        </div>
      </div>
    </div>
  );
};