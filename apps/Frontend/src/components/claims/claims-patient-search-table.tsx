// components/patients/PatientSearchTable.tsx

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface Patient {
  id: number;
  name: string;
  gender: string;
  dob: string;
  memberId: string;
}

interface Props {
  onSelectPatient: (patient: Patient) => void;
}

export default function PatientSearchTable({ onSelectPatient }: Props) {
  const [term, setTerm] = useState("");
  const [visible, setVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", term],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/search?term=${term}`);
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json();
    },
    enabled: !!term,
  });

  useEffect(() => {
    if (term.length > 0) setVisible(true);
  }, [term]);

  return (
    <div className="space-y-2">
      <Input placeholder="Search patients..." value={term} onChange={(e) => setTerm(e.target.value)} />

      {visible && data?.length > 0 && (
        <div className="border rounded overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Member ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((patient: Patient) => (
                <TableRow key={patient.id} onClick={() => onSelectPatient(patient)} className="cursor-pointer hover:bg-muted">
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.gender}</TableCell>
                  <TableCell>{patient.dob}</TableCell>
                  <TableCell>{patient.memberId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
