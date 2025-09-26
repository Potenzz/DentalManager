// src/pages/cloud-storage.tsx
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Folder,
  FolderPlus,
  Search as SearchIcon,
  X,
  Plus,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Image,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/hooks/use-auth";

import type { CloudFolder, CloudFile } from "@repo/db/types";

type ApiListResponse<T> = {
  error: boolean;
  data: T;
  total?: number;
  limit?: number;
  offset?: number;
};

function truncateName(name: string, len = 28) {
  if (!name) return "";
  return name.length > len ? name.slice(0, len - 1) + "…" : name;
}

function fileIcon(mime?: string) {
  if (!mime) return <FileIcon className="h-10 w-10" />;
  if (mime.startsWith("image/")) return <Image className="h-10 w-10" />;
  if (mime === "application/pdf" || mime.endsWith("/pdf"))
    return <FileText className="h-10 w-10" />;
  return <FileIcon className="h-10 w-10" />;
}

export default function CloudStoragePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const CURRENT_USER_ID = user?.id;

  // modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [modalFolder, setModalFolder] = useState<CloudFolder | null>(null);

  // Add-folder modal (simple name/cancel/confirm) - used both from main page and inside folder
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [addFolderParentId, setAddFolderParentId] = useState<number | null>(
    null
  ); // which parent to create in
  const [addFolderName, setAddFolderName] = useState("");

  // Upload modal (simple file picker + confirm)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadParentId, setUploadParentId] = useState<number | null>(null); // which folder to upload into
  const [uploadSelectedFiles, setUploadSelectedFiles] = useState<File[]>([]);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // breadcrumb inside modal: array of {id: number|null, name}
  const [modalPath, setModalPath] = useState<
    { id: number | null; name: string }[]
  >([{ id: null, name: "My Cloud Storage" }]);

  // pagination state for folders/files in modal
  const [foldersOffset, setFoldersOffset] = useState(0);
  const [filesOffset, setFilesOffset] = useState(0);
  const FOLDERS_LIMIT = 10;
  const FILES_LIMIT = 20;

  const [modalFolders, setModalFolders] = useState<CloudFolder[]>([]);
  const [modalFiles, setModalFiles] = useState<CloudFile[]>([]);
  const [foldersTotal, setFoldersTotal] = useState(0);
  const [filesTotal, setFilesTotal] = useState(0);
  const [isLoadingModalItems, setIsLoadingModalItems] = useState(false);

  // recent folders (main page) - show only top-level (parentId === null)
  const RECENT_LIMIT = 10;
  const [recentOffset, setRecentOffset] = useState(0);
  const {
    data: recentFoldersData,
    isLoading: isLoadingRecentFolders,
    refetch: refetchRecentFolders,
  } = useQuery({
    queryKey: ["/api/cloud-storage/folders/recent", recentOffset],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/folders/recent?limit=${RECENT_LIMIT}&offset=${recentOffset}`
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || "Failed to load recent folders");
      // filter to top-level only (parentId === null)
      const filtered = (json.data || []).filter((f: any) => f.parentId == null);
      return { ...json, data: filtered } as ApiListResponse<CloudFolder[]>;
    },
  });

  /* ---------- Server fetch functions (paginated) ---------- */

  async function fetchModalFolders(
    parentId: number | null,
    limit = FOLDERS_LIMIT,
    offset = 0
  ) {
    const pid = parentId === null ? "null" : String(parentId);
    const res = await apiRequest(
      "GET",
      `/api/cloud-storage/items/folders?parentId=${encodeURIComponent(pid)}&limit=${limit}&offset=${offset}`
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json)
      throw new Error(json?.message || "Failed to fetch folders");
    return json as ApiListResponse<CloudFolder[]>;
  }

  async function fetchModalFiles(
    folderId: number | null,
    limit = FILES_LIMIT,
    offset = 0
  ) {
    const fid = folderId === null ? "null" : String(folderId);
    const res = await apiRequest(
      "GET",
      `/api/cloud-storage/folders/${encodeURIComponent(fid)}/files?limit=${limit}&offset=${offset}`
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json)
      throw new Error(json?.message || "Failed to fetch files");
    return json as ApiListResponse<CloudFile[]>;
  }

  /* ---------- load modal items (folders + files) ---------- */

  const loadModalItems = async (
    parentId: number | null,
    foldersOffsetArg = 0,
    filesOffsetArg = 0
  ) => {
    setIsLoadingModalItems(true);
    try {
      const [foldersResp, filesResp] = await Promise.all([
        fetchModalFolders(parentId, FOLDERS_LIMIT, foldersOffsetArg),
        fetchModalFiles(parentId, FILES_LIMIT, filesOffsetArg),
      ]);
      setModalFolders(foldersResp.data ?? []);
      setFoldersTotal(foldersResp.total ?? foldersResp.data?.length ?? 0);
      setModalFiles(filesResp.data ?? []);
      setFilesTotal(filesResp.total ?? filesResp.data?.length ?? 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load items",
        variant: "destructive",
      });
      setModalFolders([]);
      setModalFiles([]);
      setFoldersTotal(0);
      setFilesTotal(0);
    } finally {
      setIsLoadingModalItems(false);
    }
  };

  /* ---------- Open modal (single-click from recent or elsewhere) ---------- */
  const openFolderModal = async (folder: CloudFolder | null) => {
    const fid: number | null =
      folder && typeof (folder as any).id === "number"
        ? (folder as any).id
        : null;

    setModalPath((prev) => {
      if (!folder) return [{ id: null, name: "My Cloud Storage" }];
      const idx = prev.findIndex((p) => p.id === fid);
      if (idx >= 0) return prev.slice(0, idx + 1);
      const last = prev[prev.length - 1];
      if (last && last.id === (folder as any).parentId) {
        return [...prev, { id: fid, name: folder.name }];
      }
      return [
        { id: null, name: "My Cloud Storage" },
        { id: fid, name: folder.name },
      ];
    });

    setModalFolder(folder ?? null);
    setFoldersOffset(0);
    setFilesOffset(0);
    setUploadSelectedFiles([]);
    setIsFolderModalOpen(true);
    await loadModalItems(fid, 0, 0);
  };

  /* ---------- breadcrumb click inside modal ---------- */
  const handleModalBreadcrumbClick = async (index: number) => {
    if (!Number.isInteger(index) || index < 0) return;

    const newPath = modalPath.slice(0, index + 1);
    if (newPath.length === 0) {
      setModalPath([{ id: null, name: "My Cloud Storage" }]);
      setModalFolder(null);
      setFoldersOffset(0);
      setFilesOffset(0);
      await loadModalItems(null, 0, 0);
      return;
    }

    setModalPath(newPath);

    const target = newPath[newPath.length - 1];
    const targetId: number | null =
      target && typeof target.id === "number" ? target.id : null;

    setModalFolder(null);
    setFoldersOffset(0);
    setFilesOffset(0);
    await loadModalItems(targetId, 0, 0);
  };

  /* ---------- create folder (via Add Folder modal) ---------- */
  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const body = {
        userId: CURRENT_USER_ID,
        name,
        parentId: addFolderParentId ?? null,
      };
      const res = await apiRequest("POST", "/api/cloud-storage/folders", body);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create folder");
      return json;
    },
    onSuccess: async () => {
      toast({ title: "Folder created", description: "Folder created." });
      setIsAddFolderModalOpen(false);
      setAddFolderName("");
      // refresh modal view if we're in same parent
      await loadModalItems(
        addFolderParentId ?? null,
        foldersOffset,
        filesOffset
      );
      queryClient.invalidateQueries({
        queryKey: ["/api/cloud-storage/folders/recent"],
      });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      }),
  });

  /* ---------- Upload logic (via upload modal) ----------
     Use arrayBuffer() and send as raw bytes to POST /files/:id/chunks?seq=...,
     then POST /files/:id/complete
  */
  const uploadSingleFile = async (
    file: File,
    targetFolderId: number | null
  ) => {
    const folderParam =
      targetFolderId === null ? "null" : String(targetFolderId);
    const body = {
      userId: CURRENT_USER_ID,
      name: file.name,
      mimeType: file.type || null,
      expectedSize: file.size,
      totalChunks: 1,
    };

    const initRes = await apiRequest(
      "POST",
      `/api/cloud-storage/folders/${encodeURIComponent(folderParam)}/files`,
      body
    );
    const initJson = await initRes.json().catch(() => null);
    if (!initRes.ok || !initJson)
      throw new Error(
        initJson?.message ?? `Init failed (status ${initRes.status})`
      );
    const created: CloudFile = initJson.data;
    if (!created || typeof created.id !== "number")
      throw new Error("Invalid response from init: missing file id");

    // prepare raw bytes
    const raw = await file.arrayBuffer();
    const chunkUrl = `/api/cloud-storage/files/${created.id}/chunks?seq=0`;

    try {
      await apiRequest("POST", chunkUrl, raw);
    } catch (err: any) {
      try {
        await apiRequest("DELETE", `/api/cloud-storage/files/${created.id}`);
      } catch (_) {}
      throw new Error(`Chunk upload failed: ${err?.message ?? String(err)}`);
    }

    const completeRes = await apiRequest(
      "POST",
      `/api/cloud-storage/files/${created.id}/complete`,
      {}
    );
    const completeJson = await completeRes.json().catch(() => null);
    if (!completeRes.ok || !completeJson)
      throw new Error(
        completeJson?.message ??
          `Finalize failed (status ${completeRes.status})`
      );
    return completeJson;
  };

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const targetFolderId =
        uploadParentId ?? modalPath[modalPath.length - 1]?.id ?? null;
      const results = [];
      for (const f of files) {
        results.push(await uploadSingleFile(f, targetFolderId));
      }
      return results;
    },
    onSuccess: async () => {
      toast({ title: "Upload complete", description: "Files uploaded." });
      setUploadSelectedFiles([]);
      setIsUploadModalOpen(false);
      await loadModalItems(
        modalPath[modalPath.length - 1]?.id ?? null,
        foldersOffset,
        filesOffset
      );
      queryClient.invalidateQueries({
        queryKey: ["/api/cloud-storage/folders/recent"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Upload failed",
        variant: "destructive",
      });
    },
  });

  /* ---------- handlers ---------- */

  const handleUploadFileSelection = (filesList: FileList | null) => {
    setUploadSelectedFiles(filesList ? Array.from(filesList) : []);
  };

  const startUploadFromModal = () => {
    if (!uploadSelectedFiles.length) {
      toast({
        title: "No files",
        description: "Select files to upload",
        variant: "destructive",
      });
      return;
    }
    uploadFilesMutation.mutate(uploadSelectedFiles);
  };

  const handleFoldersPage = async (dir: "next" | "prev") => {
    const newOffset =
      dir === "next"
        ? foldersOffset + FOLDERS_LIMIT
        : Math.max(0, foldersOffset - FOLDERS_LIMIT);
    setFoldersOffset(newOffset);
    await loadModalItems(
      modalPath[modalPath.length - 1]?.id ?? null,
      newOffset,
      filesOffset
    );
  };

  const handleFilesPage = async (dir: "next" | "prev") => {
    const newOffset =
      dir === "next"
        ? filesOffset + FILES_LIMIT
        : Math.max(0, filesOffset - FILES_LIMIT);
    setFilesOffset(newOffset);
    await loadModalItems(
      modalPath[modalPath.length - 1]?.id ?? null,
      foldersOffset,
      newOffset
    );
  };

  useEffect(() => {
    refetchRecentFolders();
  }, [recentOffset]);

  /* ---------- Render ---------- */

  return (
    <div>
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
            <p className="text-muted-foreground">
              Recent top-level folders — click any folder to open it.
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              onClick={() => {
                /* search omitted */
              }}
            >
              <SearchIcon className="h-4 w-4 mr-2" /> Search
            </Button>

            {/* MAIN PAGE New Folder: open Add Folder modal (parent null) */}
            <Button
              onClick={() => {
                setAddFolderParentId(null);
                setAddFolderName("");
                setIsAddFolderModalOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" /> New Folder (root)
            </Button>
          </div>
        </div>

        {/* Recent Folders (top-level only) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Folders</CardTitle>
            <CardDescription>
              Most recently updated top-level folders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecentFolders ? (
              <div className="py-6 text-center">Loading...</div>
            ) : (
              <>
                <div className="flex gap-3 overflow-x-auto py-2">
                  {(recentFoldersData?.data ?? []).map((f) => (
                    <div key={f.id} className="flex-shrink-0">
                      <div
                        onClick={() => openFolderModal(f)}
                        className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                        style={{ minWidth: 120 }}
                      >
                        <Folder className="h-10 w-10 text-yellow-500 mb-1" />
                        <div
                          className="text-sm max-w-[140px] text-center truncate"
                          title={f.name}
                        >
                          {f.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(recentFoldersData?.data ?? []).length} recent
                    folders
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRecentOffset(
                          Math.max(0, recentOffset - RECENT_LIMIT)
                        )
                      }
                      disabled={recentOffset === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRecentOffset(recentOffset + RECENT_LIMIT)
                      }
                      disabled={
                        !recentFoldersData?.data?.length ||
                        recentFoldersData!.data.length < RECENT_LIMIT
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Modal: spacing so not flush top/bottom */}
      <Dialog
        open={isFolderModalOpen}
        onOpenChange={(v) => {
          setIsFolderModalOpen(v);
          if (!v) {
            setModalFolder(null);
            setModalPath([{ id: null, name: "My Cloud Storage" }]);
            setModalFolders([]);
            setModalFiles([]);
            setUploadSelectedFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-full my-8">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div className="w-full">
                {/* breadcrumb inside modal */}
                <Breadcrumb>
                  <BreadcrumbList>
                    {modalPath.map((p, idx) => (
                      <div
                        key={String(p.id) + idx}
                        className="flex items-center"
                      >
                        {idx > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {idx === modalPath.length - 1 ? (
                            <BreadcrumbPage>{p.name}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              className="cursor-pointer hover:text-primary"
                              onClick={() => handleModalBreadcrumbClick(idx)}
                            >
                              {p.name}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 p-4">
            {/* ----- Folders row ----- */}
            <Card>
              <CardHeader>
                <CardTitle>Folders</CardTitle>
                <CardDescription>
                  Child folders (page size {FOLDERS_LIMIT})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 overflow-x-auto py-2">
                  {/* Add Folder tile: opens Add Folder modal (parent = current modal parent) */}
                  <div className="flex-shrink-0">
                    <div
                      className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-dashed border-gray-200 flex items-center justify-center"
                      onClick={() => {
                        setAddFolderParentId(
                          modalPath[modalPath.length - 1]?.id ?? null
                        );
                        setAddFolderName("");
                        setIsAddFolderModalOpen(true);
                      }}
                      style={{ minWidth: 120 }}
                    >
                      <Plus className="h-10 w-10" />
                    </div>
                  </div>

                  {modalFolders.map((f) => (
                    <div key={f.id} className="flex-shrink-0">
                      <div
                        onClick={() => openFolderModal(f)}
                        className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                        style={{ minWidth: 120 }}
                      >
                        <Folder className="h-10 w-10 text-yellow-500 mb-1" />
                        <div
                          className="text-sm truncate text-center"
                          style={{ maxWidth: 120 }}
                          title={f.name}
                        >
                          {f.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {modalFolders.length} of {foldersTotal}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFoldersPage("prev")}
                      disabled={foldersOffset === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFoldersPage("next")}
                      disabled={foldersOffset + FOLDERS_LIMIT >= foldersTotal}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ----- Files section (below folders) ----- */}
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
                <CardDescription>
                  Files in this folder (page size {FILES_LIMIT})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500">
                      Target: {modalPath[modalPath.length - 1]?.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* ADD FILE tile (only + icon) */}
                    <div
                      className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-dashed border-gray-200 flex items-center justify-center"
                      onClick={() => {
                        setUploadParentId(
                          modalPath[modalPath.length - 1]?.id ?? null
                        );
                        setUploadSelectedFiles([]);
                        setIsUploadModalOpen(true);
                      }}
                      style={{ minWidth: 120 }}
                    >
                      <Plus className="h-10 w-10" />
                    </div>
                  </div>
                </div>

                {isLoadingModalItems ? (
                  <div className="py-6 text-center">Loading...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {modalFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded hover:bg-gray-50 border"
                          title={file.name}
                        >
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 text-gray-500 mb-2 flex items-center justify-center">
                              {fileIcon((file as any).mimeType)}
                            </div>
                            <div
                              className="text-sm truncate text-center"
                              style={{ maxWidth: 140 }}
                            >
                              <div title={file.name}>
                                {truncateName(file.name, 28)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {((file as any).fileSize ?? 0).toString()} bytes
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {modalFiles.length} of {filesTotal}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFilesPage("prev")}
                          disabled={filesOffset === 0}
                        >
                          Prev
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFilesPage("next")}
                          disabled={filesOffset + FILES_LIMIT >= filesTotal}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFolderModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Folder Modal (simple name/cancel/confirm) */}
      <Dialog
        open={isAddFolderModalOpen}
        onOpenChange={(v) => {
          setIsAddFolderModalOpen(v);
          if (!v) {
            setAddFolderName("");
            setAddFolderParentId(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-full my-8">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-lg font-semibold">Create Folder</h3>
                <div className="text-sm text-muted-foreground">
                  Parent:{" "}
                  {addFolderParentId == null
                    ? "Root"
                    : `id ${addFolderParentId}`}
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddFolderModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4">
            <Input
              placeholder="Folder name"
              value={addFolderName}
              onChange={(e) => setAddFolderName(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={() => createFolder.mutate(addFolderName.trim())}>
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddFolderModalOpen(false);
                  setAddFolderName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(v) => {
          setIsUploadModalOpen(v);
          if (!v) {
            setUploadSelectedFiles([]);
            setUploadParentId(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-full my-8">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-lg font-semibold">Upload Files</h3>
                <div className="text-sm text-muted-foreground">
                  Target:{" "}
                  {uploadParentId == null ? "Root" : `id ${uploadParentId}`}
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4">
            <Label>Choose files (multiple)</Label>
            <input
              ref={uploadFileInputRef}
              type="file"
              multiple
              onChange={(e) => handleUploadFileSelection(e.target.files)}
            />
            <div className="mt-2">
              {uploadSelectedFiles.length ? (
                <div className="text-sm mb-2">
                  {uploadSelectedFiles.map((f) => f.name).join(", ")}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-2">
                  No files selected
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => uploadFileInputRef.current?.click()}>
                  Pick files
                </Button>
                <Button
                  onClick={startUploadFromModal}
                  disabled={!uploadSelectedFiles.length}
                >
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadSelectedFiles([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
