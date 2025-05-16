import React, { useState } from "react";
import { z } from "zod";
import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
import { Button } from "../ui/button";
import { Delete, Edit } from "lucide-react";

type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

const staffCreateSchema = StaffUncheckedCreateInputObjectSchema;
const staffUpdateSchema = (
  StaffUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).partial();

interface StaffTableProps {
  staff: Staff[];
  isLoading?: boolean;
  isError?: boolean;
  onAdd: () => void;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  onView: (staff: Staff) => void;
}


export function StaffTable({
  staff,
  onEdit,
  onView,
  onDelete,
  onAdd,
}: StaffTableProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const staffPerPage = 5;

  const indexOfLastStaff = currentPage * staffPerPage;
  const indexOfFirstStaff = indexOfLastStaff - staffPerPage;
  const currentStaff = staff.slice(indexOfFirstStaff, indexOfLastStaff);
  const totalPages = Math.ceil(staff.length / staffPerPage);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (id: number) => {
    const colors = [
      "bg-blue-500",
      "bg-teal-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-indigo-500",
      "bg-green-500",
      "bg-purple-500",
    ];
    return colors[id % colors.length];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add New Staff
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="relative px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No staff found. Add new staff to get started.
                </td>
              </tr>
            ) : (
              currentStaff.map((staff: Staff) => {
                const avatarId = staff.id ?? 0; // fallback if undefined
                const formattedDate = staff.createdAt
                  ? formatDate(
                      typeof staff.createdAt === "string"
                        ? staff.createdAt
                        : staff.createdAt.toISOString()
                    )
                  : "N/A";

                return (
                  <tr key={avatarId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(
                          avatarId
                        )}`}
                      >
                        {getInitials(staff.name)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {staff.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staff.email || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-gray-900">
                      {staff.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staff.phone || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        onClick={() =>
                          staff !== undefined && onDelete(staff)
                        }
                        className="text-red-600 hover:text-red-900"
                        aria-label="Delete Staff"
                        variant="ghost"
                        size="icon"
                      >
                        <Delete/>
                      </Button>
                      <Button
                        onClick={() => staff.id !== undefined && onEdit(staff)}
                        className="text-blue-600 hover:text-blue-900"
                        aria-label="Edit Staff"
                        variant="ghost"
                        size="icon"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {staff.length > staffPerPage && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">{indexOfFirstStaff + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(indexOfLastStaff, staff.length)}
              </span>{" "}
              of <span className="font-medium">{staff.length}</span> results
            </p>

            <nav
              className="inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Previous
              </a>

              {Array.from({ length: totalPages }).map((_, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(i + 1);
                  }}
                  aria-current={currentPage === i + 1 ? "page" : undefined}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === i + 1
                      ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </a>
              ))}

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                  currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Next
              </a>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
