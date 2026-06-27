import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function compressImage(file: File, quality = 0.6, maxWidth = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleFactor = maxWidth / img.width;
      const width = img.width > maxWidth ? maxWidth : img.width;
      const height = img.width > maxWidth ? img.height * scaleFactor : img.height;
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error('Canvas to Blob conversion failed'));
        }
        const compressedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, file.type, quality);
    };
    img.onerror = (error) => reject(error);
  });
}

    