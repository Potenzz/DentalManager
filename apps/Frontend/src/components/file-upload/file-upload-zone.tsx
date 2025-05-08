import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  acceptedFileTypes?: string;
}

export function FileUploadZone({ 
  onFileUpload, 
  isUploading, 
  acceptedFileTypes = "application/pdf" 
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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
    // Check file type
    if (!file.type.match(acceptedFileTypes)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return false;
    }
    
    // Check file size (limit to 5MB)
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
  }, [onFileUpload, acceptedFileTypes, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (validateFile(file)) {
        setUploadedFile(file);
        onFileUpload(file);
      }
    }
  }, [onFileUpload, acceptedFileTypes, toast]);

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

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
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
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
                {(uploadedFile.size / 1024).toFixed(1)} KB
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
              Accepts PDF files up to 5MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}