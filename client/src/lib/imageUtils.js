/**
 * Resizes and compresses an image to a maximum width and quality
 * @param {string} dataUrl - The data URL of the image
 * @param {number} maxWidth - The maximum width of the image in pixels
 * @param {number} quality - The quality of the image (0-1)
 * @returns {Promise<string>} - A promise that resolves to the resized image data URL
 */
export const resizeImage = (dataUrl, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL with reduced quality
        const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataUrl);
      };

      img.onerror = (error) => {
        reject(error);
      };

      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Checks if a string is too large for localStorage
 * @param {string} str - The string to check
 * @param {number} maxSizeInMB - The maximum size in MB
 * @returns {boolean} - True if the string is too large
 */
export const isStringTooLargeForLocalStorage = (str, maxSizeInMB = 4) => {
  // Calculate size in bytes (2 bytes per character in JavaScript)
  const sizeInBytes = str.length * 2;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB > maxSizeInMB;
};
