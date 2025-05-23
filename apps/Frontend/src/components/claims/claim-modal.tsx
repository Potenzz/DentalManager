import { useState, useEffect } from "react";
import { ClaimForm } from "./claim-form";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

const PatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface ClaimModalProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  appointmentId: number;
}

export function ClaimModal({ 
  open,
  onClose,
  patientId,
  appointmentId
}: ClaimModalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch patient data
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const data = await response.json();
        setPatient(data);
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open && patientId) {
      fetchPatient();
    }
  }, [patientId, open]);
  
  if (!open) return null;
  
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;
  
  return (
    <ClaimForm 
      patientId={patientId} 
      appointmentId={appointmentId} 
      patientName={patientName} 
      onClose={onClose}
      patientData={patient || undefined} 
    />
  );
}