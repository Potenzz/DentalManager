import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Search as SearchIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CloudFolder } from "@repo/db/types";
import FolderPanel from "@/components/cloud-storage/folder-panel";

// -----------------------------
// Reusable NewFolderModal
// -----------------------------
export type NewFolderModalProps = {
  isOpen: boolean;
  initialName?: string;
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

export function NewFolderModal({
  isOpen,
  initialName = "",
  title = "New Folder",
  submitLabel = "Create",
  onClose,
  onSubmit,
}: NewFolderModalProps) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            try {
              setIsSubmitting(true);
              await onSubmit(name.trim());
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="p-4 space-y-3">
            <label className="block text-sm font-medium">Folder name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Enter folder name"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button
              variant="ghost"
              type="button"
              onClick={() => !isSubmitting && onClose()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
