import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React from "react";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import { ClaimFileMeta, ClaimWithServiceLines } from "@repo/db/types";
import { FileText, Paperclip } from "lucide-react";

type ClaimViewModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  claim: ClaimWithServiceLines | null;
  onEditClaim: (claim: ClaimWithServiceLines) => void;
};

export default function ClaimViewModal({
  isOpen,
  onOpenChange,
  onClose,
  claim,
  onEditClaim,
}: ClaimViewModalProps) {
  // Normalizer: supports both ClaimFile[] and nested-create shape { create: ClaimFile[] }
  const getClaimFilesArray = (
    c: ClaimWithServiceLines | null
  ): ClaimFileMeta[] => {
    if (!c) return [];

    // If it's already a plain array (runtime from Prisma include), return it
    const maybeFiles = (c as any).claimFiles;
    if (!maybeFiles) return [];

    if (Array.isArray(maybeFiles)) {
      // ensure each item has filename field (best-effort)
      return maybeFiles.map((f: any) => ({
        id: f?.id,
        filename: String(f?.filename ?? ""),
        mimeType: f?.mimeType ?? f?.mime ?? null,
      }));
    }

    // Nested-create shape: { create: [...] }
    if (maybeFiles && Array.isArray(maybeFiles.create)) {
      return maybeFiles.create.map((f: any) => ({
        id: f?.id,
        filename: String(f?.filename ?? ""),
        mimeType: f?.mimeType ?? f?.mime ?? null,
      }));
    }

    // No recognized shape -> empty
    return [];
  };

  const claimFiles = getClaimFilesArray(claim);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claim Details</DialogTitle>
          <DialogDescription>
            Detailed view of the selected claim.
          </DialogDescription>
        </DialogHeader>

        {claim && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-medium">
                {claim.patientName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{claim.patientName}</h3>
                <p className="text-gray-500">
                  Claim ID: {claim.id?.toString().padStart(4, "0")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div className="mt-2 space-y-2">
                  <p>
                    <span className="text-gray-500">Date of Birth:</span>{" "}
                    {formatDateToHumanReadable(claim.dateOfBirth)}
                  </p>
                  <p>
                    <span className="text-gray-500">Service Date:</span>{" "}
                    {formatDateToHumanReadable(claim.serviceDate)}
                  </p>
                  <p>
                    <span className="text-gray-500">Status:</span>{" "}
                    <span
                      className={`font-medium ${
                        claim.status === "APPROVED"
                          ? "text-green-600"
                          : claim.status === "CANCELLED"
                            ? "text-red-600"
                            : claim.status === "REVIEW"
                              ? "text-yellow-600"
                              : "text-gray-600"
                      }`}
                    >
                      {claim?.status
                        ? claim.status.charAt(0).toUpperCase() +
                          claim.status.slice(1).toLowerCase()
                        : "Unknown"}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Insurance Details</h4>
                <div className="mt-2 space-y-2">
                  <p>
                    <span className="text-gray-500">Insurance Provider:</span>{" "}
                    {claim.insuranceProvider || "N/A"}
                  </p>
                  <p>
                    <span className="text-gray-500">Member ID:</span>{" "}
                    {claim.memberId}
                  </p>
                  <p>
                    <span className="text-gray-500">Remarks:</span>{" "}
                    {claim.remarks || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Timestamps</h4>
              <p>
                <span className="text-gray-500">Created At:</span>{" "}
                {formatDateToHumanReadable(claim.createdAt)}
              </p>
              <p>
                <span className="text-gray-500">Updated At:</span>{" "}
                {formatDateToHumanReadable(claim.updatedAt)}
              </p>
            </div>

            {claim.staff && (
              <div className="space-y-2 pt-4">
                <h4 className="font-medium text-gray-900">Assigned Staff</h4>
                <p>
                  <span className="text-gray-500">Name:</span>{" "}
                  {claim.staff.name}
                </p>
                <p>
                  <span className="text-gray-500">Role:</span>{" "}
                  {claim.staff.role}
                </p>
                {claim.staff.email && (
                  <p>
                    <span className="text-gray-500">Email:</span>{" "}
                    {claim.staff.email}
                  </p>
                )}
                {claim.staff.phone && (
                  <p>
                    <span className="text-gray-500">Phone:</span>{" "}
                    {claim.staff.phone}
                  </p>
                )}
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 pt-4">Service Lines</h4>
              <div className="mt-2 space-y-3">
                {claim.serviceLines.length > 0 ? (
                  <>
                    {claim.serviceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="border p-3 rounded-md bg-gray-50"
                      >
                        <p>
                          <span className="text-gray-500">Procedure Code:</span>{" "}
                          {line.procedureCode}
                        </p>
                        <p>
                          <span className="text-gray-500">Procedure Date:</span>{" "}
                          {formatDateToHumanReadable(line.procedureCode)}
                        </p>
                        {line.oralCavityArea && (
                          <p>
                            <span className="text-gray-500">
                              Oral Cavity Area:
                            </span>{" "}
                            {line.oralCavityArea}
                          </p>
                        )}
                        {line.toothNumber && (
                          <p>
                            <span className="text-gray-500">Tooth Number:</span>{" "}
                            {line.toothNumber}
                          </p>
                        )}
                        {line.toothSurface && (
                          <p>
                            <span className="text-gray-500">
                              Tooth Surface:
                            </span>{" "}
                            {line.toothSurface}
                          </p>
                        )}
                        <p>
                          <span className="text-gray-500">Billed Amount:</span>{" "}
                          ${Number(line.totalBilled).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    <div className="text-right font-semibold text-gray-900 pt-2 border-t mt-4">
                      Total Billed Amount: $
                      {claim.serviceLines
                        .reduce(
                          (total, line) =>
                            total + Number(line.totalBilled || 0),
                          0
                        )
                        .toFixed(2)}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No service lines available.</p>
                )}
              </div>
            </div>

            {/* Claim Files (metadata) */}
            <div className="pt-4">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Paperclip className="w-4 h-4 inline-block" />
                <span>Attached Files</span>
              </h4>

              {claimFiles.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {claimFiles.map((f) => (
                    <li
                      key={f.id ?? f.filename}
                      className="flex items-center justify-between border rounded-md p-3 bg-white"
                    >
                      <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-gray-500 mt-1" />
                        <div>
                          <div className="font-medium">{f.filename}</div>
                          <div className="text-xs text-gray-500">
                            {f.mimeType || "unknown"}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-gray-500">No files attached.</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onEditClaim(claim);
                }}
              >
                Edit Claim
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
