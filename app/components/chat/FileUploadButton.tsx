import React, { useRef } from "react";
import { PaperClipIcon } from "@heroicons/react/24/outline";

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

export function FileUploadButton({
  onFileSelect,
  disabled = false,
  isUploading = false
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        title={isUploading ? "Uploading..." : "Upload file"}
      >
        {isUploading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <PaperClipIcon className="w-4 h-4" />
        )}
      </button>
    </>
  );
}
