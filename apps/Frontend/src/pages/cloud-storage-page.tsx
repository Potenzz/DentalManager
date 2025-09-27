import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Folder as FolderIcon, Search as SearchIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NewFolderModal } from "@/components/cloud-storage/new-folder-modal";
import FolderPanel from "@/components/cloud-storage/folder-panel";
import { useAuth } from "@/hooks/use-auth";
import RecentTopLevelFoldersCard, {
  recentTopLevelFoldersQueryKey,
} from "@/components/cloud-storage/recent-top-level-folder-modal";

export default function CloudStoragePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  // panel open + initial folder id to show when opening
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelInitialFolderId, setPanelInitialFolderId] = useState<
    number | null
  >(null);

  // key to remount recent card to clear its internal selection when needed
  const [recentKey, setRecentKey] = useState(0);

  // New folder modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

  // create folder handler (page-level)
  async function handleCreateFolder(name: string) {
    try {
      const userId = user?.id;
      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to create a folder.",
        });
        return;
      }

      const res = await apiRequest("POST", `/api/cloud-storage/folders`, {
        userId,
        name,
        parentId: null,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create folder");

      toast({ title: "Folder created" });

      // close modal
      setIsNewFolderOpen(false);

      // Invalidate recent folders page 1 so RecentFoldersCard will refresh.
      qc.invalidateQueries({ queryKey: recentTopLevelFoldersQueryKey(1) });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err) });
    }
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header / actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
          <p className="text-muted-foreground">
            Manage Files and Folders in Cloud Storage.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            onClick={() => {
              /* search flow omitted - wire your search UI here */
            }}
          >
            <SearchIcon className="h-4 w-4 mr-2" /> Search
          </Button>

          <Button onClick={() => setIsNewFolderOpen(true)}>
            <FolderIcon className="h-4 w-4 mr-2" /> New Folder
          </Button>
        </div>
      </div>

      {/* Recent folders card (delegated component) */}
      <RecentTopLevelFoldersCard
        key={recentKey}
        pageSize={10}
        initialPage={1}
        onSelect={(folderId) => {
          setPanelInitialFolderId(folderId);
          setPanelOpen(true);
        }}
      />

      {/* FolderPanel lives in page so it can be reused with other UI */}
      {panelOpen && (
        <FolderPanel
          folderId={panelInitialFolderId}
          onClose={() => setPanelOpen(false)}
          onViewChange={(viewedId: any) => {
            // If the panel navigates back to root, clear recent card selection by remounting it
            if (viewedId === null) {
              setRecentKey((k) => k + 1);

              // clear the panel initial id and close the panel so child folder/file sections hide
              setPanelInitialFolderId(null);
              setPanelOpen(false);
            }
          }}
        />
      )}

      {/* New folder modal (reusable) */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSubmit={handleCreateFolder}
      />
    </div>
  );
}
