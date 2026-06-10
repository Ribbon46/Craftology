'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  onFilesRemoved?: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
}

interface PreviewItem {
  file: File;
  // Object URL created once per file and revoked on remove/unmount, so
  // re-renders don't leak blob URLs.
  url: string;
}

export function Dropzone({
  onFilesAdded,
  onFilesRemoved,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);

  const itemsRef = useRef<PreviewItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const validateAndAddFiles = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      if (itemsRef.current.length + validFiles.length >= maxFiles) {
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
      setItems((prev) => [...prev, ...validFiles.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    }

    setRejections(invalidFiles);
  }, [maxFiles, maxFileSize, acceptedFileTypes, onFilesAdded]);

  const removeFile = useCallback((index: number) => {
    const removed = itemsRef.current[index];
    if (!removed) return;
    URL.revokeObjectURL(removed.url);
    setItems((prev) => prev.filter((_, i) => i !== index));
    onFilesRemoved?.([removed.file]);
  }, [onFilesRemoved]);

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
    // Allow re-selecting the same file after removing it.
    e.target.value = '';
  }, [validateAndAddFiles]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Adaugă imagini (max {maxFiles})</label>

      <div
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${dragActive ? 'border-clay bg-cream' : 'border-line-strong hover:border-clay/50'}
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
            Formate suportate: JPG, PNG, GIF, WEBP · max {maxFileSize / 1024 / 1024}MB fiecare
          </p>
        </div>
      </div>

      {rejections.length > 0 && (
        <div className="space-y-0.5">
          {rejections.map((msg, i) => (
            <p key={i} className="text-xs text-destructive">{msg}</p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((item, index) => (
            <div key={item.url} className="relative group aspect-square rounded-xl overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.file.name}
                className="w-full h-full object-cover"
              />
              {/* Always visible on touch screens (no hover); hover-revealed on desktop */}
              <button
                type="button"
                aria-label={`Elimină ${item.file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 bg-black/55 text-white rounded-full p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 text-center truncate">
                {item.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dropzone;
