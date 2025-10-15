

import { usersStorage } from './users-storage';
import { patientsStorage } from './patients-storage';
import { appointmentsStorage } from './appointements-storage';
import { staffStorage } from './staff-storage';
import { claimsStorage } from './claims-storage';
import { insuranceCredsStorage } from './insurance-creds-storage';
import { generalPdfStorage } from './general-pdf-storage';
import { paymentsStorage } from './payments-storage';
import { databaseBackupStorage } from './database-backup-storage';
import { notificationsStorage } from './notifications-storage';
import { cloudStorageStorage } from './cloudStorage-storage';
import { paymentsReportsStorage } from './payments-reports-storage';



export const storage = {
  ...usersStorage,
  ...patientsStorage,
  ...appointmentsStorage,
  ...staffStorage,
  ...claimsStorage,
  ...insuranceCredsStorage,
  ...generalPdfStorage,
  ...paymentsStorage,
  ...databaseBackupStorage,
  ...notificationsStorage,
  ...cloudStorageStorage,
  ...paymentsReportsStorage,

};

export default storage;
