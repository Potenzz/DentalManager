import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PROCEDURE_COMBOS, COMBO_CATEGORIES } from "@/utils/procedureCombos";
import {
  CODE_MAP,
  getPriceForCodeWithAgeFromMap,
} from "@/utils/procedureCombosMapping";
import { Patient } from "@repo/db/types";

interface AppointmentProcedure {
  id: number;
  appointmentId: number;
  patientId: number;
  procedureCode: string;
  procedureLabel?: string | null;
  fee?: number | null;
  isDirect: boolean;
  toothNumber?: string | null;
  toothSurface?: string | null;
  oralCavityArea?: string | null;
  source: "COMBO" | "MANUAL";
  comboKey?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number;
  patientId: number;
  patient: Patient;
}

export function AppointmentProceduresDialog({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patient,
}: Props) {
  const { toast } = useToast();

  // -----------------------------
  // state for manual add
  // -----------------------------
  const [manualCode, setManualCode] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualFee, setManualFee] = useState("");
  const [manualTooth, setManualTooth] = useState("");
  const [manualSurface, setManualSurface] = useState("");

  // -----------------------------
  // state for inline edit
  // -----------------------------
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Partial<AppointmentProcedure>>({});

  // -----------------------------
  // fetch procedures
  // -----------------------------
  const { data: procedures = [], isLoading } = useQuery<AppointmentProcedure[]>(
    {
      queryKey: ["appointment-procedures", appointmentId],
      queryFn: async () => {
        const res = await apiRequest(
          "GET",
          `/api/appointment-procedures/${appointmentId}`
        );
        if (!res.ok) throw new Error("Failed to load procedures");
        return res.json();
      },
      enabled: open && !!appointmentId,
    }
  );

  // -----------------------------
  // mutations
  // -----------------------------
  const addManualMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appointmentId,
        patientId,
        procedureCode: manualCode,
        procedureLabel: manualLabel || null,
        fee: manualFee ? Number(manualFee) : null,
        toothNumber: manualTooth || null,
        toothSurface: manualSurface || null,
        source: "MANUAL",
        isDirect: false,
      };

      const res = await apiRequest(
        "POST",
        "/api/appointment-procedures",
        payload
      );
      if (!res.ok) throw new Error("Failed to add procedure");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Procedure added" });
      setManualCode("");
      setManualLabel("");
      setManualFee("");
      setManualTooth("");
      setManualSurface("");
      queryClient.invalidateQueries({
        queryKey: ["appointment-procedures", appointmentId],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message ?? "Failed to add procedure",
        variant: "destructive",
      });
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await apiRequest(
        "POST",
        "/api/appointment-procedures/bulk",
        rows
      );
      if (!res.ok) throw new Error("Failed to add combo procedures");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Combo added" });
      queryClient.invalidateQueries({
        queryKey: ["appointment-procedures", appointmentId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/appointment-procedures/${id}`
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({
        queryKey: ["appointment-procedures", appointmentId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const res = await apiRequest(
        "PUT",
        `/api/appointment-procedures/${editingId}`,
        editRow
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      setEditingId(null);
      setEditRow({});
      queryClient.invalidateQueries({
        queryKey: ["appointment-procedures", appointmentId],
      });
    },
  });

  const markClaimModeMutation = useMutation({
    mutationFn: async (mode: "DIRECT" | "MANUAL") => {
      const payload = {
        mode,
        appointmentId,
      };
      const res = await apiRequest(
        "POST",
        "/api/appointment-procedures/mark-claim-mode",
        payload
      );
      if (!res.ok) throw new Error("Failed to mark claim mode");
    },
    onSuccess: (_, mode) => {
      toast({
        title:
          mode === "DIRECT" ? "Direct claim selected" : "Manual claim selected",
      });
      queryClient.invalidateQueries({
        queryKey: ["appointment-procedures", appointmentId],
      });
    },
  });

  // -----------------------------
  // handlers
  // -----------------------------
  const handleAddCombo = (comboKey: string) => {
    const combo = PROCEDURE_COMBOS[comboKey];
    if (!combo || !patient?.dateOfBirth) return;

    const serviceDate = new Date();
    const dob = patient.dateOfBirth;

    const age = (() => {
      const birth = new Date(dob);
      const ref = new Date(serviceDate);
      let a = ref.getFullYear() - birth.getFullYear();
      const hadBirthday =
        ref.getMonth() > birth.getMonth() ||
        (ref.getMonth() === birth.getMonth() &&
          ref.getDate() >= birth.getDate());
      if (!hadBirthday) a -= 1;
      return a;
    })();

    const rows = combo.codes.map((code: string, idx: number) => {
      const priceDecimal = getPriceForCodeWithAgeFromMap(CODE_MAP, code, age);

      return {
        appointmentId,
        patientId,
        procedureCode: code,
        procedureLabel: combo.label,
        fee: priceDecimal.toNumber(),
        source: "COMBO",
        comboKey: comboKey,
        toothNumber: combo.toothNumbers?.[idx] ?? null,
        isDirect: false,
      };
    });

    bulkAddMutation.mutate(rows);
  };

  const startEdit = (row: AppointmentProcedure) => {
    setEditingId(row.id);
    setEditRow({
      procedureCode: row.procedureCode,
      procedureLabel: row.procedureLabel,
      fee: row.fee,
      toothNumber: row.toothNumber,
      toothSurface: row.toothSurface,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow({});
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Appointment Procedures
          </DialogTitle>
        </DialogHeader>

        {/* ================= COMBOS ================= */}
        <div className="space-y-4">
          <div className="text-sm font-semibold text-muted-foreground">
            Quick Add Combos
          </div>

          {Object.entries(COMBO_CATEGORIES).map(([categoryName, comboKeys]) => (
            <div key={categoryName} className="space-y-2">
              <div className="text-sm font-medium">{categoryName}</div>

              <div className="flex flex-wrap gap-2">
                {comboKeys.map((comboKey) => {
                  const combo = PROCEDURE_COMBOS[comboKey];
                  if (!combo) return null;

                  return (
                    <Button
                      key={comboKey}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddCombo(comboKey)}
                    >
                      {combo.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ================= MANUAL ADD ================= */}
        <div className="mt-8 border rounded-lg p-4 bg-muted/20 space-y-3">
          <div className="font-medium text-sm">Add Manual Procedure</div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Code</Label>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="D0120"
              />
            </div>

            <div>
              <Label>Label</Label>
              <Input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Exam"
              />
            </div>

            <div>
              <Label>Fee</Label>
              <Input
                value={manualFee}
                onChange={(e) => setManualFee(e.target.value)}
                placeholder="100"
                type="number"
              />
            </div>

            <div>
              <Label>Tooth</Label>
              <Input
                value={manualTooth}
                onChange={(e) => setManualTooth(e.target.value)}
                placeholder="14"
              />
            </div>

            <div>
              <Label>Surface</Label>
              <Input
                value={manualSurface}
                onChange={(e) => setManualSurface(e.target.value)}
                placeholder="MO"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => addManualMutation.mutate()}
              disabled={!manualCode || addManualMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Procedure
            </Button>
          </div>
        </div>

        {/* ================= LIST ================= */}
        <div className="mt-8 space-y-2">
          <div className="text-sm font-semibold">Selected Procedures</div>

          <div className="border rounded-lg divide-y bg-white">
            {isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {!isLoading && procedures.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No procedures added
              </div>
            )}

            {procedures.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 p-3 text-sm hover:bg-muted/40 transition"
              >
                {editingId === p.id ? (
                  <>
                    <Input
                      className="w-[90px]"
                      value={editRow.procedureCode ?? ""}
                      onChange={(e) =>
                        setEditRow({
                          ...editRow,
                          procedureCode: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="flex-1"
                      value={editRow.procedureLabel ?? ""}
                      onChange={(e) =>
                        setEditRow({
                          ...editRow,
                          procedureLabel: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="w-[90px]"
                      value={editRow.fee ?? ""}
                      onChange={(e) =>
                        setEditRow({ ...editRow, fee: Number(e.target.value) })
                      }
                    />
                    <Input
                      className="w-[80px]"
                      value={editRow.toothNumber ?? ""}
                      onChange={(e) =>
                        setEditRow({
                          ...editRow,
                          toothNumber: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="w-[80px]"
                      value={editRow.toothSurface ?? ""}
                      onChange={(e) =>
                        setEditRow({
                          ...editRow,
                          toothSurface: e.target.value,
                        })
                      }
                    />

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateMutation.mutate()}
                    >
                      <Save className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-[90px] font-medium">
                      {p.procedureCode}
                    </div>
                    <div className="flex-1 text-muted-foreground">
                      {p.procedureLabel}
                    </div>
                    <div className="w-[90px]">{p.fee}</div>
                    <div className="w-[80px]">{p.toothNumber}</div>
                    <div className="w-[80px]">{p.toothSurface}</div>

                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        p.isDirect
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p.isDirect ? "Direct" : "Manual"}
                    </span>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex justify-between items-center gap-2 mt-8 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => markClaimModeMutation.mutate("DIRECT")}
              disabled={!procedures.length}
            >
              Direct Claim
            </Button>

            <Button
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => markClaimModeMutation.mutate("MANUAL")}
              disabled={!procedures.length}
            >
              Manual Claim
            </Button>
          </div>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
