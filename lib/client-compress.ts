import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, customOptions?: { maxSizeMB?: number, maxWidthOrHeight?: number }): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file; // Return as-is if it's not an image (e.g. PDF)
  }

  const options = {
    maxSizeMB: customOptions?.maxSizeMB || 1, // Max 1 MB default
    maxWidthOrHeight: customOptions?.maxWidthOrHeight || 1920, // Max 1920px default
    useWebWorker: true,
    initialQuality: 0.8, // Good quality (like WhatsApp)
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Fallback to original file on error
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
