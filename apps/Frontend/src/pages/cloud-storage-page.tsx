import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
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
  Upload,
  Download,
  Folder,
  Trash2,
  FolderPlus,
  Edit2,
  MoreVertical,
  FileText,
  Image,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  Eye,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CloudFolder, CloudFile } from "@shared/schema";

interface CloudStorageItem {
  folders: CloudFolder[];
  files: CloudFile[];
}

export default function CloudStoragePage() {
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<
    { id: number | null; name: string }[]
  >([{ id: null, name: "My Cloud Storage" }]);

  // Dialog states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form states
  const [newFolderName, setNewFolderName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [selectedItem, setSelectedItem] = useState<{
    type: "folder" | "file";
    item: CloudFolder | CloudFile;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingFile, setViewingFile] = useState<CloudFile | null>(null);
  const [fileViewUrl, setFileViewUrl] = useState<string>("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Fetch folders and files
  const {
    data: storageItems,
    isLoading,
    refetch,
  } = useQuery<CloudStorageItem>({
    queryKey: ["/api/cloud-storage/items", currentFolderId],
    queryFn: async () => {
      const params = currentFolderId
        ? `?parentId=${currentFolderId}`
        : "?parentId=";
      const res = await fetch(`/api/cloud-storage/items${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/cloud-storage/folders", {
        name,
        parentId: currentFolderId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      toast({
        title: "Folder created",
        description: "Your folder has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/cloud-storage/folders/${id}`,
        { name }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsRenameOpen(false);
      setNewItemName("");
      setSelectedItem(null);
      toast({
        title: "Folder renamed",
        description: "Your folder has been renamed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to rename folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Rename file mutation
  const renameFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/cloud-storage/files/${id}`, {
        name,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsRenameOpen(false);
      setNewItemName("");
      setSelectedItem(null);
      toast({
        title: "File renamed",
        description: "Your file has been renamed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to rename file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/cloud-storage/folders/${id}`
      );
      if (!res.ok) throw new Error("Failed to delete folder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      toast({
        title: "Folder deleted",
        description: "Your folder has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/cloud-storage/files/${id}`);
      if (!res.ok) throw new Error("Failed to delete file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      toast({
        title: "File deleted",
        description: "Your file has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      // Get upload URL
      const uploadUrlRes = await apiRequest(
        "POST",
        "/api/cloud-storage/upload-url",
        {
          fileName: file.name,
        }
      );
      const { uploadURL, storagePath } = await uploadUrlRes.json();

      // Upload file to object storage
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Save file metadata with the storage path
      const res = await apiRequest("POST", "/api/cloud-storage/files", {
        name: file.name,
        folderId: currentFolderId,
        fileUrl: storagePath,
        fileSize: file.size,
        mimeType: file.type,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-storage/items"] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFolderClick = (folder: CloudFolder) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1]!.id);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };

  const handleRename = () => {
    if (selectedItem && newItemName.trim()) {
      if (selectedItem.type === "folder") {
        renameFolderMutation.mutate({
          id: (selectedItem.item as CloudFolder).id,
          name: newItemName.trim(),
        });
      } else {
        renameFileMutation.mutate({
          id: (selectedItem.item as CloudFile).id,
          name: newItemName.trim(),
        });
      }
    }
  };

  const handleDelete = () => {
    if (selectedItem) {
      if (selectedItem.type === "folder") {
        deleteFolderMutation.mutate((selectedItem.item as CloudFolder).id);
      } else {
        deleteFileMutation.mutate((selectedItem.item as CloudFile).id);
      }
    }
  };

  const handleFileUpload = () => {
    if (selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    }
  };

  const handleViewFile = async (file: CloudFile) => {
    try {
      const res = await fetch(`/api/cloud-storage/files/${file.id}/url`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to get file URL");
      const { url, mimeType } = await res.json();

      setViewingFile(file);
      setFileViewUrl(url);
      setIsViewerOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-12 w-12 text-gray-400" />;

    if (mimeType.startsWith("image/"))
      return <Image className="h-12 w-12 text-blue-400" />;
    if (mimeType.startsWith("video/"))
      return <FileVideo className="h-12 w-12 text-purple-400" />;
    if (mimeType.startsWith("audio/"))
      return <FileAudio className="h-12 w-12 text-green-400" />;
    if (mimeType.includes("zip") || mimeType.includes("tar"))
      return <FileArchive className="h-12 w-12 text-yellow-400" />;
    if (
      mimeType.includes("javascript") ||
      mimeType.includes("typescript") ||
      mimeType.includes("json")
    )
      return <FileCode className="h-12 w-12 text-orange-400" />;

    return <FileText className="h-12 w-12 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div>
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
            <p className="text-muted-foreground">
              View and manage files and folder at cloud storage.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <Card>
        <CardContent className="py-3">
          <Breadcrumb>
            <BreadcrumbList>
              {folderPath.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === folderPath.length - 1 ? (
                      <BreadcrumbPage>{item.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleBreadcrumbClick(index)}
                      >
                        {item.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      {/* Storage Content */}
      <Card>
        <CardHeader>
          <CardTitle>Files and Folders</CardTitle>
          <CardDescription>
            Manage your files and folders in the cloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Folders */}
              {storageItems?.folders.map((folder) => (
                <div
                  key={folder.id}
                  className="relative group cursor-pointer"
                  onDoubleClick={() => handleFolderClick(folder)}
                >
                  <div className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <Folder className="h-12 w-12 text-yellow-500 mb-2" />
                    <span className="text-sm text-center truncate w-full">
                      {folder.name}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem({ type: "folder", item: folder });
                          setNewItemName(folder.name);
                          setIsRenameOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem({ type: "folder", item: folder });
                          setIsDeleteOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Files */}
              {storageItems?.files.map((file) => (
                <div key={file.id} className="relative group cursor-pointer">
                  <div className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    {getFileIcon(file.mimeType || undefined)}
                    <span className="text-sm text-center truncate w-full mt-2">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewFile(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/cloud-storage/files/${file.id}/url`,
                              {
                                credentials: "include",
                              }
                            );
                            if (!res.ok)
                              throw new Error("Failed to get file URL");
                            const { url } = await res.json();
                            window.open(url, "_blank");
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to download file.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem({ type: "file", item: file });
                          setNewItemName(file.name);
                          setIsRenameOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem({ type: "file", item: file });
                          setIsDeleteOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Empty state */}
              {!storageItems?.folders.length && !storageItems?.files.length && (
                <div className="col-span-full text-center py-12">
                  <Folder className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">This folder is empty</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Create a new folder or upload files to get started
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Rename {selectedItem?.type === "folder" ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription>
              Enter a new name for this {selectedItem?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-name">New Name</Label>
              <Input
                id="new-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="New name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newItemName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedItem?.type === "folder" ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.item.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Select a file to upload to your cloud storage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            {selectedFile && (
              <div className="text-sm text-gray-600">
                <p>File: {selectedFile.name}</p>
                <p>Size: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={!selectedFile}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{viewingFile?.name}</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsViewerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {viewingFile && fileViewUrl && (
                <>
                  {/* PDF Viewer */}
                  {viewingFile.mimeType === "application/pdf" && (
                    <div className="w-full h-full min-h-[70vh]">
                      <iframe
                        src={`${fileViewUrl}#view=fit`}
                        className="w-full h-full border rounded"
                        title={viewingFile.name}
                        style={{ minHeight: "70vh" }}
                      />
                    </div>
                  )}

                  {/* Image Viewer */}
                  {viewingFile.mimeType?.startsWith("image/") && (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={fileViewUrl}
                        alt={viewingFile.name}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Text/Code Viewer */}
                  {(viewingFile.mimeType?.startsWith("text/") ||
                    viewingFile.mimeType === "application/json" ||
                    viewingFile.mimeType === "application/javascript") && (
                    <iframe
                      src={fileViewUrl}
                      className="w-full h-full min-h-[70vh] border rounded bg-white"
                      title={viewingFile.name}
                    />
                  )}

                  {/* Unsupported file type */}
                  {!viewingFile.mimeType?.startsWith("image/") &&
                    viewingFile.mimeType !== "application/pdf" &&
                    !viewingFile.mimeType?.startsWith("text/") &&
                    viewingFile.mimeType !== "application/json" &&
                    viewingFile.mimeType !== "application/javascript" && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileText className="h-16 w-16 mb-4" />
                        <p className="text-lg font-medium">
                          Preview not available
                        </p>
                        <p className="text-sm mt-2">
                          This file type cannot be previewed
                        </p>
                        <Button
                          className="mt-4"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/cloud-storage/files/${viewingFile.id}/url`,
                                {
                                  credentials: "include",
                                }
                              );
                              if (!res.ok)
                                throw new Error("Failed to get file URL");
                              const { url } = await res.json();
                              window.open(url, "_blank");
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to download file.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download File
                        </Button>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
