import React, { useRef, useState } from 'react';

interface CharacterSheetUploaderProps {
  onSheetUpload: (content: string) => void;
}

const CharacterSheetUploader: React.FC<CharacterSheetUploaderProps> = ({ onSheetUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onSheetUpload(content);
        setFileName(file.name);
      };
      reader.onerror = () => {
        console.error("Failed to read file");
        setFileName('Error reading file.');
      };
      reader.readAsText(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-2xl font-medieval text-amber-200 mb-4">Upload Your Character Sheet</h2>
      <p className="text-slate-400 mb-6">Upload a .txt file with your character's details to begin your journey.</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt"
      />
      <button
        onClick={handleClick}
        className="w-full px-6 py-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:bg-slate-700 hover:border-amber-500 hover:text-amber-300 transition-colors"
      >
        {fileName ? `File: ${fileName}` : 'Click to Select File'}
      </button>
    </div>
  );
};

export default CharacterSheetUploader;
