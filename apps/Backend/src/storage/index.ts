

import { usersStorage } from './users-storage';
import { patientsStorage } from './patients-storage';
import { appointmentsStorage } from './appointments-storage';
import { appointmentProceduresStorage } from './appointment-procedures-storage';
import { staffStorage } from './staff-storage';
import { claimsStorage } from './claims-storage';
import { insuranceCredsStorage } from './insurance-creds-storage';
import { generalPdfStorage } from './general-pdf-storage';
import { paymentsStorage } from './payments-storage';
import { databaseBackupStorage } from './database-backup-storage';
import { notificationsStorage } from './notifications-storage';
import { cloudStorageStorage } from './cloudStorage-storage';
import { paymentsReportsStorage } from './payments-reports-storage';
import * as exportPaymentsReportsStorage from "./export-payments-reports-storage";


export const storage = {
  ...usersStorage,
  ...patientsStorage,
  ...appointmentsStorage,
  ...appointmentProceduresStorage,
  ...staffStorage,
  ...claimsStorage,
  ...insuranceCredsStorage,
  ...generalPdfStorage,
  ...paymentsStorage,
  ...databaseBackupStorage,
  ...notificationsStorage,
  ...cloudStorageStorage,
  ...paymentsReportsStorage,
  ...exportPaymentsReportsStorage, 

};

export default storage;
