import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

// Types for your data
interface ServiceLine {
  billedAmount: number;
}

interface Claim {
  id: number;
  patientName: string;
  serviceDate: string;
  insuranceProvider: string;
  status: string;
  createdAt: string;
  serviceLines: ServiceLine[];
}

interface ClaimResponse {
  data: Claim[];
  total: number;
  page: number;
  limit: number;
}

export default function RecentClaims() {
  const [offset, setOffset] = useState(0);
  const limit = 5;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["/api/claims", offset, limit],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/claims?offset=${offset}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json() as Promise<ClaimResponse>;
    },
  });

  const claims = data?.data ?? [];
  const total = data?.total ?? 0;

  const canGoBack = offset > 0;
  const canGoNext = offset + limit < total;

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading claims...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">Failed to load recent claims.</p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-gray-800">Recent Claims</h2>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Submitted Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium">No claims found</h3>
              <p className="text-gray-500 mt-1">
                Any recent insurance claims will show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {claims.map((claim: Claim) => {
                const totalBilled = claim.serviceLines.reduce(
                  (sum: number, line: ServiceLine) => sum + line.billedAmount,
                  0
                );

                return (
                  <div
                    key={`claim-${claim.id}`}
                    className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      toast({
                        title: "Claim Details",
                        description: `Viewing details for claim #${claim.id}`,
                      })
                    }
                  >
                    <div>
                      <h3 className="font-medium">{claim.patientName}</h3>
                      <div className="text-sm text-gray-500">
                        <span>Claim #: {claim.id}</span>
                        <span className="mx-2">•</span>
                        <span>
                          Submitted:{" "}
                          {format(new Date(claim.createdAt), "MMM dd, yyyy")}
                        </span>
                        <span className="mx-2">•</span>
                        <span>Provider: {claim.insuranceProvider}</span>
                        <span className="mx-2">•</span>
                        <span>Amount: ${totalBilled.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          claim.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : claim.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {claim.status === "pending" ? (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        ) : claim.status === "approved" ? (
                          <span className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {claim.status}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {total > limit && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of{" "}
                {total} claims
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoBack || isFetching}
                  onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext || isFetching}
                  onClick={() => setOffset((prev) => prev + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
