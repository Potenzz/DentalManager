import React, { useState, useRef, useCallback } from "react";
import { Upload, File, X, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  acceptedFileTypes?: string;
  // OPTIONAL: fallback max file size MB
  maxFileSizeMB?: number;
  // OPTIONAL: per-type size map in MB, e.g. { "application/pdf": 10, "image/*": 2 }
  maxFileSizeByType?: Record<string, number>;
}

export function FileUploadZone({
  onFileUpload,
  isUploading,
  acceptedFileTypes = "application/pdf",
  maxFileSizeMB = 10, // default 10mb
  maxFileSizeByType,
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // helpers
  const mbToBytes = (mb: number) => Math.round(mb * 1024 * 1024);
  const humanSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const parsedAccept = acceptedFileTypes
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const allowedBytesForMime = (mime: string | undefined) => {
    if (!mime) return mbToBytes(maxFileSizeMB);
    if (maxFileSizeByType && maxFileSizeByType[mime] != null) {
      return mbToBytes(maxFileSizeByType[mime]!);
    }
    const parts = mime.split("/");
    if (parts.length === 2) {
      const wildcard = `${parts[0]}/*`;
      if (maxFileSizeByType && maxFileSizeByType[wildcard] != null) {
        return mbToBytes(maxFileSizeByType[wildcard]!);
      }
    }
    return mbToBytes(maxFileSizeMB);
  };

  const isMimeAllowed = (fileType: string | undefined) => {
    if (!fileType) return false;
    const ft = fileType.toLowerCase();
    for (const a of parsedAccept) {
      if (a === ft) return true;
      if (a === "*/*") return true;
      if (a.endsWith("/*")) {
        const major = a.split("/")[0];
        if (ft.startsWith(`${major}/`)) return true;
      }
    }
    return false;
  };

  const validateFile = (file: File) => {
    // <<< CHANGED: use isMimeAllowed instead of strict include
    if (!isMimeAllowed(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a supported file type.",
        variant: "destructive",
      });
      return false;
    }

    const allowedBytes = allowedBytesForMime(file.type);
    if (file.size > allowedBytes) {
      toast({
        title: "File too large",
        description: `${file.name} is ${humanSize(file.size)} — max for this type is ${humanSize(
          allowedBytes
        )}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) {
        setIsDragging(true);
      }
    },
    [isDragging]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];

        if (validateFile(file)) {
          setUploadedFile(file);
          onFileUpload(file);
        }
      }
    },
    [onFileUpload, acceptedFileTypes, toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        if (validateFile(file)) {
          setUploadedFile(file);
          onFileUpload(file);
        }
      }
    },
    [onFileUpload, acceptedFileTypes, toast]
  );

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const typeBadges = parsedAccept.map((t) => {
    const display =
      t === "image/*"
        ? "Images"
        : t.includes("/")
          ? t!.split("/")[1]!.toUpperCase()
          : t.toUpperCase();
    const mb =
      (maxFileSizeByType &&
        (maxFileSizeByType[t] ?? maxFileSizeByType[`${t.split("/")[0]}/*`])) ??
      maxFileSizeMB;
    return { key: t, label: `${display} ≤ ${mb} MB`, mb };
  });

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept={acceptedFileTypes}
      />

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          uploadedFile ? "bg-success/5" : "hover:bg-muted/40",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!uploadedFile && !isUploading ? handleBrowseClick : undefined}
        style={{ minHeight: "200px" }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm font-medium">Uploading file...</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <File className="h-12 w-12 text-primary" />
              <button
                className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <p className="font-medium text-primary">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {humanSize(uploadedFile.size)} • allowed{" "}
                {humanSize(allowedBytesForMime(uploadedFile.type))}
                {" • "}
                {uploadedFile.type || "unknown"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              File ready to process
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <FilePlus className="h-12 w-12 text-primary/70" />
            <div>
              <p className="font-medium text-primary">
                Drag and drop a PDF file here
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {typeBadges.map((b) => (
                  <span
                    key={b.key}
                    className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700"
                    title={b.label}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Or click to browse files
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse files
            </Button>
            <p className="text-xs text-muted-foreground">
              Accepts {acceptedFileTypes} — max {maxFileSizeMB} MB (default)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
