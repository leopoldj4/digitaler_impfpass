"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileImage, FileText, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const url = URL.createObjectURL(file);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-muted"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full flex-col items-center justify-center gap-2 bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="px-2 text-center text-[10px] text-muted-foreground line-clamp-2">
            {file.name}
          </span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 hidden rounded-full bg-background/90 p-0.5 shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-0.5 text-[9px] text-white">
        {(file.size / 1024).toFixed(0)} KB
      </div>
    </motion.div>
  );
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setFiles((prev) => {
        const updated = [...prev, ...accepted];
        return updated;
      });
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "application/pdf": [],
    },
    disabled,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length > 0) onFiles(files);
  };

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/3",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -4 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
              isDragActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
            )}
          >
            <Upload className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {isDragActive ? "Dateien loslassen …" : "Dateien hier ablegen"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP oder PDF · Mehrere Dateien möglich
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs">
              <FileImage className="h-3.5 w-3.5" />
              Datei wählen
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
              <Camera className="h-3.5 w-3.5" />
              Kamera
            </Button>
          </div>
        </motion.div>
      </div>

      {/* File Previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {files.map((file, i) => (
                <FilePreview key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} className="gap-2" size="sm">
                <Upload className="h-4 w-4" />
                {files.length} Datei{files.length !== 1 ? "en" : ""} hochladen
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
