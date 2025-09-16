import React, { useCallback, useRef, useState } from "react";
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
import {
  MultipleFileUploadZone,
  MultipleFileUploadZoneHandle,
} from "../file-upload/multiple-file-upload-zone";

export default function ClaimDocumentsUploadMultiple() {
  const { toast } = useToast();

  // Internal configuration
  const MAX_FILES = 10;
  const ACCEPTED_FILE_TYPES =
    "application/pdf,image/jpeg,image/jpg,image/png,image/webp";
  const TITLE = "Upload Claim Document(s)";
  const DESCRIPTION =
    "You can upload up to 10 files. Allowed types: PDF, JPG, PNG, WEBP.";

  // Zone ref + minimal UI state (parent does not own files)
  const uploadZoneRef = useRef<MultipleFileUploadZoneHandle | null>(null);
  const [filesForUI, setFilesForUI] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false); // forwarded to upload zone
  const [isExtracting, setIsExtracting] = useState(false);

  // Called by MultipleFileUploadZone when its internal list changes (UI-only)
  const handleZoneFilesChange = useCallback((files: File[]) => {
    setFilesForUI(files);
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

  // Extract handler — reads files from the zone via ref and calls handleSave
  const handleExtract = useCallback(async () => {
    const files = uploadZoneRef.current?.getFiles() ?? [];

    if (files.length === 0) {
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
      await handleSave(files);

      toast({
        title: "Extraction started",
        description: `Processing ${files.length} file(s).`,
        variant: "default",
      });

      // we intentionally leave files intact in the zone after extraction
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
  }, [handleSave, isExtracting, toast]);

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
              ref={uploadZoneRef}
              onFilesChange={handleZoneFilesChange}
              isUploading={isUploading}
              acceptedFileTypes={ACCEPTED_FILE_TYPES}
              maxFiles={MAX_FILES}
            />

            {/* Show list of files received from the upload zone */}
            {filesForUI.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Uploaded ({filesForUI.length}/{MAX_FILES})
                </p>
                <ul className="text-sm text-gray-700 list-disc ml-6 max-h-40 overflow-auto">
                  {filesForUI.map((file, index) => (
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
              disabled={filesForUI.length === 0 || isExtracting}
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
