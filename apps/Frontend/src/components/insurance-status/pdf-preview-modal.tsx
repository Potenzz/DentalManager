// src/components/insurance-status/pdf-preview-modal.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Maximize2, Minimize2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  pdfId?: number | null;
  fallbackFilename?: string | null;
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const filenameStarMatch = header.match(/filename\*\s*=\s*([^;]+)/i);
  if (filenameStarMatch && filenameStarMatch[1]) {
    let raw = filenameStarMatch[1].trim();
    raw = raw.replace(/^"(.*)"$/, "$1");
    const parts = raw.split("''");
    if (parts.length === 2 && parts[1]) {
      try {
        return decodeURIComponent(parts[1]);
      } catch {
        return parts[1];
      }
    }
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  const filenameMatchQuoted = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (filenameMatchQuoted && filenameMatchQuoted[1]) {
    return filenameMatchQuoted[1].trim();
  }
  const filenameMatch = header.match(/filename\s*=\s*([^;]+)/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].trim().replace(/^"(.*)"$/, "$1");
  }

  return null;
}

export function PdfPreviewModal({
  open,
  onClose,
  pdfId,
  fallbackFilename = null,
}: Props) {
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedFilename, setResolvedFilename] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!open) return;

    let objectUrl: string | null = null;
    const controller = new AbortController();
    let aborted = false;

    const fetchPdf = async () => {
      if (!pdfId) {
        setError("No PDF id provided.");
        return;
      }

      setLoading(true);
      setError(null);
      setResolvedFilename(null);

      try {
        const res = await apiRequest("GET", `/api/documents/pdf-files/${pdfId}`);
        if (!res) {
          throw new Error("No response from server");
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Failed to fetch PDF: ${res.status}`);
        }

        const contentDispHeader =
          res.headers?.get?.("content-disposition") ??
          res.headers?.get?.("Content-Disposition") ??
          null;

        const parsedFilename = parseFilenameFromContentDisposition(contentDispHeader);
        const finalName = parsedFilename ?? fallbackFilename ?? `file_${pdfId}.pdf`;
        setResolvedFilename(finalName);

        const arrayBuffer = await res.arrayBuffer();
        if (aborted) return;

        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(blob);
        setFileBlobUrl(objectUrl);
      } catch (err: any) {
        if (err && (err.name === "AbortError" || err.message === "The user aborted a request.")) {
          return;
        }
        console.error("PdfPreviewModal fetch error:", err);
        setError(err?.message ?? "Failed to fetch PDF");
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      aborted = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setFileBlobUrl(null);
      setError(null);
      setLoading(false);
      setResolvedFilename(null);
      setIsFullscreen(false);
    };
  }, [open, pdfId, fallbackFilename]);

  if (!open) return null;

  const handleDownload = () => {
    if (!fileBlobUrl) return;
    const a = document.createElement("a");
    a.href = fileBlobUrl;
    a.download = resolvedFilename ?? `file_${pdfId ?? "unknown"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const wrapperClass = isFullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50";

  const containerClass = isFullscreen
    ? "bg-white w-full h-full rounded-none m-0 shadow-none flex flex-col"
    : "bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-4/5 xl:w-3/4 h-5/6 flex flex-col";

  return (
    <div className={wrapperClass}>
      <div className={containerClass}>
        <div className="flex items-center justify-between p-3 md:p-4 border-b">
          <div className="flex flex-col">
            <h3 className="text-lg md:text-xl font-semibold">
              {resolvedFilename ?? "PDF Preview"}
            </h3>
            <p className="text-sm text-muted-foreground">{pdfId ? `ID: ${pdfId}` : ""}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen((s) => !s)}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" onClick={handleDownload} disabled={!fileBlobUrl || loading}>
              Download
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 md:p-4">
          {loading && <div>Loading PDF…</div>}
          {error && <div className="text-destructive">Error: {error}</div>}
          {fileBlobUrl && (
            <iframe
              title="PDF Preview"
              src={fileBlobUrl}
              className="w-full h-full border"
              style={{ minHeight: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
