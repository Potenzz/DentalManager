import {
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { PatientForm, PatientFormRef } from "./patient-form"; 
import { useToast } from "@/hooks/use-toast";
import { X, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

type UpdatePatient = z.infer<typeof updatePatientSchema>;

interface AddPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertPatient | (UpdatePatient & { id?: number })) => void;
  isLoading: boolean;
  patient?: Patient;
  extractedInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    insuranceId: string;
  };
}

// Define the ref type
export type AddPatientModalRef = {
  shouldSchedule: boolean;
  navigateToSchedule: (patientId: number) => void;
};

export const AddPatientModal = forwardRef<
  AddPatientModalRef,
  AddPatientModalProps
>(function AddPatientModal(props, ref) {
  const { open, onOpenChange, onSubmit, isLoading, patient, extractedInfo } =
    props;
  const [formData, setFormData] = useState<
    InsertPatient | UpdatePatient | null
  >(null);
  const isEditing = !!patient;
  const [, navigate] = useLocation();
  const [saveAndSchedule, setSaveAndSchedule] = useState(false);
  const patientFormRef = useRef<PatientFormRef>(null); // Ref for PatientForm

  // Set up the imperativeHandle to expose functionality to the parent component
  useEffect(() => {
    if (isEditing && patient) {
      const { id, userId, createdAt, ...sanitized } = patient;
      setFormData(sanitized); // Update the form data with the patient data for editing
    } else {
      setFormData(null); // Reset form data when not editing
    }
  }, [isEditing, patient]);

  useImperativeHandle(ref, () => ({
    shouldSchedule: saveAndSchedule,
    navigateToSchedule: (patientId: number) => {
      navigate(`/appointments?newPatient=${patientId}`);
    },
  }));

  const handleFormSubmit = (data: InsertPatient | UpdatePatient) => {
    if (patient && patient.id) {
      onSubmit({ ...data, id: patient.id });
    } else {
      onSubmit(data);
    }
  };

  const handleSaveAndSchedule = () => {
  setSaveAndSchedule(true);
  if (patientFormRef.current) {
    patientFormRef.current.submit();
  }
};


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? "Edit Patient" : "Add New Patient"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update patient information in the form below."
              : "Fill out the patient information to add them to your records."}
          </DialogDescription>
        </DialogHeader>

        <PatientForm
          ref={patientFormRef}
          patient={patient}
          extractedInfo={extractedInfo}
          onSubmit={handleFormSubmit}
        />

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {!isEditing && (
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => {
                handleSaveAndSchedule();
              }}
              disabled={isLoading}
            >
              <Calendar className="h-4 w-4" />
              Save & Schedule
            </Button>
          )}

          <Button
            type="button"
            form="patient-form"
            onClick={() => {
              if (patientFormRef.current) {
                patientFormRef.current.submit();
              }
            }}
            disabled={isLoading}
          >
            {isLoading
              ? patient
                ? "Updating..."
                : "Saving..."
              : patient
                ? "Update Patient"
                : "Save Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
