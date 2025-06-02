// components/CredentialTable.tsx
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type Credential = {
  id: number;
  siteKey: string;
  username: string;
  password: string;
};

export function CredentialTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/credentials/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/insuranceCreds/");
      if (!res.ok) {
        throw new Error("Failed to fetch credentials");
      }
      return res.json() as Promise<Credential[]>;
    },
  });

  if (isLoading) return <p className="text-gray-600">Loading credentials...</p>;
  if (error) return <p className="text-red-600">Failed to load credentials.</p>;
  if (!data || data.length === 0)
    return <p className="text-gray-600">No credentials found.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Site</th>
            <th className="px-4 py-2 text-left">Username</th>
            <th className="px-4 py-2 text-left">Password</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((cred) => (
            <tr key={cred.id} className="border-t">
              <td className="px-4 py-2">{cred.siteKey}</td>
              <td className="px-4 py-2">{cred.username}</td>
              <td className="px-4 py-2 font-mono">{cred.password}</td>
              <td className="px-4 py-2 text-right space-x-2">
                <button className="text-blue-600 hover:underline">Edit</button>
                <button className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
