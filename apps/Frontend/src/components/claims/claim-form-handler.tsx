import { AppDispatch } from "@/redux/store";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { ClaimForm } from "@/components/claims/claim-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  PatientUncheckedCreateInputObjectSchema,
  AppointmentUncheckedCreateInputObjectSchema,
  ClaimUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { FileCheck } from "lucide-react";
import { parse } from "date-fns";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setTaskStatus,
  clearTaskStatus,
} from "@/redux/slices/seleniumClaimSubmitTaskSlice";
import { SeleniumTaskBanner } from "@/components/ui/selenium-task-banner";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";
import ClaimsRecentTable from "@/components/claims/claims-recent-table";
import ClaimsOfPatientModal from "@/components/claims/claims-of-patient-table";

//creating types out of schema auto generated.
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;
type Claim = z.infer<typeof ClaimUncheckedCreateInputObjectSchema>;

const insertAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

const updateAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;

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

const { toast } = useToast();

// Add patient mutation
const addPatientMutation = useMutation({
  mutationFn: async (patient: InsertPatient) => {
    const res = await apiRequest("POST", "/api/patients/", patient);
    return res.json();
  },
  onSuccess: (newPatient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
    toast({
      title: "Success",
      description: "Patient added successfully!",
      variant: "default",
    });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: `Failed to add patient: ${error.message}`,
      variant: "destructive",
    });
  },
});

// Update patient mutation
const updatePatientMutation = useMutation({
  mutationFn: async ({
    id,
    patient,
  }: {
    id: number;
    patient: UpdatePatient;
  }) => {
    const res = await apiRequest("PUT", `/api/patients/${id}`, patient);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
    toast({
      title: "Success",
      description: "Patient updated successfully!",
      variant: "default",
    });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: `Failed to update patient: ${error.message}`,
      variant: "destructive",
    });
  },
});

// Create/upsert appointment mutation
const createAppointmentMutation = useMutation({
  mutationFn: async (appointment: InsertAppointment) => {
    const res = await apiRequest("POST", "/api/appointments/upsert", appointment);
    return await res.json();
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Appointment created successfully.",
    });
    // Invalidate both appointments and patients queries
    queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
  },
  onError: (error: Error) => {
    toast({
      title: "Error",
      description: `Failed to create appointment: ${error.message}`,
      variant: "destructive",
    });
  },
});

// Update appointment mutation
const updateAppointmentMutation = useMutation({
  mutationFn: async ({
    id,
    appointment,
  }: {
    id: number;
    appointment: UpdateAppointment;
  }) => {
    const res = await apiRequest("PUT", `/api/appointments/${id}`, appointment);
    return await res.json();
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Appointment updated successfully.",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients/"] });
  },
  onError: (error: Error) => {
    toast({
      title: "Error",
      description: `Failed to update appointment: ${error.message}`,
      variant: "destructive",
    });
  },
});

const createClaimMutation = useMutation({
  mutationFn: async (claimData: any) => {
    const res = await apiRequest("POST", "/api/claims/", claimData);
    return res.json();
  },
  onSuccess: () => {
    toast({
      title: "Claim created successfully",
      variant: "default",
    });
  },
  onError: (error: any) => {
    toast({
      title: "Error submitting claim",
      description: error.message,
      variant: "destructive",
    });
  },
});

function handleClaimSubmit(claimData: any): Promise<Claim> {
  return createClaimMutation.mutateAsync(claimData).then((data) => {
    return data;
  });
}

const handleAppointmentSubmit = async (
  appointmentData: InsertAppointment | UpdateAppointment
): Promise<number> => {
  const rawDate = parseLocalDate(appointmentData.date);
  const formattedDate = formatLocalDate(rawDate);

  // Prepare minimal data to update/create
  const minimalData = {
    date: rawDate.toLocaleDateString("en-CA"), // "YYYY-MM-DD" format
    startTime: appointmentData.startTime || "09:00",
    endTime: appointmentData.endTime || "09:30",
    staffId: appointmentData.staffId,
  };

  // Find existing appointment for this patient on the same date
  const existingAppointment = appointments.find(
    (a) =>
      a.patientId === appointmentData.patientId &&
      formatLocalDate(parseLocalDate(a.date)) === formattedDate
  );

  if (existingAppointment && typeof existingAppointment.id === "number") {
    // Update appointment with only date
    updateAppointmentMutation.mutate({
      id: existingAppointment.id,
      appointment: minimalData,
    });
    return existingAppointment.id;
  }

  return new Promise<number>((resolve, reject) => {
    createAppointmentMutation.mutate(
      {
        ...minimalData,
        patientId: appointmentData.patientId,
        userId: user?.id,
        title: "Scheduled Appointment",
        type: "checkup",
      },
      {
        onSuccess: (newAppointment) => {
          resolve(newAppointment.id);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Could not create appointment",
            variant: "destructive",
          });
          reject(error);
        },
      }
    );
  });
};

// Update Patient ( for insuranceId and Insurance Provider)
const handleUpdatePatient = (patient: UpdatePatient & { id?: number }) => {
  if (patient) {
    const { id, ...sanitizedPatient } = patient;
    updatePatientMutation.mutate({
      id: Number(patient.id),
      patient: sanitizedPatient,
    });
  } else {
    console.error("No current patient or user found for update");
    toast({
      title: "Error",
      description: "Cannot update patient: No patient or user found",
      variant: "destructive",
    });
  }
};

// handle selenium sybmiting Mass Health claim
export const handleMHClaimSubmitSelenium = async (
  data: any,
  dispatch: AppDispatch,
  selectedPatient: number | null
) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  const uploadedFiles: File[] = data.uploadedFiles ?? [];

  uploadedFiles.forEach((file: File) => {
    if (file.type === "application/pdf") {
      formData.append("pdfs", file);
    } else if (file.type.startsWith("image/")) {
      formData.append("images", file);
    }
  });

  try {
    dispatch(
      setTaskStatus({
        status: "pending",
        message: "Submitting claim to Selenium...",
      })
    );
    const response = await apiRequest("POST", "/api/claims/selenium", formData);
    const result1 = await response.json();
    if (result1.error) throw new Error(result1.error);

    dispatch(
      setTaskStatus({
        status: "pending",
        message: "Submitted to Selenium. Awaiting PDF...",
      })
    );

    toast({
      title: "Selenium service notified",
      description:
        "Your claim data was successfully sent to Selenium, Waitinig for its response.",
      variant: "default",
    });

    const result2 = await handleSeleniumPdfDownload(
      result1,
      dispatch,
      selectedPatient
    );
    return result2;
  } catch (error: any) {
    dispatch(
      setTaskStatus({
        status: "error",
        message: error.message || "Selenium submission failed",
      })
    );
    toast({
      title: "Selenium service error",
      description: error.message || "An error occurred.",
      variant: "destructive",
    });
  }
};

// selenium pdf download handler
export const handleSeleniumPdfDownload = async (
  data: any,
  dispatch: AppDispatch,
  selectedPatient: number | null
) => {
  try {
    if (!selectedPatient) {
      throw new Error("Missing patientId");
    }

    dispatch(
      setTaskStatus({
        status: "pending",
        message: "Downloading PDF from Selenium...",
      })
    );

    const res = await apiRequest("POST", "/api/claims/selenium/fetchpdf", {
      patientId: selectedPatient,
      pdf_url: data.pdf_url,
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    dispatch(
      setTaskStatus({
        status: "success",
        message: "Claim submitted & PDF downloaded successfully.",
      })
    );

    toast({
      title: "Success",
      description: "Claim Submitted and Pdf Downloaded completed.",
    });

    //   setSelectedPatient(null);

    return result;
  } catch (error: any) {
    dispatch(
      setTaskStatus({
        status: "error",
        message: error.message || "Failed to download PDF",
      })
    );
    toast({
      title: "Error",
      description: error.message || "Failed to fetch PDF",
      variant: "destructive",
    });
  }
};
