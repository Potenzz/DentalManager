// PaymentOCRBlock.tsx
import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, X, Plus, Minus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { convertOCRDate } from "@/utils/dateUtils";

// ---------------- Types ----------------

type Row = { __id: number } & Record<string, string | number | null>;

export default function PaymentOCRBlock() {
  // UI state
  const [uploadedImages, setUploadedImages] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef<Row>[]>([]);
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
    onSuccess: (data) => {
      // Remove unwanted keys before using the data
      const cleaned = data.map((row) => {
        const { ["Extraction Success"]: _, ["Source File"]: __, ...rest } = row;
        return rest;
      });

      const withIds: Row[] = cleaned.map((r, i) => ({ ...r, __id: i }));
      setRows(withIds);

      const allKeys = Array.from(
        cleaned.reduce<Set<string>>((acc, row) => {
          Object.keys(row).forEach((k) => acc.add(k));
          return acc;
        }, new Set())
      );

      setColumns(
        allKeys.map((key) => ({
          id: key, // ✅ unique identifier
          header: key,
          cell: ({ row }) => (
            <input
              className="w-full border rounded p-1"
              value={(row.original[key] as string) ?? ""}
              onChange={(e) => {
                const newData = [...rows];
                newData[row.index] = {
                  ...newData[row.index],
                  __id: newData[row.index]!.__id,
                  [key]: e.target.value,
                };
                setRows(newData);
              }}
            />
          ),
        }))
      );

      setIsExtracting(false);
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to extract payment data: ${error.message}`,
        variant: "destructive",
      });
      setIsExtracting(false);
    },
  });

  // ---- Table instance ----
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ---- handlers (all in this file) -----------------------------------------

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    if (list.length > 10) {
      setError("You can only upload up to 10 images.");
      return;
    }
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
    if (list.length > 10) {
      setError("You can only upload up to 10 images.");
      return;
    }

    setUploadedImages(list);
    setError(null);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setRows([]);
        setColumns([]);
        setError(null);
      }
      return next;
    });
  };

  const handleExtract = () => {
    if (!uploadedImages.length) return;
    setIsExtracting(true);
    extractPaymentOCR.mutate(uploadedImages);
  };

  const handleSave = async () => {
    try {
      const skipped: string[] = [];

      const payload = rows
        .map((row, idx) => {
          const patientName = row["Patient Name"];
          const patientId = row["Patient ID"];
          const procedureCode = row["CDT Code"];

          if (!patientName || !patientId || !procedureCode) {
            skipped.push(`Row ${idx + 1} (missing name/id/procedureCode)`);
            return null;
          }

          return {
            patientName,
            insuranceId: patientId,
            icn: row["ICN"] ?? null,
            procedureCode: row["CDT Code"],
            toothNumber: row["Tooth"] ?? null,
            toothSurface: row["Surface"] ?? null,
            procedureDate: row["Date SVC"] ?? null,
            totalBilled: Number(row["Billed Amount"] ?? 0),
            totalAllowed: Number(row["Allowed Amount"] ?? 0),
            totalPaid: Number(row["Paid Amount"] ?? 0),
            sourceFile: row["Source File"] ?? null,
          };
        })
        .filter((r) => r !== null);

      if (skipped.length > 0) {
        toast({
          title:
            "Some rows skipped, because of either no patient Name or MemberId given.",
          description: skipped.join(", "),
          variant: "destructive",
        });
      }

      if (payload.length === 0) {
        toast({
          title: "Error",
          description: "No valid rows to save",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/payments/full-ocr-import", {
        rows: payload,
      });

      if (!res.ok) throw new Error("Failed to save OCR payments");

      toast({ title: "Saved", description: "OCR rows saved successfully" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  //rows helper
  const handleAddRow = () => {
    const newRow: Row = { __id: rows.length };
    columns.forEach((c) => {
      if (c.id) newRow[c.id] = "";
    });
    setRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-gray-800">
          Payment Document OCR
        </h2>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Upload block */}
          <div
            className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : uploadedImages.length
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
            {uploadedImages.length ? (
              <div className="space-y-4">
                {uploadedImages.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between space-x-4 border rounded-md p-2 bg-white"
                  >
                    <div className="flex items-center space-x-3">
                      <ImageIcon className="h-6 w-6 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium text-green-700">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedImage(idx);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Upload Payment Documents
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop up to 10 images or click to browse
                  </p>
                  <Button variant="outline" type="button">
                    Choose Images
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

          {/* Extract */}

          <div className="flex justify-end gap-4">
            <Button
              className="w-full h-12 gap-2"
              type="button"
              onClick={handleExtract}
              disabled={!uploadedImages.length || isExtracting}
            >
              {extractPaymentOCR.isPending
                ? "Extracting..."
                : "Extract Payment Data"}
            </Button>
          </div>

          {/* Results Table */}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {rows.length > 0 && (
            <div className="space-y-4">
              {/* Row/Column control buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleAddRow}>
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
              </div>

              {/* Table */}

              <div className="overflow-x-auto">
                <table className="border-collapse border border-gray-300 w-full table-auto min-w-max">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="bg-gray-100">
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border p-2 text-left whitespace-nowrap"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </th>
                        ))}
                        <th className="border p-2">Actions</th>
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, rowIndex) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => {
                          const colId = cell.column.id; // ✅ key for field
                          return (
                            <td
                              key={cell.id}
                              className="border p-2 whitespace-nowrap"
                            >
                              <input
                                className="w-full border rounded p-1"
                                value={
                                  (rows[rowIndex]?.[colId] as string) ?? ""
                                }
                                onChange={(e) => {
                                  const newData = [...rows];
                                  newData[rowIndex] = {
                                    ...newData[rowIndex],
                                    __id: newData[rowIndex]!.__id, // keep id
                                    [colId]: e.target.value,
                                  };
                                  setRows(newData);
                                }}
                              />
                            </td>
                          );
                        })}
                        <td className="border p-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRow(rowIndex)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                className="w-full h-12 gap-2"
                type="button"
                variant="warning"
                onClick={handleSave}
              >
                Save Edited Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
