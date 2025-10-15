export interface PatientBalanceRow {
  patientId: number;
  firstName: string | null;
  lastName: string | null;
  totalCharges: number;
  totalPayments: number;
  totalAdjusted: number;
  currentBalance: number;
  lastPaymentDate: string | null;
  lastAppointmentDate: string | null;
}