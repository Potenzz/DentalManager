import { forwardRef, useEffect, useRef, useState } from "react";
import { PatientTable } from "../patients/patient-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Patient } from "@repo/db/types";
import PaymentsRecentTable from "./payments-recent-table";

type Props = {
  initialPatient?: Patient | null;
  openInitially?: boolean;
  onClose?: () => void;
};

const PaymentsOfPatientModal = forwardRef<HTMLDivElement, Props>(
  ({ initialPatient = null, openInitially = false, onClose }: Props, ref) => {
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
      null
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paymentsPage, setPaymentsPage] = useState(1);

    // minimal, local scroll + cleanup — put inside PaymentsOfPatientModal
    useEffect(() => {
      if (!selectedPatient) return;

      const raf = requestAnimationFrame(() => {
        const card = document.getElementById("payments-for-patient-card");
        const main = document.querySelector("main"); // your app's scroll container
        if (card && main instanceof HTMLElement) {
          const parentRect = main.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const relativeTop = cardRect.top - parentRect.top + main.scrollTop;
          const offset = 8;
          main.scrollTo({
            top: Math.max(0, relativeTop - offset),
            behavior: "smooth",
          });
        }
      });

      // cleanup: when selectedPatient changes (ddmodal closes) or component unmounts,
      // reset the main scroll to top so other pages are not left scrolled.
      return () => {
        cancelAnimationFrame(raf);
        const main = document.querySelector("main");
        if (main instanceof HTMLElement) {
          // immediate reset (no animation) so navigation to other pages starts at top
          main.scrollTo({ top: 0, behavior: "auto" });
        }
      };
    }, [selectedPatient]);

    // when parent provides an initialPatient and openInitially flag, apply it
    useEffect(() => {
      if (initialPatient) {
        setSelectedPatient(initialPatient);
        setPaymentsPage(1);
      }

      if (openInitially) {
        setIsModalOpen(true);
      }
    }, [initialPatient, openInitially]);

    const handleSelectPatient = (patient: Patient | null) => {
      if (patient) {
        setSelectedPatient(patient);
        setPaymentsPage(1);
        setIsModalOpen(true);
      } else {
        setSelectedPatient(null);
        setIsModalOpen(false);
      }
    };

    return (
      <div className="space-y-8 py-8">
        {/* Payments Section */}
        {selectedPatient && (
          <Card id="payments-for-patient-card">
            <CardHeader>
              <CardTitle>
                Payments for {selectedPatient.firstName}{" "}
                {selectedPatient.lastName}
              </CardTitle>
              <CardDescription>
                Displaying recent payments for the selected patient.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentsRecentTable
                patientId={selectedPatient.id}
                allowEdit
                allowDelete
                onPageChange={setPaymentsPage}
              />
            </CardContent>
          </Card>
        )}

        {/* Patients Section */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>
              Select any patient and View all their recent payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientTable
              allowView
              allowCheckbox
              onSelectPatient={handleSelectPatient}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
);

export default PaymentsOfPatientModal;
