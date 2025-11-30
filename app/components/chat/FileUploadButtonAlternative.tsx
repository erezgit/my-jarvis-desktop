import React from "react";
import { PaperClipIcon } from "@heroicons/react/24/outline";

interface FileUploadButtonAlternativeProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

export function FileUploadButtonAlternative({
  onFileSelect,
  disabled = false,
  isUploading = false
}: FileUploadButtonAlternativeProps) {

  const handleButtonClick = () => {
    console.log('[FILE_UPLOAD_ALT] Creating fresh file input');

    // Create a brand new input element each time
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    // Add event listener
    input.onchange = (e) => {
      console.log('[FILE_UPLOAD_ALT] File selected via dynamic input');
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        console.log(`[FILE_UPLOAD_ALT] File: ${file.name}, size: ${file.size}`);
        onFileSelect(file);
      }
      // Clean up the input element
      document.body.removeChild(input);
    };

    // Add to body temporarily
    document.body.appendChild(input);

    // Trigger click with a tiny delay to ensure DOM is ready
    setTimeout(() => {
      console.log('[FILE_UPLOAD_ALT] Clicking dynamic input');
      input.click();
    }, 10);
  };

  return (
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
  );
}