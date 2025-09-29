import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Maximize2, Minimize2, Download, X } from "lucide-react";

type Props = {
  fileId: number | null;
  isOpen: boolean;
  onClose: () => void;
  initialFileName?: string | null;
};

export default function DocumentsFilePreviewModal({
  fileId,
  isOpen,
  onClose,
  initialFileName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [mime, setMime] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(
    initialFileName ?? null
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen || !fileId) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setMime(null);
      setFileName(initialFileName ?? null);
      setBlobUrl(null);

      try {
        // Fetch the file bytes using the Documents API endpoint (returns raw bytes)
        const res = await apiRequest(
          "GET",
          `/api/documents/pdf-files/${fileId}`
        );

        if (!res.ok) {
          // try to parse error message from JSON body
          let msg = `Preview request failed (${res.status})`;
          try {
            const j = await res.json();
            msg = j?.message ?? msg;
          } catch {}
          throw new Error(msg);
        }

        // try to infer MIME from headers; fallback to application/pdf
        const contentType =
          res.headers.get("content-type") ?? "application/pdf";
        setMime(contentType);
        // If server provided filename in headers (Content-Disposition), we could parse it here.
        // Use initialFileName if provided, otherwise keep unset until download.
        if (!fileName && initialFileName) setFileName(initialFileName);

        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const blob = new Blob([arrayBuffer], { type: contentType });
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleDownload() {
    if (!fileId) return;
    try {
      const res = await apiRequest("GET", `/api/documents/pdf-files/${fileId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Download failed (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: mime ?? "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ?? `file-${fileId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  const containerBase =
    "bg-white rounded-md p-3 flex flex-col overflow-hidden shadow-xl";
  const sizeClass = isFullscreen
    ? "w-[95vw] h-[95vh]"
    : "w-[min(1200px,95vw)] h-[85vh]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className={`${containerBase} ${sizeClass} max-w-full max-h-full`}>
        <div className="flex items-start justify-between gap-3 pb-2 border-b">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {fileName ?? `File #${fileId}`}
            </h3>
            <div className="text-sm text-gray-500 truncate">{mime ?? ""}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen((s) => !s)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="p-2 rounded hover:bg-gray-100"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleDownload}
              title="Download"
              className="p-2 rounded hover:bg-gray-100"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto mt-3">
          {loading && (
            <div className="w-full h-full flex items-center justify-center">
              Loading preview…
            </div>
          )}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && blobUrl && mime?.startsWith("image/") && (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={blobUrl}
                alt={fileName ?? ""}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {!loading &&
            !error &&
            blobUrl &&
            (mime === "application/pdf" || mime?.endsWith("/pdf")) && (
              <div className="w-full h-full">
                <iframe
                  src={blobUrl}
                  title={fileName ?? `PDF ${fileId}`}
                  className="w-full h-full border-0"
                />
              </div>
            )}

          {!loading &&
            !error &&
            blobUrl &&
            !mime?.startsWith("image/") &&
            !mime?.includes("pdf") && (
              <div className="p-4">
                <p>Preview not available for this file type.</p>
                <p className="mt-2">
                  <a
                    href={blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Open raw
                  </a>
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
