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
import { BackupDestinationManager } from "@/components/database-management/backup-destination-manager";

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

  // Helper: parse Content-Disposition filename if present
  function filenameFromDisposition(res: Response): string | null {
    const disposition = res.headers.get("Content-Disposition") || "";
    const starMatch = disposition.match(/filename\*\s*=\s*([^;]+)/i);
    if (starMatch && starMatch[1]) {
      let val = starMatch[1]
        .trim()
        .replace(/^UTF-8''/i, "")
        .replace(/['"]/g, "");
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
    const fileNameRegex = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i;
    const normalMatch = disposition.match(fileNameRegex);
    if (normalMatch) {
      const candidate = (normalMatch[1] ?? normalMatch[2] ?? "").trim();
      if (candidate) return candidate.replace(/['"]/g, "");
    }
    return null;
  }

  // Detect file type by reading first bytes (magic numbers)
  // Returns 'zip' | 'gzip' | 'unknown'
  async function detectBlobType(b: Blob): Promise<"zip" | "gzip" | "unknown"> {
    try {
      const header = await b.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(header);
      // ZIP: 50 4B 03 04
      if (
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
      ) {
        return "zip";
      }
      // GZIP: 1F 8B
      if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        return "gzip";
      }
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  }

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

      // 1) prefer Content-Disposition filename if available
      let fileName = filenameFromDisposition(res);

      // 2) try to guess from Content-Type if disposition not given
      if (!fileName) {
        const ct = (res.headers.get("Content-Type") || "").toLowerCase();
        const iso = new Date().toISOString().replace(/[:.]/g, "-");
        if (ct.includes("zip")) fileName = `dental_backup_${iso}.zip`;
        else if (
          ct.includes("gzip") ||
          ct.includes("x-gzip") ||
          ct.includes("tar")
        )
          fileName = `dental_backup_${iso}.tar.gz`;
        else fileName = `dental_backup_${iso}.dump`;
      }

      // 3) sanity-check blob contents and correct extension if needed
      const detected = await detectBlobType(blob);
      if (detected === "zip" && !fileName.toLowerCase().endsWith(".zip")) {
        // replace extension with .zip
        fileName = fileName.replace(/(\.tar\.gz|\.tgz|\.gz|\.dump)?$/i, ".zip");
      } else if (
        detected === "gzip" &&
        !/(\.tar\.gz|\.tgz|\.gz)$/i.test(fileName)
      ) {
        // prefer .tar.gz for gzipped tar
        fileName = fileName.replace(/(\.zip|\.dump)?$/i, ".tar.gz");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
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

        {/* Externa Drive automatic backup manager */}
        <BackupDestinationManager />

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
