'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X } from 'lucide-react';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  onFilesRemoved?: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  previewImages?: string[];
}

export function Dropzone({
  onFilesAdded,
  onFilesRemoved,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  previewImages = [],
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragFiles, setDragFiles] = useState<File[]>([]);

  useEffect(() => {
    if (previewImages.length > 0) {
      // Previews are handled by the parent component
    }
  }, [previewImages]);

  const validateAndAddFiles = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      if (dragFiles.length + validFiles.length >= maxFiles) {
        invalidFiles.push(`Limita maximă de ${maxFiles} imagini atinsă`);
        break;
      }

      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} depășește limita de ${maxFileSize / 1024 / 1024}MB`);
        continue;
      }

      if (!acceptedFileTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} nu este un format de imagine valid`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
      setDragFiles((prev) => [...prev, ...validFiles]);
    }

    if (invalidFiles.length > 0) {
      console.error('Invalid files:', invalidFiles);
    }
  }, [dragFiles, maxFiles, maxFileSize, acceptedFileTypes, onFilesAdded]);

  const removeFile = useCallback((index: number) => {
    const removedFile = dragFiles[index];
    const remainingFiles = [...dragFiles];
    remainingFiles.splice(index, 1);
    setDragFiles(remainingFiles);
    onFilesRemoved?.([removedFile]);
  }, [dragFiles, onFilesRemoved]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      validateAndAddFiles(droppedFiles);
    }
  }, [validateAndAddFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      validateAndAddFiles(selectedFiles);
    }
  }, [validateAndAddFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Adaugă imagini (max {maxFiles})</label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
          ${dragActive ? 'border-ink bg-cream' : 'border-line-strong hover:border-ink-faint'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className="w-10 h-10 text-ink-faint" />
          <p className="text-sm text-ink-soft">
            Trage și plasează imagini aici sau <span className="font-medium text-ink">apasă pentru a încărca</span>
          </p>
          <p className="text-xs text-ink-soft">
            Formate suportate: JPG, PNG, GIF, WEBP | Max {maxFileSize / 1024 / 1024}MB fiecare
          </p>
        </div>
      </div>

      {dragFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {dragFiles.map((file, index) => (
            <div key={index} className="relative group aspect-square rounded-md overflow-hidden border border-line">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 bg-black/55 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 text-center truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dropzone;