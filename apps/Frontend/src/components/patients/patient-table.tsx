import { useState } from "react";
import { Patient } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, Eye, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PatientTableProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onView: (patient: Patient) => void;
}

export function PatientTable({ patients, onEdit, onView }: PatientTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 5;
  
  // Get current patients
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = patients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(patients.length / patientsPerPage);

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
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

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>DOB / Gender</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No patients found. Add your first patient to get started.
                </TableCell>
              </TableRow>
            ) : (
              currentPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className={`h-10 w-10 ${getAvatarColor(patient.id)}`}>
                        <AvatarFallback className="text-white">
                          {getInitials(patient.firstName, patient.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          PID-{patient.id.toString().padStart(4, '0')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatDate(patient.dateOfBirth)}
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
                      {patient.insuranceProvider ? (
                        patient.insuranceProvider === 'delta'
                          ? 'Delta Dental'
                          : patient.insuranceProvider === 'metlife'
                          ? 'MetLife'
                          : patient.insuranceProvider === 'cigna'
                          ? 'Cigna'
                          : patient.insuranceProvider === 'aetna'
                          ? 'Aetna'
                          : patient.insuranceProvider === 'none'
                          ? 'No Insurance'
                          : patient.insuranceProvider
                      ) : (
                        'Not specified'
                      )}
                    </div>
                    {patient.insuranceId && (
                      <div className="text-sm text-gray-500">
                        ID: {patient.insuranceId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={patient.status === 'active' ? 'success' : 'warning'}
                      className="capitalize"
                    >
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(patient)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(patient)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {patients.length > patientsPerPage && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstPatient + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastPatient, patients.length)}
                </span>{" "}
                of <span className="font-medium">{patients.length}</span> results
              </p>
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
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
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
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
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
