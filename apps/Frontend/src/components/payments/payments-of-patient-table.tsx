import { useState } from "react";
import { PatientTable } from "../patients/patient-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Patient } from "@repo/db/types";
import PaymentsRecentTable from "./payments-recent-table";

export default function PaymentsOfPatientModal() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const handleSelectPatient = (patient: Patient | null) => {
    if (patient) {
      setSelectedPatient(patient);
      setPaymentsPage(1);
      setIsModalOpen(true);
    } else {
      setSelectedPatient(null);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 py-8">
      {/* Payments Section */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle>
              Payments for {selectedPatient.firstName}{" "}
              {selectedPatient.lastName}
            </CardTitle>
            <CardDescription>
              Displaying recent payments for the selected patient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsRecentTable
              patientId={selectedPatient.id}
              allowEdit
              allowDelete
              onPageChange={setPaymentsPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Patients Section */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            Select any patient and View all their recent payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientTable
            allowView
            allowCheckbox
            onSelectPatient={handleSelectPatient}
          />
        </CardContent>
      </Card>
    </div>
  );
}
