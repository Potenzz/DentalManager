import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateToHumanReadable } from "@/utils/dateUtils";
import React, { useState } from "react";
import { ClaimStatus, ClaimWithServiceLines } from "@repo/db/types";

type ClaimEditModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  claim: ClaimWithServiceLines | null;
  onSave: (updatedClaim: ClaimWithServiceLines) => void;
};

export default function ClaimEditModal({
  isOpen,
  onOpenChange,
  onClose,
  claim,
  onSave,
}: ClaimEditModalProps) {
  const [status, setStatus] = useState<ClaimStatus>(
    claim?.status ?? ("PENDING" as ClaimStatus)
  );

  if (!claim) return null;

  const handleSave = () => {
    const updatedClaim: ClaimWithServiceLines = {
      ...claim,
      status,
    };

    onSave(updatedClaim);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Claim Status</DialogTitle>
          <DialogDescription>Update the status of the claim.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Details */}
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

          {/* Basic Info */}
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
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ClaimStatus)}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

          {/* Timestamps */}
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

          {/* Staff Info */}
          {claim.staff && (
            <div className="space-y-2 pt-4">
              <h4 className="font-medium text-gray-900">Assigned Staff</h4>
              <p>
                <span className="text-gray-500">Name:</span> {claim.staff.name}
              </p>
              <p>
                <span className="text-gray-500">Role:</span> {claim.staff.role}
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

          {/* Service Lines */}
          <div>
            <h4 className="font-medium text-gray-900 pt-4">Service Lines</h4>
            <div className="mt-2 space-y-3">
              {claim.serviceLines.length > 0 ? (
                <>
                  {claim.serviceLines.map((line) => (
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
                        {formatDateToHumanReadable(line.procedureDate)}
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
                          <span className="text-gray-500">Tooth Surface:</span>{" "}
                          {line.toothSurface}
                        </p>
                      )}
                      <p>
                        <span className="text-gray-500">Billed Amount:</span> $
                        {Number(line.totalBilled).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="text-right font-semibold text-gray-900 pt-2 border-t mt-4">
                    Total Billed Amount: $
                    {claim.serviceLines
                      .reduce((total, line) => {
                        const billed = line.totalBilled
                          ? parseFloat(line.totalBilled as any)
                          : 0;
                        return total + billed;
                      }, 0)
                      .toFixed(2)}
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No service lines available.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
