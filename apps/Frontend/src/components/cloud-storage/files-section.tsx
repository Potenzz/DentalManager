import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Edit3 as EditIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CloudFile } from "@repo/db/types";
import { MultipleFileUploadZone } from "@/components/file-upload/multiple-file-upload-zone";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import { Menu, Item, contextMenu } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { useAuth } from "@/hooks/use-auth";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination";
import { getPageNumbers } from "@/utils/pageNumberGenerator";
import { NewFolderModal } from "./new-folder-modal";
import { toast } from "@/hooks/use-toast";
import { Description } from "@radix-ui/react-toast";

export type FilesSectionProps = {
  parentId: number | null;
  pageSize?: number;
  className?: string;
  onFileOpen?: (fileId: number) => void;
};

const FILES_LIMIT_DEFAULT = 20;

function fileIcon(mime?: string) {
  if (!mime) return <FileIcon className="h-6 w-6" />;
  if (mime.startsWith("image/")) return <ImageIcon className="h-6 w-6" />;
  if (mime === "application/pdf" || mime.endsWith("/pdf"))
    return <FileText className="h-6 w-6" />;
  return <FileIcon className="h-6 w-6" />;
}

export default function FilesSection({
  parentId,
  pageSize = FILES_LIMIT_DEFAULT,
  className,
  onFileOpen,
}: FilesSectionProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const [data, setData] = useState<CloudFile[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // upload modal and ref
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const uploadRef = useRef<any>(null);

  // rename/delete
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);
  const [renameInitial, setRenameInitial] = useState("");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CloudFile | null>(null);

  useEffect(() => {
    loadPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, currentPage]);

  async function loadPage(page: number) {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const fid = parentId === null ? "null" : String(parentId);
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/items/files?parentId=${encodeURIComponent(
          fid
        )}&limit=${pageSize}&offset=${offset}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load files");
      const rows: CloudFile[] = Array.isArray(json.data) ? json.data : [];
      setData(rows);
      const t =
        typeof json.totalCount === "number"
          ? json.totalCount
          : typeof json.total === "number"
            ? json.total
            : rows.length;
      setTotal(t);
    } catch (err: any) {
      setData([]);
      setTotal(0);
      toast({
        title: "Failed to load files",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function showMenu(e: React.MouseEvent, file: CloudFile) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show({
      id: "files-section-menu",
      event: e.nativeEvent,
      props: { file },
    });
  }

  // rename
  function openRename(file: CloudFile) {
    setRenameTargetId(Number(file.id));
    setRenameInitial(file.name ?? "");
    setIsRenameOpen(true);
    contextMenu.hideAll();
  }
  async function submitRename(newName: string) {
    if (!renameTargetId) return;
    try {
      const res = await apiRequest(
        "PUT",
        `/api/cloud-storage/files/${renameTargetId}`,
        { name: newName }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Rename failed");
      setIsRenameOpen(false);
      setRenameTargetId(null);
      toast({ title: "File renamed" });

      loadPage(currentPage);
      qc.invalidateQueries({
        queryKey: ["/api/cloud-storage/folders/recent", 1],
      });
    } catch (err: any) {
      toast({
        title: "Rename failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  // delete
  function openDelete(file: CloudFile) {
    setDeleteTarget(file);
    setIsDeleteOpen(true);
    contextMenu.hideAll();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiRequest(
        "DELETE",
        `/api/cloud-storage/files/${deleteTarget.id}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Delete failed");
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      toast({ title: "File deleted" });

      // reload current page (ensure page index valid)
      loadPage(currentPage);
      qc.invalidateQueries({
        queryKey: ["/api/cloud-storage/folders/recent", 1],
      });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  // download
  function handleDownload(file: CloudFile) {
    // Open download endpoint in new tab so the browser handles attachment headers
    const url = `/api/cloud-storage/files/${file.id}/download`;
    window.open(url, "_blank");
    contextMenu.hideAll();
  }

  // upload: get files from MultipleFileUploadZone (imperative handle)
  async function handleUploadSubmit() {
    const files: File[] = uploadRef.current?.getFiles?.() ?? [];
    if (!files.length) return;
    try {
      for (const f of files) {
        const fid = parentId === null ? "null" : String(parentId);
        const initRes = await apiRequest(
          "POST",
          `/api/cloud-storage/folders/${encodeURIComponent(fid)}/files`,
          {
            userId,
            name: f.name,
            mimeType: f.type || null,
            expectedSize: f.size,
            totalChunks: 1,
          }
        );
        const initJson = await initRes.json();
        const created = initJson?.data;
        if (!created || typeof created.id !== "number")
          throw new Error("Init failed");
        const raw = await f.arrayBuffer();
        // upload chunk
        await apiRequest(
          "POST",
          `/api/cloud-storage/files/${created.id}/chunks?seq=0`,
          raw
        );
        // finalize
        await apiRequest(
          "POST",
          `/api/cloud-storage/files/${created.id}/complete`,
          {}
        );
        toast({ title: "Upload complete", description: f.name });
      }
      setIsUploadOpen(false);
      loadPage(currentPage);
      qc.invalidateQueries({
        queryKey: ["/api/cloud-storage/folders/recent", 1],
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(total, currentPage * pageSize);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Files</CardTitle>
          <CardDescription>Manage Files in this folder</CardDescription>
        </div>

        <Button
          variant="default"
          className="inline-flex items-center px-4 py-2"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded border hover:bg-gray-50 cursor-pointer"
                  onContextMenu={(e) => showMenu(e, file)}
                  onDoubleClick={() => onFileOpen?.(Number(file.id))}
                >
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 text-gray-500 mb-2 flex items-center justify-center">
                      {fileIcon((file as any).mimeType)}
                    </div>
                    <div
                      className="text-sm truncate text-center"
                      style={{ maxWidth: 140 }}
                    >
                      <div title={file.name}>{file.name}</div>
                      <div className="text-xs text-gray-400">
                        {((file as any).fileSize ?? 0).toString()} bytes
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing {startItem}–{endItem} of {total} results
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e: any) => {
                            e.preventDefault();
                            setCurrentPage((p) => Math.max(1, p - 1));
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {getPageNumbers(currentPage, totalPages).map(
                        (page, idx) => (
                          <PaginationItem key={idx}>
                            {page === "..." ? (
                              <span className="px-2 text-gray-500">...</span>
                            ) : (
                              <PaginationLink
                                href="#"
                                onClick={(e: any) => {
                                  e.preventDefault();
                                  setCurrentPage(page as number);
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e: any) => {
                            e.preventDefault();
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* context menu */}
      <Menu id="files-section-menu" animation="fade">
        <Item onClick={({ props }: any) => openRename(props.file)}>
          <span className="flex items-center gap-2">
            <EditIcon className="h-4 w-4" /> Rename
          </span>
        </Item>

        <Item onClick={({ props }: any) => handleDownload(props.file)}>
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Download
          </span>
        </Item>

        <Item onClick={({ props }: any) => openDelete(props.file)}>
          <span className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> Delete
          </span>
        </Item>
      </Menu>

      {/* upload modal using MultipleFileUploadZone (imperative handle) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-md w-[90%] max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Upload files</h3>
            <MultipleFileUploadZone ref={uploadRef} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadSubmit}>Upload</Button>
            </div>
          </div>
        </div>
      )}

      {/* rename modal (reusing NewFolderModal for simplicity) */}
      <NewFolderModal
        isOpen={isRenameOpen}
        initialName={renameInitial}
        title="Rename File"
        submitLabel="Rename"
        onClose={() => {
          setIsRenameOpen(false);
          setRenameTargetId(null);
        }}
        onSubmit={submitRename}
      />

      {/* delete confirm */}
      <DeleteConfirmationDialog
        isOpen={isDeleteOpen}
        entityName={deleteTarget?.name}
        onCancel={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
