// PaymentOCRBlock.tsx
import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { QK_PAYMENTS_RECENT_BASE } from "@/components/payments/payments-recent-table";
import { QK_PATIENTS_BASE } from "@/components/patients/patient-table";
import {
  MultipleFileUploadZone,
  MultipleFileUploadZoneHandle,
} from "../file-upload/multiple-file-upload-zone";

// ---------------- Types ----------------

type Row = { __id: number } & Record<string, string | number | null>;

export default function PaymentOCRBlock() {
  //Config
  const MAX_FILES = 10;
  const ACCEPTED_FILE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";
  const TITLE = "Payment Document OCR";
  const DESCRIPTION =
    "You can upload up to 10 files. Allowed types: JPG, PNG, WEBP.";

  // FILE/ZONE state
  const uploadZoneRef = React.useRef<MultipleFileUploadZoneHandle | null>(null);
  const [filesForUI, setFilesForUI] = React.useState<File[]>([]); // reactive UI only
  const [isUploading, setIsUploading] = React.useState(false); // forwarded to zone
  const [isExtracting, setIsExtracting] = React.useState(false);

  // extracted rows shown only inside modal
  const [rows, setRows] = React.useState<Row[]>([]);
  const [modalColumns, setModalColumns] = React.useState<string[]>([]);
  const [showModal, setShowModal] = React.useState(false);

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

      setModalColumns(allKeys);

      setIsExtracting(false);
      setShowModal(true);
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

  // ---- handlers (all in this file) -----------------------------------------

  // Called by zone when its internal list changes (keeps parent UI reactive)
  const handleZoneFilesChange = React.useCallback((files: File[]) => {
    setFilesForUI(files);
    setError(null);
  }, []);

  // Remove a single file by asking the zone to remove it (zone exposes removeFile)
  const removeUploadedFile = React.useCallback((index: number) => {
    uploadZoneRef.current?.removeFile(index);
    // zone will call onFilesChange and update filesForUI automatically
  }, []);

  // Extract: read files from zone via ref and call mutation
  const handleExtract = () => {
    const files = uploadZoneRef.current?.getFiles() ?? [];
    if (!files.length) {
      setError("Please upload at least one file to extract.");
      return;
    }
    setIsExtracting(true);
    extractPaymentOCR.mutate(files);
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

      // 🔄 REFRESH both tables (all pages/filters)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK_PAYMENTS_RECENT_BASE }), // all recent payments
        queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE }), // recent patients list
      ]);

      // ✅ CLEAR UI: reset zone + modal + rows
      uploadZoneRef.current?.reset();
      setFilesForUI([]);
      setRows([]);
      setModalColumns([]);
      setError(null);
      setIsExtracting(false);
      setShowModal(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Upload block */}
          <div className="bg-gray-100 p-4 rounded-md space-y-4">
            <MultipleFileUploadZone
              ref={uploadZoneRef}
              isUploading={isUploading}
              acceptedFileTypes={ACCEPTED_FILE_TYPES}
              maxFiles={MAX_FILES}
              onFilesChange={handleZoneFilesChange} // reactive UI only
            />

            {/* Show list of files received from the upload zone (UI only) */}
            {filesForUI.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Uploaded ({filesForUI.length}/{MAX_FILES})
                </p>
                <ul className="space-y-2 max-h-48 overflow-auto">
                  {filesForUI.map((file, idx) => (
                    <li
                      key={`${file.name}-${file.size}-${idx}`}
                      className="flex items-center justify-between border rounded-md p-2 bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <ImageIcon className="h-6 w-6 text-green-500" />
                        <div className="text-left">
                          <p className="font-medium text-green-700 truncate">
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
                        onClick={() => removeUploadedFile(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Extract */}
          <div className="mt-4 flex justify-end gap-4">
            <Button
              className="w-full h-12 gap-2"
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || !filesForUI.length}
            >
              {extractPaymentOCR.isPending
                ? "Extracting..."
                : "Extract Payment Data"}
            </Button>
          </div>

          {/* show extraction error if any */}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <OCRDetailsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        rows={rows}
        setRows={setRows}
        columnKeys={modalColumns}
      />
    </div>
  );
}

// ---------------- Simple Modal (in-app popup) ----------------

export function OCRDetailsModal({
  open,
  onClose,
  onSave,
  rows,
  setRows,
  columnKeys,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  columnKeys: string[];
}) {
  if (!open) return null;

  //rows helper
  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRow = React.useCallback(() => {
    setRows((prev) => {
      const newRow: Row = { __id: prev.length };
      columnKeys.forEach((k) => {
        newRow[k] = "";
      });
      return [...prev, newRow];
    });
  }, [setRows, columnKeys]);

  const modalColumns = React.useMemo<ColumnDef<Row>[]>(() => {
    // ensure ICN (if present) is moved to the end of the data columns
    const reorderedKeys = [
      ...columnKeys.filter((k) => k !== "ICN"),
      ...(columnKeys.includes("ICN") ? ["ICN"] : []),
    ];

    return reorderedKeys.map((key) => ({
      id: key,
      header: key,
      cell: ({ row }) => {
        const value = (row.original[key] ?? "") as string;
        return (
          <input
            className="w-full border rounded p-1"
            value={String(value)}
            onChange={(e) => {
              const v = e.target.value;
              setRows((prev) => {
                const next = [...prev];
                next[row.index] = {
                  ...next[row.index],
                  __id: next[row.index]!.__id,
                  [key]: v,
                };
                return next;
              });
            }}
          />
        );
      },
    }));
  }, [columnKeys, setRows]);

  const table = useReactTable({
    data: rows,
    columns: modalColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* larger modal, column layout so footer sticks to bottom */}
      <div className="relative z-10 w-full max-w-[1600px] h-[92vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Row
            </Button>
            <h3 className="text-lg font-medium ml-2">OCR Payment Details</h3>
          </div>

          <div>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* body (scrollable) */}
        <div className="p-4 overflow-auto flex-1">
          <div className="min-w-max">
            <table className="border-collapse border border-gray-300 w-full">
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
                {table.getRowModel().rows.map((r) => (
                  <tr key={r.id}>
                    {r.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border p-2 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                    <td className="border p-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRow(r.index)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* footer (always visible) */}
        <div className="p-4 border-t flex justify-end">
          <Button type="button" className="h-12" onClick={onSave}>
            Save Edited Data
          </Button>
        </div>
      </div>
    </div>
  );
}
