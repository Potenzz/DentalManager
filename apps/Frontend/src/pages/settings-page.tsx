import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StaffTable } from "@/components/staffs/staff-table";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Add Staff Mutation
  const addStaffMutation = useMutation({
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

  // Update Staff Mutation
  const updateStaffMutation = useMutation({
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

  // Delete Staff Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/staffs/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete staff");
      }
      return id;
    },
    onSuccess: () => {
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

  // Handlers for prompts and mutations
  const openAddStaffModal = () => {
    const name = prompt("Enter staff name:");
    if (!name) return;
    const email = prompt("Enter staff email (optional):") || undefined;
    const role = prompt("Enter staff role:") || "Staff";
    const phone = prompt("Enter staff phone (optional):") || undefined;
    addStaffMutation.mutate({ name, email, role, phone });
  };

  const openEditStaffModal = (staff: Staff) => {
    if (typeof staff.id !== "number") {
      toast({
        title: "Error",
        description: "Staff ID is missing",
        variant: "destructive",
      });
      return;
    }
    const name = prompt("Edit staff name:", staff.name);
    if (!name) return;
    const email = prompt("Edit staff email:", staff.email || "") || undefined;
    const role = prompt("Edit staff role:", staff.role || "Staff") || "Staff";
    const phone = prompt("Edit staff phone:", staff.phone || "") || undefined;
    updateStaffMutation.mutate({
      id: staff.id,
      updatedFields: { name, email, role, phone },
    });
  };

  const handleDeleteStaff = (id: number) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      deleteStaffMutation.mutate(id);
    }
  };

  const handleViewStaff = (staff: Staff) =>
    alert(`Viewing staff member:\n${staff.name} (${staff.email || "No email"})`);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        <main className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
