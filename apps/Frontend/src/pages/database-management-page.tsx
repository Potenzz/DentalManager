import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  FileArchive,
  HardDrive,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDateToHumanReadable } from "@/utils/dateUtils";

export default function DatabaseManagementPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // ----- Database status query -----
  const { data: dbStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/db/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/database-management/status");
      return res.json();
    },
  });

  // ----- Backup mutation -----
  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/database-management/backup");

      if (!res.ok) {
        // Try to parse JSON error
        let errorBody = {};
        try {
          errorBody = await res.json();
        } catch {}
        throw new Error((errorBody as any)?.error || "Backup failed");
      }

      // Convert response to blob (file)
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const fileName =
        disposition?.split("filename=")[1]?.replace(/"/g, "") ||
        `dental_backup_${new Date().toISOString()}.dump`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Backup Complete",
        description: "Database backup downloaded successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/db/status"] });
    },
    onError: (error: any) => {
      console.error("Backup failed:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <div className="container mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Database className="h-8 w-8 text-blue-600" />
            <span>Database Management</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your dental practice database with backup, export
            capabilities
          </p>
        </div>

        {/* Database Backup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>Database Backup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Create a complete backup of your dental practice database
              including patients, appointments, claims, and all related data.
            </p>

            <div className="flex items-center space-x-4">
              <Button
                onClick={() => backupMutation.mutate()}
                disabled={backupMutation.isPending}
                className="flex items-center space-x-2"
              >
                {backupMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileArchive className="h-4 w-4" />
                )}
                <span>
                  {backupMutation.isPending
                    ? "Creating Backup..."
                    : "Create Backup"}
                </span>
              </Button>

              <div className="text-sm text-gray-500">
                Last backup:{" "}
                {dbStatus?.lastBackup
                  ? formatDateToHumanReadable(dbStatus.lastBackup)
                  : "Never"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Status Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <p className="text-gray-500">Loading status...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800">Status</span>
                  </div>
                  <p className="text-green-600 mt-1">
                    {dbStatus?.connected ? "Connected" : "Disconnected"}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-800">Size</span>
                  </div>
                  <p className="text-blue-600 mt-1">
                    {dbStatus?.size ?? "Unknown"}
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Cloud className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-purple-800">Records</span>
                  </div>
                  <p className="text-purple-600 mt-1">
                    {dbStatus?.patients
                      ? `${dbStatus.patients} patients`
                      : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
