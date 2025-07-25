import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClaimsRecentTable from "./claims-recent-table";
import { PatientTable } from "../patients/patient-table";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

export default function ClaimsOfPatientModal() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimsPage, setClaimsPage] = useState(1);

  const handleSelectPatient = (patient: Patient | null) => {
    if (patient) {
      setSelectedPatient(patient);
      setClaimsPage(1);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-8 py-8">
      {/* Claims Section */}
      {selectedPatient && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>
              Claims for {selectedPatient.firstName} {selectedPatient.lastName}
            </CardTitle>
            <CardDescription>
              Displaying recent claims for the selected patient.
            </CardDescription>
          </CardHeader>
          <div className="p-4">
            <ClaimsRecentTable
              patientId={selectedPatient.id}
              allowView
              allowEdit
              allowDelete
              onPageChange={setClaimsPage}
            />
          </div>
        </Card>
      )}

      {/* Patients Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Patients</CardTitle>
          <CardDescription>
            Select a patient to view their recent claims.
          </CardDescription>
        </CardHeader>
        <div className="p-4">
          <PatientTable
            allowView
            allowCheckbox
            onSelectPatient={handleSelectPatient}
          />
        </div>
      </Card>
    </div>
  );
}
