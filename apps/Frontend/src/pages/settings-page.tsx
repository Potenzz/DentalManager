import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StaffTable } from "@/components/staffs/staff-table";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StaffForm } from "@/components/staffs/staff-form";
import { DeleteConfirmationDialog } from "@/components/ui/deleteDialog";

// Correctly infer Staff type from zod schema
type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal and editing staff state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  // Fetch staff data
  const {
    data: staff = [],
    isLoading,
    isError,
    error,
  } = useQuery<Staff[]>({
    queryKey: ["/api/staffs/"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/staffs/");
      if (!res.ok) {
        throw new Error("Failed to fetch staff");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Add Staff mutation
  const addStaffMutate = useMutation<
    Staff, // Return type
    Error, // Error type
    Omit<Staff, "id" | "createdAt"> // Variables
  >({
    mutationFn: async (newStaff: Omit<Staff, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/staffs/", newStaff);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to add staff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staffs/"] });
      toast({
        title: "Staff Added",
        description: "Staff member added successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add staff",
        variant: "destructive",
      });
    },
  });

  // Update Staff mutation
  const updateStaffMutate = useMutation<
    Staff,
    Error,
    { id: number; updatedFields: Partial<Staff> }
  >({
    mutationFn: async ({
      id,
      updatedFields,
    }: {
      id: number;
      updatedFields: Partial<Staff>;
    }) => {
      const res = await apiRequest("PUT", `/api/staffs/${id}`, updatedFields);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update staff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staffs/"] });
      toast({
        title: "Staff Updated",
        description: "Staff member updated successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update staff",
        variant: "destructive",
      });
    },
  });

  // Delete Staff mutation
  const deleteStaffMutation = useMutation<number, Error, number>({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/staffs/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete staff");
      }
      return id;
    },
    onSuccess: () => {
      setIsDeleteStaffOpen(false); 
      queryClient.invalidateQueries({ queryKey: ["/api/staffs/"] });
      toast({
        title: "Staff Removed",
        description: "Staff member deleted.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete staff",
        variant: "destructive",
      });
    },
  });

  // Extract mutation states for modal control and loading

  const isAdding = addStaffMutate.status === "pending";
  const isAddSuccess = addStaffMutate.status === "success";

  const isUpdating = updateStaffMutate.status === "pending";
  const isUpdateSuccess = updateStaffMutate.status === "success";

  // Open Add modal
  const openAddStaffModal = () => {
    setEditingStaff(null);
    setModalOpen(true);
  };

  // Open Edit modal
  const openEditStaffModal = (staff: Staff) => {
    setEditingStaff(staff);
    setModalOpen(true);
  };

  // Handle form submit for Add or Edit
  const handleFormSubmit = (formData: Omit<Staff, "id" | "createdAt">) => {
    if (editingStaff) {
      // Editing existing staff
      if (editingStaff.id === undefined) {
        toast({
          title: "Error",
          description: "Staff ID is missing",
          variant: "destructive",
        });
        return;
      }
      updateStaffMutate.mutate({
        id: editingStaff.id,
        updatedFields: formData,
      });
    } else {
      addStaffMutate.mutate(formData);
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  // Close modal on successful add/update
  useEffect(() => {
    if (isAddSuccess || isUpdateSuccess) {
      setModalOpen(false);
    }
  }, [isAddSuccess, isUpdateSuccess]);

  const [isDeleteStaffOpen, setIsDeleteStaffOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | undefined>(
    undefined
  );

  const handleDeleteStaff = (staff: Staff) => {
    setCurrentStaff(staff);
    setIsDeleteStaffOpen(true);
  };

  const handleConfirmDeleteStaff = async () => {
    if (currentStaff?.id) {
      deleteStaffMutation.mutate(currentStaff.id);
    } else {
      toast({
        title: "Error",
        description: "No Staff selected for deletion.",
        variant: "destructive",
      });
    }
  };

  const handleViewStaff = (staff: Staff) =>
    alert(
      `Viewing staff member:\n${staff.name} (${staff.email || "No email"})`
    );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        <main className="flex-1 overflow-y-auto p-2">
          <Card>
            <CardContent>
              <div className="mt-8">
                <StaffTable
                  staff={staff}
                  isLoading={isLoading}
                  isError={isError}
                  onAdd={openAddStaffModal}
                  onEdit={openEditStaffModal}
                  onDelete={handleDeleteStaff}
                  onView={handleViewStaff}
                />
                {isError && (
                  <p className="mt-4 text-red-600">
                    {(error as Error)?.message || "Failed to load staff data."}
                  </p>
                )}

                <DeleteConfirmationDialog
                  isOpen={isDeleteStaffOpen}
                  onConfirm={handleConfirmDeleteStaff}
                  onCancel={() => setIsDeleteStaffOpen(false)}
                  patientName={currentStaff?.name}
                />
              </div>
            </CardContent>
          </Card>

          {/* Modal Overlay */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
                <h2 className="text-lg font-bold mb-4">
                  {editingStaff ? "Edit Staff" : "Add Staff"}
                </h2>
                <StaffForm
                  initialData={editingStaff || undefined}
                  onSubmit={handleFormSubmit}
                  onCancel={handleModalCancel}
                  isLoading={isAdding || isUpdating}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
