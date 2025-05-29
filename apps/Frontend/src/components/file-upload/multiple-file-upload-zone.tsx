import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFileUpload: (files: File[]) => void;
  isUploading: boolean;
  acceptedFileTypes?: string;
  maxFiles?: number;
}

export function MultipleFileUploadZone({ 
  onFileUpload, 
  isUploading, 
  acceptedFileTypes = "application/pdf",
  maxFiles = 10,
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const validateFile = (file: File) => {
    if (!file.type.match(acceptedFileTypes)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size should be less than 5MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

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
    onFileUpload(updatedFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [uploadedFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [uploadedFiles]);

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    onFileUpload(newFiles);
  };

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
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
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
            <p className="font-medium text-primary">{uploadedFiles.length} file(s) uploaded</p>
            <ul className="w-full text-left space-y-2">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex justify-between items-center border-b pb-1">
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
              <p className="font-medium text-primary">Drag and drop PDF files here</p>
              <p className="text-sm text-muted-foreground mt-1">Or click to browse files</p>
            </div>
            <Button type="button" variant="secondary" onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}>
              Browse files
            </Button>
            <p className="text-xs text-muted-foreground">Up to {maxFiles} PDF files, 5MB each</p>
          </div>
        )}
      </div>
    </div>
  );
}
