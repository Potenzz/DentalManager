import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Upload, X, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type MultipleFileUploadZoneHandle = {
  getFiles: () => File[];
  reset: () => void;
  removeFile: (index: number) => void;
};

interface FileUploadZoneProps {
  onFilesChange?: (files: File[]) => void;
  isUploading?: boolean;
  acceptedFileTypes?: string;
  maxFiles?: number;
}

export const MultipleFileUploadZone = forwardRef<
  MultipleFileUploadZoneHandle,
  FileUploadZoneProps
>(
  (
    {
      onFilesChange,
      isUploading = false,
      acceptedFileTypes = "application/pdf,image/jpeg,image/jpg,image/png,image/webp",
      maxFiles = 10,
    },
    ref
  ) => {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes = acceptedFileTypes
      .split(",")
      .map((type) => type.trim());

    const validateFile = (file: File) => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PDF and image files are allowed.",
          variant: "destructive",
        });
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    };

    // ----------------- friendly label helper -----------------
    // Convert acceptedFileTypes MIME list into human-friendly labels
    const buildFriendlyTypes = (accept: string) => {
      const types = accept
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      // track whether generic image/* is present
      const hasImageWildcard = types.includes("image/*");
      const names = new Set<string>();

      for (const t of types) {
        if (t === "image/*") {
          names.add("images");
          continue;
        }
        if (t.includes("pdf")) {
          names.add("PDF");
          continue;
        }
        if (t.includes("jpeg") || t.includes("jpg")) {
          names.add("JPG");
          continue;
        }
        if (t.includes("png")) {
          names.add("PNG");
          continue;
        }
        if (t.includes("webp")) {
          names.add("WEBP");
          continue;
        }
        if (t.includes("tiff") || t.includes("tif")) {
          names.add("TIFF");
          continue;
        }
        if (t.includes("bmp")) {
          names.add("BMP");
          continue;
        }
        // fallback: attempt to extract subtype (safe)
        if (t.includes("/")) {
          const parts = t.split("/");
          const subtype = parts[1]; // may be undefined if malformed
          if (subtype) {
            names.add(subtype.toUpperCase());
          }
        } else {
          names.add(t.toUpperCase());
        }
      }

      return {
        hasImageWildcard,
        names: Array.from(names),
      };
    };

    const friendly = buildFriendlyTypes(acceptedFileTypes);

    // Build main title text
    const uploadTitle = (() => {
      const { hasImageWildcard, names } = friendly;
      // if only "images"
      if (hasImageWildcard && names.length === 1)
        return "Drag and drop image files here";
      // if includes images plus specific others (e.g., image/* + pdf)
      if (hasImageWildcard && names.length > 1) {
        const others = names.filter((n) => n !== "images");
        return `Drag and drop image files (${others.join(", ")}) here`;
      }
      // no wildcard images: list the types
      if (names.length === 0) return "Drag and drop files here";
      if (names.length === 1) return `Drag and drop ${names[0]} files here`;
      // multiple: join
      return `Drag and drop ${names.join(", ")} files here`;
    })();

    // Build footer allowed types text (small)
    const allowedHuman = (() => {
      const { hasImageWildcard, names } = friendly;
      if (hasImageWildcard) {
        // show images + any explicit types (excluding 'images')
        const extras = names.filter((n) => n !== "images");
        return extras.length
          ? `Images (${extras.join(", ")}), ${maxFiles} max`
          : `Images, ${maxFiles} max`;
      }
      if (names.length === 0) return `Files, Max ${maxFiles}`;
      return `${names.join(", ")}, Max ${maxFiles}`;
    })();
    // ----------------- end helper -----------------

    const notify = useCallback(
      (files: File[]) => {
        onFilesChange?.(files);
      },
      [onFilesChange]
    );

    const handleFiles = (files: FileList | null) => {
      if (!files) return;

      const newFiles = Array.from(files).filter(validateFile);
      const totalFiles = uploadedFiles.length + newFiles.length;

      if (totalFiles > maxFiles) {
        toast({
          title: "Too Many Files",
          description: `You can only upload up to ${maxFiles} files.`,
          variant: "destructive",
        });
        return;
      }

      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      notify(updatedFiles);
    };

    const handleDragEnter = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      },
      []
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      },
      []
    );

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
        handleFiles(e.dataTransfer.files);
      },
      [uploadedFiles]
    );

    const handleFileSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
      },
      [uploadedFiles]
    );

    const handleBrowseClick = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleRemoveFile = (index: number) => {
      const newFiles = [...uploadedFiles];
      newFiles.splice(index, 1);
      setUploadedFiles(newFiles);
      notify(newFiles);
    };

    // expose imperative handle to parent
    useImperativeHandle(
      ref,
      () => ({
        getFiles: () => uploadedFiles.slice(),
        reset: () => {
          setUploadedFiles([]);
          notify([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        removeFile: (index: number) => {
          handleRemoveFile(index);
        },
      }),
      [uploadedFiles, notify]
    );

    return (
      <div className="w-full">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept={acceptedFileTypes}
          multiple
        />

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={!isUploading ? handleBrowseClick : undefined}
          style={{ minHeight: "200px" }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm font-medium">Uploading files...</p>
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <p className="font-medium text-primary">
                {uploadedFiles.length} file(s) uploaded
              </p>
              <ul className="w-full text-left space-y-2">
                {uploadedFiles.map((file, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center border-b pb-1"
                  >
                    <span className="text-sm">{file.name}</span>
                    <button
                      className="ml-2 p-1 text-muted-foreground hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <FilePlus className="h-12 w-12 text-primary/70" />
              <div>
                <p className="font-medium text-primary">{uploadTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or click to browse files
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseClick();
                }}
              >
                Browse files
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MultipleFileUploadZone.displayName = "MultipleFileUploadZone";
