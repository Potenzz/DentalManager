import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderOpen, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function BackupDestinationManager() {
  const { toast } = useToast();
  const [path, setPath] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ==============================
  // Queries
  // ==============================
  const { data: destinations = [] } = useQuery({
    queryKey: ["/db/destination"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        "/api/database-management/destination"
      );
      return res.json();
    },
  });

  // ==============================
  // Mutations
  // ==============================
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/database-management/destination",
        { path }
      );
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast({ title: "Backup destination saved" });
      setPath("");
      queryClient.invalidateQueries({ queryKey: ["/db/destination"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/database-management/destination/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Backup destination deleted" });
      queryClient.invalidateQueries({ queryKey: ["/db/destination"] });
      setDeleteId(null);
    },
  });

  // ==============================
  // Folder picker (browser limitation)
  // ==============================
  const openFolderPicker = async () => {
    // @ts-ignore
    if (!window.showDirectoryPicker) {
      toast({
        title: "Not supported",
        description: "Your browser does not support folder picking",
        variant: "destructive",
      });
      return;
    }

    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();

      toast({
        title: "Folder selected",
        description: `Selected folder: ${dirHandle.name}. Please enter the full path manually.`,
      });
    } catch {
      // user cancelled
    }
  };

  // ==============================
  // UI
  // ==============================
  return (
    <Card>
      <CardHeader>
        <CardTitle>External Backup Destination</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="/media/usb-drive or D:\\Backups"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <Button variant="outline" onClick={openFolderPicker}>
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!path || saveMutation.isPending}
        >
          Save Destination
        </Button>

        <div className="space-y-2">
          {destinations.map((d: any) => (
            <div
              key={d.id}
              className="flex justify-between items-center border rounded p-2"
            >
              <span className="text-sm text-gray-700">{d.path}</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteId(d.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Confirm delete dialog */}
        <AlertDialog open={deleteId !== null}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete backup destination?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the destination and stop automatic backups.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
