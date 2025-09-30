import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Download, Maximize2, Minimize2, Trash2, X } from "lucide-react";
import { DeleteConfirmationDialog } from "../ui/deleteDialog";
import { QueryClient } from "@tanstack/react-query";
import { cloudFilesQueryKeyRoot } from "./files-section";

type Props = {
  fileId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function FilePreviewModal({
  fileId,
  isOpen,
  onClose,
  onDeleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !fileId) return;

    let cancelled = false;
    let createdUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setMeta(null);
      setBlobUrl(null);

      try {
        const metaRes = await apiRequest(
          "GET",
          `/api/cloud-storage/files/${fileId}`
        );
        const metaJson = await metaRes.json();
        if (!metaRes.ok) {
          throw new Error(metaJson?.message || "Failed to load file metadata");
        }
        if (cancelled) return;
        setMeta(metaJson.data);

        const contentRes = await apiRequest(
          "GET",
          `/api/cloud-storage/files/${fileId}/content`
        );
        if (!contentRes.ok) {
          let msg = `Preview request failed (${contentRes.status})`;
          try {
            const j = await contentRes.json();
            msg = j?.message ?? msg;
          } catch (e) {}
          throw new Error(msg);
        }
        const blob = await contentRes.blob();
        if (cancelled) return;
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
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, fileId]);

  if (!isOpen) return null;

  const mime = meta?.mimeType ?? "";

  async function handleDownload() {
    if (!fileId) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/files/${fileId}/download`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta?.name ?? `file-${fileId}`;
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

  async function confirmDelete() {
    if (!fileId) return;

    setIsDeleteOpen(false);
    setDeleting(true);

    try {
      const res = await apiRequest(
        "DELETE",
        `/api/cloud-storage/files/${fileId}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Delete failed (${res.status})`);
      }

      toast({
        title: "Deleted",
        description: `File "${meta?.name ?? `file-${fileId}`}" deleted.`,
      });

      // notify parent to refresh lists if they provided callback
      if (typeof onDeleted === "function") {
        try {
          onDeleted();
        } catch (e) {
          // ignore parent errors
        }
      }

      // close modal
      onClose();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  // container sizing classes
  const containerBase =
    "bg-white rounded-md p-3 flex flex-col overflow-hidden shadow-xl";
  const sizeClass = isFullscreen
    ? "w-[95vw] h-[95vh]"
    : "w-[min(1200px,95vw)] h-[85vh]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className={`${containerBase} ${sizeClass} max-w-full max-h-full`}>
        {/* header */}

        <div className="flex items-start justify-between gap-3 pb-2 border-b">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {meta?.name ?? "Preview"}
            </h3>
            <div className="text-sm text-gray-500 truncate">
              {meta?.mimeType ?? ""}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFullscreen((s) => !s)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <Button variant="ghost" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button onClick={onClose}>
              {" "}
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-auto mt-3">
          {/* loading / error */}
          {loading && (
            <div className="w-full h-full flex items-center justify-center">
              Loading preview…
            </div>
          )}
          {error && <div className="text-red-600">{error}</div>}

          {/* image */}
          {!loading && !error && blobUrl && mime.startsWith("image/") && (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={blobUrl}
                alt={meta?.name}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: "calc(100vh - 200px)" }}
              />
            </div>
          )}

          {/* pdf */}
          {!loading &&
            !error &&
            blobUrl &&
            (mime === "application/pdf" || mime.endsWith("/pdf")) && (
              <div className="w-full h-full">
                <iframe
                  src={blobUrl}
                  title={meta?.name}
                  className="w-full h-full border-0"
                  style={{ minHeight: 400 }}
                />
              </div>
            )}

          {/* fallback */}
          {!loading &&
            !error &&
            blobUrl &&
            !mime.startsWith("image/") &&
            !mime.includes("pdf") && (
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

      <DeleteConfirmationDialog
        isOpen={isDeleteOpen}
        entityName={meta?.name ?? undefined}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
