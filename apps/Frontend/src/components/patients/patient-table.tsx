import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Delete, Edit, Eye, FileCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import LoadingScreen from "../ui/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddPatientModal } from "./add-patient-modal";
import { DeleteConfirmationDialog } from "../ui/deleteDialog";
import { useAuth } from "@/hooks/use-auth";
import { PatientSearch, SearchCriteria } from "./patient-search";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { formatDateToHumanReadable } from "@/utils/dateUtils";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

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

interface PatientApiResponse {
  patients: Patient[];
  totalCount: number;
}

interface PatientTableProps {
  allowEdit?: boolean;
  allowView?: boolean;
  allowDelete?: boolean;
  allowCheckbox?: boolean;
  allowNewClaim?: boolean;
  onNewClaim?: (patientId: number) => void;
  onSelectPatient?: (patient: Patient | null) => void;
  onPageChange?: (page: number) => void;
  onSearchChange?: (searchTerm: string) => void;
}

export function PatientTable({
  allowEdit,
  allowView,
  allowDelete,
  allowCheckbox,
  allowNewClaim,
  onNewClaim,
  onSelectPatient,
  onPageChange,
  onSearchChange,
}: PatientTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isViewPatientOpen, setIsViewPatientOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(
    undefined
  );

  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 5;
  const offset = (currentPage - 1) * patientsPerPage;

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(
    null
  );
  const [debouncedSearchCriteria] = useDebounce(searchCriteria, 500);

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );

  const handleSelectPatient = (patient: Patient) => {
    const isSelected = selectedPatientId === patient.id;
    const newSelectedId = isSelected ? null : patient.id;
    setSelectedPatientId(newSelectedId);

    if (onSelectPatient) {
      onSelectPatient(isSelected ? null : patient);
    }
  };

  const {
    data: patientsData,
    isLoading,
    isError,
  } = useQuery<PatientApiResponse, Error>({
    queryKey: [
      "patients",
      {
        page: currentPage,
        search: debouncedSearchCriteria?.searchTerm || "recent",
      },
    ],
    queryFn: async () => {
      const trimmedTerm = debouncedSearchCriteria?.searchTerm?.trim();
      const isSearch = trimmedTerm && trimmedTerm.length > 0;

      const rawSearchBy = debouncedSearchCriteria?.searchBy || "name";
      const validSearchKeys = [
        "name",
        "phone",
        "insuranceId",
        "gender",
        "dob",
        "all",
      ];
      const searchKey = validSearchKeys.includes(rawSearchBy)
        ? rawSearchBy
        : "name";

      let url: string;

      if (isSearch) {
        const searchParams = new URLSearchParams({
          limit: String(patientsPerPage),
          offset: String(offset),
        });

        if (searchKey === "all") {
          searchParams.set("term", trimmedTerm!);
        } else {
          searchParams.set(searchKey, trimmedTerm!);
        }

        url = `/api/patients/search?${searchParams.toString()}`;
      } else {
        url = `/api/patients/recent?limit=${patientsPerPage}&offset=${offset}`;
      }

      const res = await apiRequest("GET", url);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Search failed");
      }

      return res.json();
    },
    placeholderData: {
      patients: [],
      totalCount: 0,
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
      setIsAddPatientOpen(false);
      queryClient.invalidateQueries({
        queryKey: [
          "patients",
          {
            page: currentPage,
            search: debouncedSearchCriteria?.searchTerm || "recent",
          },
        ],
      });
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

  const deletePatientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/patients/${id}`);
      return;
    },
    onSuccess: () => {
      setIsDeletePatientOpen(false);
      queryClient.invalidateQueries({
        queryKey: [
          "patients",
          {
            page: currentPage,
            search: debouncedSearchCriteria?.searchTerm || "recent",
          },
        ],
      });
      toast({
        title: "Success",
        description: "Patient deleted successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      console.log(error);
      toast({
        title: "Error",
        description: `Failed to delete patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUpdatePatient = (patient: UpdatePatient & { id?: number }) => {
    if (currentPatient && user) {
      const { id, ...sanitizedPatient } = patient;
      updatePatientMutation.mutate({
        id: currentPatient.id,
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

  const handleEditPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsAddPatientOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsViewPatientOpen(true);
  };

  const handleDeletePatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsDeletePatientOpen(true);
  };

  const handleConfirmDeletePatient = async () => {
    if (currentPatient) {
      deletePatientMutation.mutate(currentPatient.id);
    } else {
      toast({
        title: "Error",
        description: "No patient selected for deletion.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (onPageChange) onPageChange(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    const term = debouncedSearchCriteria?.searchTerm?.trim() || "recent";
    if (onSearchChange) onSearchChange(term);
  }, [debouncedSearchCriteria, onSearchChange]);

  const totalPages = useMemo(
    () => Math.ceil((patientsData?.totalCount || 0) / patientsPerPage),
    [patientsData]
  );
  const startItem = offset + 1;
  const endItem = Math.min(
    offset + patientsPerPage,
    patientsData?.totalCount || 0
  );

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const getAvatarColor = (id: number) => {
    const colorClasses = [
      "bg-blue-500",
      "bg-teal-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-indigo-500",
      "bg-green-500",
      "bg-purple-500",
    ];
    return colorClasses[id % colorClasses.length];
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <PatientSearch
          onSearch={(criteria) => {
            setSearchCriteria(criteria);
            setCurrentPage(1); // reset page on new search
            setIsSearchActive(true);
          }}
          onClearSearch={() => {
            setSearchCriteria({ searchTerm: "", searchBy: "name" }); // triggers `recent`
            setCurrentPage(1);
            setIsSearchActive(false);
          }}
          isSearchActive={isSearchActive}
        />
        <Table>
          <TableHeader>
            <TableRow>
              {allowCheckbox && <TableHead>Select</TableHead>}
              <TableHead>Patient</TableHead>
              <TableHead>DOB / Gender</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  <LoadingScreen />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-red-500"
                >
                  Error loading patients.
                </TableCell>
              </TableRow>
            ) : patientsData?.patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No patients found.
                </TableCell>
              </TableRow>
            ) : (
              patientsData?.patients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-gray-50">
                  {allowCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={selectedPatientId === patient.id}
                        onCheckedChange={() => handleSelectPatient(patient)}
                      />
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="flex items-center">
                      <Avatar
                        className={`h-10 w-10 ${getAvatarColor(patient.id)}`}
                      >
                        <AvatarFallback className="text-white">
                          {getInitials(patient.firstName, patient.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          PID-{patient.id.toString().padStart(4, "0")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatDateToHumanReadable(patient.dateOfBirth)}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {patient.gender}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{patient.phone}</div>
                    <div className="text-sm text-gray-500">{patient.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {patient.insuranceProvider ?? "Not specified"}
                    </div>
                    {patient.insuranceId && (
                      <div className="text-sm text-gray-500">
                        ID: {patient.insuranceId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="col-span-1">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          patient.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {patient.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {allowDelete && (
                        <Button
                          onClick={() => {
                            handleDeletePatient(patient);
                          }}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Delete Staff"
                          variant="ghost"
                          size="icon"
                        >
                          <Delete />
                        </Button>
                      )}
                      {allowEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleEditPatient(patient);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {allowNewClaim && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onNewClaim?.(patient.id)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                        aria-label="New Claim"
                      >
                      <FileCheck className="h-5 w-5" />
                      </Button>
                    )}
                      {allowView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleViewPatient(patient);
                          }}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Patient Modal */}
      <Dialog open={isViewPatientOpen} onOpenChange={setIsViewPatientOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Complete information about the patient.
            </DialogDescription>
          </DialogHeader>

          {currentPatient && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-medium">
                  {currentPatient.firstName.charAt(0)}
                  {currentPatient.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {currentPatient.firstName} {currentPatient.lastName}
                  </h3>
                  <p className="text-gray-500">
                    Patient ID: {currentPatient.id.toString().padStart(4, "0")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Personal Information
                  </h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Date of Birth:</span>{" "}
                      {formatDateToHumanReadable(currentPatient.dateOfBirth)}
                    </p>
                    <p>
                      <span className="text-gray-500">Gender:</span>{" "}
                      {currentPatient.gender.charAt(0).toUpperCase() +
                        currentPatient.gender.slice(1)}
                    </p>
                    <p>
                      <span className="text-gray-500">Status:</span>{" "}
                      <span
                        className={`${
                          currentPatient.status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        } font-medium`}
                      >
                        {currentPatient.status.charAt(0).toUpperCase() +
                          currentPatient.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">
                    Contact Information
                  </h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Phone:</span>{" "}
                      {currentPatient.phone}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{" "}
                      {currentPatient.email || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Address:</span>{" "}
                      {currentPatient.address ? (
                        <>
                          {currentPatient.address}
                          {currentPatient.city && `, ${currentPatient.city}`}
                          {currentPatient.zipCode &&
                            ` ${currentPatient.zipCode}`}
                        </>
                      ) : (
                        "N/A"
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Insurance</h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Provider:</span>{" "}
                      {currentPatient.insuranceProvider
                        ? currentPatient.insuranceProvider === "delta"
                          ? "Delta Dental"
                          : currentPatient.insuranceProvider === "metlife"
                            ? "MetLife"
                            : currentPatient.insuranceProvider === "cigna"
                              ? "Cigna"
                              : currentPatient.insuranceProvider === "aetna"
                                ? "Aetna"
                                : currentPatient.insuranceProvider
                        : "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">ID:</span>{" "}
                      {currentPatient.insuranceId || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Group Number:</span>{" "}
                      {currentPatient.groupNumber || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Policy Holder:</span>{" "}
                      {currentPatient.policyHolder || "Self"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">
                    Medical Information
                  </h4>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="text-gray-500">Allergies:</span>{" "}
                      {currentPatient.allergies || "None reported"}
                    </p>
                    <p>
                      <span className="text-gray-500">Medical Conditions:</span>{" "}
                      {currentPatient.medicalConditions || "None reported"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsViewPatientOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewPatientOpen(false);
                    handleEditPatient(currentPatient);
                  }}
                >
                  Edit Patient
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Patient Modal */}
      <AddPatientModal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        onSubmit={handleUpdatePatient}
        isLoading={isLoading}
        patient={currentPatient}
      />

      <DeleteConfirmationDialog
        isOpen={isDeletePatientOpen}
        onConfirm={handleConfirmDeletePatient}
        onCancel={() => setIsDeletePatientOpen(false)}
        entityName={currentPatient?.name}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0 whitespace-nowrap">
              Showing {startItem}–{endItem} of {patientsData?.totalCount || 0}{" "}
              results
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
