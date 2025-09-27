import React, { useEffect, useState } from "react";
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
  Folder as FolderIcon,
  Plus,
  Trash2,
  Edit3 as EditIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CloudFolder } from "@repo/db/types";
import { NewFolderModal } from "@/components/cloud-storage/new-folder-modal";
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
import { recentTopLevelFoldersQueryKey } from "./recent-top-level-folder-modal";
import { toast } from "@/hooks/use-toast";

export type FolderSectionProps = {
  parentId: number | null;
  pageSize?: number;
  className?: string;
  onSelect?: (folderId: number | null) => void;
};

export default function FolderSection({
  parentId,
  pageSize = 10,
  className,
  onSelect,
}: FolderSectionProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const [data, setData] = useState<CloudFolder[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameInitial, setRenameInitial] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CloudFolder | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // reset selectedId and page when parent changes
  useEffect(() => {
    setSelectedId(null);
    setCurrentPage(1);
  }, [parentId]);

  // load page
  useEffect(() => {
    loadPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, currentPage]);

  async function loadPage(page: number) {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const pid = parentId === null ? "null" : String(parentId);
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/items/folders?parentId=${encodeURIComponent(
          pid
        )}&limit=${pageSize}&offset=${offset}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load folders");
      const rows: CloudFolder[] = Array.isArray(json.data) ? json.data : [];
      setData(rows);
      const t =
        typeof json.total === "number"
          ? json.total
          : typeof json.totalCount === "number"
            ? json.totalCount
            : rows.length;
      setTotal(t);
    } catch (err: any) {
      setData([]);
      setTotal(0);
      toast({
        title: "Failed to load folders",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // tile click toggles selection
  function handleTileClick(id: number) {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    onSelect?.(next);
    contextMenu.hideAll();
  }

  // right-click menu via react-contexify
  function showMenu(e: React.MouseEvent, folder: CloudFolder) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show({
      id: `folder-section-menu`,
      event: e.nativeEvent,
      props: { folder },
    });
  }

  // create folder
  async function handleCreate(name: string) {
    if (!userId) {
      toast({
        title: "Not signed in",
        description: "Please sign in to create folders.",
        variant: "destructive",
      });
      return; // caller should ensure auth
    }
    try {
      const res = await apiRequest("POST", "/api/cloud-storage/folders", {
        userId,
        name,
        parentId,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Create failed");
      setIsNewOpen(false);
      toast({ title: "Folder created" });
      // refresh this page and top-level recent
      loadPage(1);
      setCurrentPage(1);
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  // rename
  function openRename(folder: CloudFolder) {
    setRenameTargetId(Number(folder.id));
    setRenameInitial(folder.name ?? "");
    setIsRenameOpen(true);
    contextMenu.hideAll();
  }
  async function submitRename(newName: string) {
    if (!renameTargetId) return;
    try {
      const res = await apiRequest(
        "PUT",
        `/api/cloud-storage/folders/${renameTargetId}`,
        { name: newName }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Rename failed");
      setIsRenameOpen(false);
      setRenameTargetId(null);
      toast({ title: "Folder renamed" });

      loadPage(currentPage);
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
    } catch (err: any) {
      toast({
        title: "Rename failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    }
  }

  // delete
  function openDelete(folder: CloudFolder) {
    setDeleteTarget(folder);
    setIsDeleteOpen(true);
    contextMenu.hideAll();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiRequest(
        "DELETE",
        `/api/cloud-storage/folders/${deleteTarget.id}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Delete failed");
      // deselect if needed
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        onSelect?.(null);
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      toast({ title: "Folder deleted" });

      // reload current page (if empty page and not first, move back)
      const maybePage = Math.max(1, currentPage);
      loadPage(maybePage);
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
    } catch (err: any) {
      toast({
        title: "Delete failed",
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
          <CardTitle>Folders</CardTitle>
          <CardDescription>Manage all its Child folders</CardDescription>
        </div>

        <Button
          variant="default"
          className="inline-flex items-center px-4 py-2"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {data.map((f) => {
                const isSelected = selectedId === f.id;
                return (
                  <div key={f.id} className="flex">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTileClick(Number(f.id))}
                      onContextMenu={(e) => showMenu(e, f)}
                      className={
                        "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer " +
                        (isSelected ? "ring-2 ring-blue-400 bg-blue-50" : "")
                      }
                    >
                      <FolderIcon className="h-6 w-6 text-yellow-500" />
                      <div className="text-sm truncate">{f.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination inside card */}
            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
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

      {/* react-contexify menu */}
      <Menu id="folder-section-menu" animation="fade">
        <Item onClick={({ props }: any) => openRename(props.folder)}>
          <span className="flex items-center gap-2">
            <EditIcon className="h-4 w-4" /> Rename
          </span>
        </Item>

        <Item onClick={({ props }: any) => openDelete(props.folder)}>
          <span className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> Delete
          </span>
        </Item>
      </Menu>

      {/* Modals */}
      <NewFolderModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={handleCreate}
      />

      <NewFolderModal
        isOpen={isRenameOpen}
        initialName={renameInitial}
        title="Rename Folder"
        submitLabel="Rename"
        onClose={() => {
          setIsRenameOpen(false);
          setRenameTargetId(null);
        }}
        onSubmit={submitRename}
      />

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
