// Updated components to support: 1) navigating into child folders (FolderSection -> FolderPanel)
// 2) a breadcrumb / path strip in FolderPanel so user can see & click parent folders

import React, { useEffect, useRef, useState } from "react";
import FolderSection from "@/components/cloud-storage/folder-section";
import FilesSection from "@/components/cloud-storage/files-section";
import { apiRequest } from "@/lib/queryClient";
import { Breadcrumbs, FolderMeta } from "./bread-crumb";

type Props = {
  folderId: number | null;
  onClose?: () => void;
  onViewChange?: (id: number | null) => void;
};

export default function FolderPanel({
  folderId,
  onClose,
  onViewChange,
}: Props) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(
    folderId ?? null
  );
  const [path, setPath] = useState<FolderMeta[]>([]);
  const [isLoadingPath, setIsLoadingPath] = useState(false);

  // When the panel opens to a different initial folder, sync and notify parent
  useEffect(() => {
    setCurrentFolderId(folderId ?? null);
    onViewChange?.(folderId ?? null);
  }, [folderId, onViewChange]);

  // notify parent when viewed folder changes
  useEffect(() => {
    onViewChange?.(currentFolderId);
  }, [currentFolderId, onViewChange]);

  // whenever currentFolderId changes we load the ancestor path
  useEffect(() => {
    let mounted = true;
    async function buildPath(fid: number | null) {
      setIsLoadingPath(true);
      try {
        // We'll build path from root -> ... -> current. Since we don't know
        // if backend provides a single endpoint for ancestry, we'll fetch
        // current folder and walk parents until null. If fid is null then path is empty.
        if (fid == null) {
          if (mounted) setPath([]);
          return;
        }

        const collected: FolderMeta[] = [];
        let cursor: number | null = fid;

        // keep a safety cap to avoid infinite loop in case of cycles
        const MAX_DEPTH = 50;
        let depth = 0;

        while (cursor != null && depth < MAX_DEPTH) {
          const res = await apiRequest(
            "GET",
            `/api/cloud-storage/folders/${cursor}`
          );
          const json = await res.json();
          if (!res.ok)
            throw new Error(json?.message || "Failed to fetch folder");

          const folder = json?.data ?? json ?? null;
          // normalize
          const meta: FolderMeta = {
            id: folder?.id ?? null,
            name: folder?.name ?? null,
            parentId: folder?.parentId ?? null,
          };

          // prepend (we are walking up) then continue with parent
          collected.push(meta);
          cursor = meta.parentId;
          depth += 1;
        }

        // collected currently top-down from current -> root. We need root->...->current
        const rootToCurrent = collected.slice().reverse();
        // we don't include the root (null) as an explicit item; Breadcrumbs shows "My Cloud Storage"
        if (mounted) setPath(rootToCurrent);
      } catch (err) {
        console.error("buildPath error", err);
        if (mounted) setPath([]);
      } finally {
        if (mounted) setIsLoadingPath(false);
      }
    }

    buildPath(currentFolderId);
    return () => {
      mounted = false;
    };
  }, [currentFolderId]);

  // handler when child folder is clicked inside FolderSection
  function handleChildSelect(childFolderId: number | null) {
    // if user re-clicks current folder id as toggle, we still want to navigate into it.
    setCurrentFolderId(childFolderId);
    onViewChange?.(childFolderId); // keep page in sync
  }

  // navigate via breadcrumb (id may be null for root)
  function handleNavigateTo(id: number | null) {
    setCurrentFolderId(id);
    onViewChange?.(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {currentFolderId == null
            ? "My Cloud Storage"
            : `Folder ${currentFolderId}`}
        </h2>

        <div>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm hover:bg-gray-100"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb / path strip */}
      <div>
        {/* show breadcrumbs even if loading; breadcrumbs show 'My Cloud Storage' + path */}
        <Breadcrumbs path={path} onNavigate={handleNavigateTo} />
      </div>

      {/* stacked vertically: folders on top, files below */}
      <div className="flex flex-col gap-6">
        <div className="w-full">
          {/* pass onSelect so FolderSection can tell the panel to navigate into a child */}
          <FolderSection
            parentId={currentFolderId}
            onSelect={handleChildSelect}
          />
        </div>

        <div className="w-full">
          <FilesSection parentId={currentFolderId} />
        </div>
      </div>
    </div>
  );
}
