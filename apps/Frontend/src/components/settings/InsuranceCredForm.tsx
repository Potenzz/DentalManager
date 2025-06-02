import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type CredentialFormProps = {
  onClose: () => void;
  userId: number;
};

export function CredentialForm({ onClose, userId }: CredentialFormProps) {
  const [siteKey, setSiteKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const createCredentialMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        siteKey: siteKey.trim(),
        username: username.trim(),
        password: password.trim(),
        userId,
      };

      const res = await apiRequest("POST", "/api/insuranceCreds/", payload);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to create credential");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Credential created." });
      queryClient.invalidateQueries({ queryKey: ["/api/insuranceCreds/"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteKey || !username || !password) {
      toast({
        title: "Error",
        description: "All fields are required.",
        variant: "destructive",
      });
      return;
    }
    createCredentialMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-bold mb-4">Create Credential</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Site Key</label>
            <input
              type="text"
              value={siteKey}
              onChange={(e) => setSiteKey(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
              placeholder="e.g., github, slack"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCredentialMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {createCredentialMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
