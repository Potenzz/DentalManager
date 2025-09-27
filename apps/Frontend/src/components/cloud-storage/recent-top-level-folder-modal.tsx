import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EditIcon, Folder, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CloudFolder } from "@repo/db/types";
import { getPageNumbers } from "@/utils/pageNumberGenerator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination";
import type { QueryKey } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NewFolderModal } from "@/components/cloud-storage/new-folder-modal";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";
import { Menu, Item, contextMenu } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";

export const recentTopLevelFoldersQueryKey = (page: number): QueryKey => [
  "/api/cloud-storage/folders/recent",
  page,
];

export type RecentTopLevelFoldersCardProps = {
  pageSize?: number;
  initialPage?: number;
  className?: string;
  onSelect?: (folderId: number | null) => void;
};

export default function RecentTopLevelFoldersCard({
  pageSize = 10,
  initialPage = 1,
  className,
  onSelect,
}: RecentTopLevelFoldersCardProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameInitialName, setRenameInitialName] = useState<string>("");
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CloudFolder | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    data: recentFoldersData,
    isLoading: isLoadingRecentFolders,
    refetch,
  } = useQuery({
    queryKey: recentTopLevelFoldersQueryKey(currentPage),
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/folders/recent?limit=${pageSize}&offset=${offset}`
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || "Failed to load recent folders");

      const data: CloudFolder[] = Array.isArray(json.data) ? json.data : [];
      const totalCount =
        typeof json.totalCount === "number"
          ? json.totalCount
          : typeof json.total === "number"
            ? json.total
            : data.length;

      return { data, totalCount };
    },
  });

  const data = recentFoldersData?.data ?? [];
  const totalCount = recentFoldersData?.totalCount ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, currentPage * pageSize);

  // toggle selection: select if different, deselect if same
  function handleTileClick(id: number) {
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      onSelect?.(null);
    } else {
      setSelectedFolderId(id);
      onSelect?.(id);
    }
    // close any open context menu
    contextMenu.hideAll();
  }

  // show react-contexify menu on right-click
  function handleContextMenu(e: React.MouseEvent, folder: CloudFolder) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show({
      id: "recent-folder-context-menu",
      event: e.nativeEvent,
      props: { folder },
    });
  }

  // rename flow
  function openRename(folder: CloudFolder) {
    setRenameTargetId(Number(folder.id));
    setRenameInitialName(folder.name ?? "");
    setIsRenameOpen(true);
    contextMenu.hideAll();
  }

  async function handleRenameSubmit(newName: string) {
    if (!renameTargetId) return;
    try {
      const res = await apiRequest(
        "PUT",
        `/api/cloud-storage/folders/${renameTargetId}`,
        {
          name: newName,
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to rename folder");
      toast({ title: "Folder renamed" });
      setIsRenameOpen(false);
      setRenameTargetId(null);
      // refresh current page & first page
      qc.invalidateQueries({
        queryKey: recentTopLevelFoldersQueryKey(currentPage),
      });
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err) });
    }
  }

  // delete flow
  function openDelete(folder: CloudFolder) {
    setDeleteTarget(folder);
    setIsDeleteOpen(true);
    contextMenu.hideAll();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      const res = await apiRequest(
        "DELETE",
        `/api/cloud-storage/folders/${id}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to delete folder");
      toast({ title: "Folder deleted" });
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      // if the deleted folder was selected, deselect it and notify parent
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        onSelect?.(null);
      }
      // refresh pages
      qc.invalidateQueries({
        queryKey: recentTopLevelFoldersQueryKey(currentPage),
      });
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err) });
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Folders</CardTitle>
        <CardDescription>
          Most recently updated top-level folders.
        </CardDescription>
      </CardHeader>

      <CardContent className="py-3">
        {isLoadingRecentFolders ? (
          <div className="py-6 text-center">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {data.map((f) => {
                const isSelected = selectedFolderId === Number(f.id);
                return (
                  <div key={f.id} className="flex">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTileClick(Number(f.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleTileClick(Number(f.id));
                      }}
                      onContextMenu={(e) => handleContextMenu(e, f)}
                      className={
                        "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer focus:outline-none " +
                        (isSelected ? "ring-2 ring-blue-400 bg-blue-50" : "")
                      }
                      style={{ minHeight: 44 }}
                    >
                      <Folder className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                      <div className="text-sm truncate">{f.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing {startItem}–{endItem} of {totalCount} results
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e: any) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              setCurrentPage(currentPage - 1);
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
                            if (currentPage < totalPages)
                              setCurrentPage(currentPage + 1);
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

      {/* react-contexify Menu (single shared menu) */}
      <Menu id="recent-folder-context-menu" animation="fade">
        <Item
          onClick={({ props }: any) => {
            const folder: CloudFolder | undefined = props?.folder;
            if (folder) openRename(folder);
          }}
        >
          <span className="flex items-center gap-2">
            <EditIcon className="h-4 w-4" /> Rename
          </span>
        </Item>

        <Item
          onClick={({ props }: any) => {
            const folder: CloudFolder | undefined = props?.folder;
            if (folder) openDelete(folder);
          }}
        >
          <span className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Delete
          </span>
        </Item>
      </Menu>

      {/* Rename modal (reuses NewFolderModal) */}
      <NewFolderModal
        isOpen={isRenameOpen}
        initialName={renameInitialName}
        title="Rename Folder"
        submitLabel="Rename"
        onClose={() => {
          setIsRenameOpen(false);
          setRenameTargetId(null);
        }}
        onSubmit={async (name) => {
          await handleRenameSubmit(name);
        }}
      />

      {/* Delete confirmation */}
      <DeleteConfirmationDialog
        isOpen={isDeleteOpen}
        entityName={deleteTarget?.name}
        onCancel={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
