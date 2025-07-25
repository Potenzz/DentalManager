import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ClaimUncheckedCreateInputObjectSchema,
  StaffUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import React from "react";
import { z } from "zod";
import { formatDateToHumanReadable } from "@/utils/dateUtils";

//creating types out of schema auto generated.
type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;
type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

type ClaimWithServiceLines = Claim & {
  serviceLines: {
    id: number;
    claimId: number;
    procedureCode: string;
    procedureDate: Date;
    oralCavityArea: string | null;
    toothNumber: string | null;
    toothSurface: string | null;
    billedAmount: number;
  }[];
  staff: Staff | null;
};

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
                    {new Date(claim.dateOfBirth).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="text-gray-500">Service Date:</span>{" "}
                    {new Date(claim.serviceDate).toLocaleDateString()}
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
                          {new Date(line.procedureDate).toLocaleDateString()}
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
                          ${line.billedAmount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                    <div className="text-right font-semibold text-gray-900 pt-2 border-t mt-4">
                      Total Billed Amount: $
                      {claim.serviceLines
                        .reduce((total, line) => total + line.billedAmount, 0)
                        .toFixed(2)}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No service lines available.</p>
                )}
              </div>
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
