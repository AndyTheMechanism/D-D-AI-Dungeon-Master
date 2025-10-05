import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, altText, onClose }) => {
  // Handle key press for accessibility, e.g., closing with Escape key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()} // Prevent clicks inside from closing the modal
      >
        <img
          src={imageUrl}
          alt={altText}
          className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 text-white bg-slate-800/80 rounded-full w-10 h-10 flex items-center justify-center text-3xl hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
          aria-label="Close image view"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default ImageModal;
