import React, { useState, useRef } from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { resizeImage } from '../../lib/imageUtils';

const FileUpload = ({ onFileSelect, className, buttonText = "Upload Photo", variant = "outline", size = "sm" }) => {
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Resize and compress the image
          const resizedImage = await resizeImage(reader.result, 400, 0.6);
          onFileSelect(resizedImage);
        } catch (error) {
          console.error('Error resizing image:', error);
          // Fallback to original image if resizing fails
          onFileSelect(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button
        type="button"
        onClick={handleButtonClick}
        variant={variant}
        size={size}
      >
        {buttonText}
      </Button>
      {fileName && (
        <p className="mt-2 text-sm text-gray-500 truncate max-w-full">
          {fileName}
        </p>
      )}
    </div>
  );
};

export { FileUpload };
