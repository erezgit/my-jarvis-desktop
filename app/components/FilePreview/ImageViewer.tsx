import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  fileName: string;
  alt?: string;
  className?: string;
}

export function ImageViewer({ imageUrl, fileName, alt, className = '' }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5)); // Max 5x zoom
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25)); // Min 0.25x zoom
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.25, Math.min(5, prev + delta)));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className={`h-full w-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Fixed header matching file tree pattern */}
      <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {fileName}
          </h3>
          {imageLoaded && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Reset zoom"
          >
            <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Download image"
          >
            <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-950 flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-2" />
              <p className="text-sm">Loading image...</p>
            </div>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">⚠️ Failed to load image</p>
              <p className="text-sm">{fileName}</p>
            </div>
          </div>
        )}

        <img
          src={imageUrl}
          alt={alt || fileName}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            display: imageLoaded ? 'block' : 'none'
          }}
          draggable={false}
        />
      </div>

      {/* Optional: Image info footer */}
      {imageLoaded && (
        <div className="h-8 flex items-center justify-center px-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700">
          <span>Use scroll wheel to zoom • Click and drag to pan when zoomed</span>
        </div>
      )}
    </div>
  );
}
