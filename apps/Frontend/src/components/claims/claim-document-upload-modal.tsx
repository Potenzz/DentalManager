import React, { useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, FilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultipleFileUploadZone } from "../file-upload/multiple-file-upload-zone";

export default function ClaimDocumentsUploadMultiple() {
  const { toast } = useToast();

  // Internal configuration
  const MAX_FILES = 10;
  const ACCEPTED_FILE_TYPES =
    "application/pdf,image/jpeg,image/jpg,image/png,image/webp";
  const TITLE = "Upload Claim Document(s)";
  const DESCRIPTION =
    "You can upload up to 10 files. Allowed types: PDF, JPG, PNG, WEBP.";

  // Internal state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false); // forwarded to upload zone
  const [isExtracting, setIsExtracting] = useState(false);

  // Called by MultipleFileUploadZone whenever its internal list changes.
  const handleFileUpload = useCallback((files: File[]) => {
    setUploadedFiles(files);
  }, []);

  // Dummy save (simulate async). Replace with real API call when needed.
  const handleSave = useCallback(async (files: File[]) => {
    // simulate network / processing time
    await new Promise((res) => setTimeout(res, 800));
    console.log(
      "handleSave called for files:",
      files.map((f) => f.name)
    );
  }, []);

  // Extract handler — calls handleSave (dummy) and shows toasts.
  const handleExtract = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files",
        description: "Please upload at least one file before extracting.",
        variant: "destructive",
      });
      return;
    }

    if (isExtracting) return;
    setIsExtracting(true);

    try {
      await handleSave(uploadedFiles);

      toast({
        title: "Extraction started",
        description: `Processing ${uploadedFiles.length} file(s).`,
        variant: "default",
      });

      // If you want to clear the upload zone after extraction, you'll need a small
      // change in MultipleFileUploadZone to accept a reset signal from parent.
      // We intentionally leave files intact here.
    } catch (err) {
      toast({
        title: "Extraction failed",
        description:
          "There was an error starting extraction. Please try again.",
        variant: "destructive",
      });
      // eslint-disable-next-line no-console
      console.error("extract error", err);
    } finally {
      setIsExtracting(false);
    }
  }, [uploadedFiles, handleSave, isExtracting, toast]);

  return (
    <div className="space-y-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* File Upload Section */}
          <div className="bg-gray-100 p-4 rounded-md space-y-4">
            <MultipleFileUploadZone
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              acceptedFileTypes={ACCEPTED_FILE_TYPES}
              maxFiles={MAX_FILES}
            />

            {/* Show list of files received from the upload zone */}
            {uploadedFiles.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Uploaded ({uploadedFiles.length}/{MAX_FILES})
                </p>
                <ul className="text-sm text-gray-700 list-disc ml-6 max-h-40 overflow-auto">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="truncate" title={file.name}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <Button
              className="w-full h-12 gap-2"
              disabled={uploadedFiles.length === 0 || isExtracting}
              onClick={handleExtract}
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FilePlus className="h-4 w-4" />
                  Extract Claim Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
