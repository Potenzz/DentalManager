// PaymentOCRBlock.tsx
import * as React from "react";

// If you're using shadcn/ui and lucide-react, keep these.
// Otherwise swap for your own components/icons.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type Row = Record<string, string | number | boolean | null | undefined>;

export default function PaymentOCRBlock() {
  // UI state
  const [uploadedImage, setUploadedImage] = React.useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  //Mutation
  const extractPaymentOCR = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file, file.name));

      const res = await apiRequest(
        "POST",
        "/api/payment-ocr/extract",
        formData
      );

      if (!res.ok) throw new Error("Failed to extract payment data");
      const data = (await res.json()) as { rows: Row[] } | Row[];
      return Array.isArray(data) ? data : data.rows;
    },
    onSuccess: (rows) => {
      setRows(rows);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to extract payment data: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // ---- handlers (all in this file) -----------------------------------------
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const list = Array.from(files);
    setUploadedImage(list[0] as File); // preview first
    setUploadedImages(list);
    setError(null);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const list = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!list.length) {
      setError("Please drop image files (JPG/PNG/TIFF/BMP).");
      return;
    }
    setUploadedImage(list[0] as File);

    setUploadedImages(list);
    setError(null);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setUploadedImages([]);
    setRows([]);
    setError(null);
  };

  const handleExtract = () => {
    if (!uploadedImages.length) return;
    extractPaymentOCR.mutate(uploadedImages);
  };

  // ---- render ---------------------------------------------------------------
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-gray-800">
          Payment Document OCR
        </h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div
              className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : uploadedImage
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
              onDrop={handleImageDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() =>
                document.getElementById("image-upload-input")?.click()
              }
            >
              {uploadedImage ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <ImageIcon className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium text-green-700">
                        {uploadedImage.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedImage();
                      }}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {isExtracting && (
                    <div className="text-sm text-blue-600">
                      Extracting payment information...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Upload Payment Document
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Drag and drop image(s) or click to browse
                    </p>
                    <Button variant="outline" type="button">
                      Choose Image
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supported formats: JPG, PNG, TIFF, BMP • Max size: 10MB each
                  </p>
                </div>
              )}

              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                multiple
              />
            </div>

            <div className="flex flex-col justify-center">
              <Button
                type="button"
                onClick={handleExtract}
                disabled={!uploadedImages.length || isExtracting}
              >
                {extractPaymentOCR.isPending
                  ? "Extracting..."
                  : "Extract Payment Data"}
              </Button>
            </div>

            {/* Results */}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <OCRTable rows={rows} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --------------------- helpers (kept in same file) ----------------------------

function OCRTable({ rows }: { rows: Row[] }) {
  if (!rows?.length) return null;

  // prefer Excel-like order if present, then append any extra columns
  const desired = [
    "Patient Name",
    "Patient ID",
    "ICN",
    "CDT Code",
    "Tooth",
    "Date SVC",
    "Billed Amount",
    "Allowed Amount",
    "Paid Amount",
    "Extraction Success",
    "Source File",
  ];
  const dynamicCols = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set())
  );

  const columns = [
    ...desired.filter((c) => dynamicCols.includes(c)),
    ...dynamicCols.filter((c) => !desired.includes(c)),
  ];

  return (
    <div className="mt-6 overflow-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 whitespace-nowrap">
                  {formatCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}
