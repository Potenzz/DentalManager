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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface ClaimsOfPatientModalProps {
  onNewClaim?: (patientId: number) => void;
}

export default function ClaimsOfPatientModal({ onNewClaim }: ClaimsOfPatientModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimsPage, setClaimsPage] = useState(1);

  const handleSelectPatient = (patient: Patient | null) => {
    if (patient) {
      setSelectedPatient(patient);
      setClaimsPage(1);
      setIsModalOpen(true);
    } else {
      setSelectedPatient(null);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 py-8">
      {/* Claims Section */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle>
              Claims for {selectedPatient.firstName} {selectedPatient.lastName}
            </CardTitle>
            <CardDescription>
              Displaying recent claims for the selected patient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimsRecentTable
              patientId={selectedPatient.id}
              allowView
              allowEdit
              allowDelete
              onPageChange={setClaimsPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Patients Section */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            Select any patient and View all their recent claims.
          </CardDescription>
          <CardDescription>
            Also create new claim for any patients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientTable
            allowView
            allowCheckbox
            allowNewClaim
            onNewClaim={onNewClaim}
            onSelectPatient={handleSelectPatient}
          />
        </CardContent>
      </Card>
    </div>
  );
}
