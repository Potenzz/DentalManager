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

export interface GetPatientBalancesResult {
  balances: PatientBalanceRow[];
  totalCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}