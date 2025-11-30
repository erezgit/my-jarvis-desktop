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
    console.log('[FILE_UPLOAD_BUTTON] Button clicked, triggering file input');
    const startTime = performance.now();

    // Log the actual input element state
    if (fileInputRef.current) {
      console.log('[FILE_UPLOAD_BUTTON] Input element state:', {
        disabled: fileInputRef.current.disabled,
        type: fileInputRef.current.type,
        accept: fileInputRef.current.accept,
        multiple: fileInputRef.current.multiple,
        hasEventListeners: !!fileInputRef.current.onchange
      });
    }

    fileInputRef.current?.click();
    const endTime = performance.now();
    console.log(`[FILE_UPLOAD_BUTTON] File input triggered in ${endTime - startTime}ms`);

    // Set a timer to log if file dialog doesn't appear quickly
    setTimeout(() => {
      console.log('[FILE_UPLOAD_BUTTON] 100ms after click - dialog should be visible');
    }, 100);

    setTimeout(() => {
      console.log('[FILE_UPLOAD_BUTTON] 1 second after click - checking if stuck');
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[FILE_UPLOAD_BUTTON] File input changed');
    const file = e.target.files?.[0];
    if (file) {
      console.log(`[FILE_UPLOAD_BUTTON] File selected: ${file.name}, size: ${file.size} bytes`);
      const startTime = performance.now();
      onFileSelect(file);
      const endTime = performance.now();
      console.log(`[FILE_UPLOAD_BUTTON] onFileSelect callback took ${endTime - startTime}ms`);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=""
        onChange={handleFileChange}
        onFocus={() => console.log('[FILE_UPLOAD_BUTTON] File input focused')}
        onBlur={() => console.log('[FILE_UPLOAD_BUTTON] File input blurred')}
        onClick={(e) => {
          console.log('[FILE_UPLOAD_BUTTON] File input onClick event fired', e);
          console.log('[FILE_UPLOAD_BUTTON] Event is trusted:', e.isTrusted);
        }}
        onCancel={() => console.log('[FILE_UPLOAD_BUTTON] File dialog cancelled')}
        style={{ display: 'none' }}
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